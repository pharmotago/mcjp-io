/**
 * BriskSchedules Upgraded Core Frontend Application Logic
 */

// Import database layer — sets window.BriskDB and initialises Firebase
import BriskDB from './database.js';
window.BriskDB = BriskDB;

// Application State
import BriskScheduler from './scheduler.js';

// Toast Notification System
window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>'}
    </div>
    <div class="toast-content">${message.replace(/\n/g, '<br>')}</div>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

let state = {
  currentTab: 'dashboard',
  currentWeekStart: null, // Date object (Monday)
  dailyDate: new Date(),  // Date object for Daily View
  employees: [],
  shifts: [],
  timecards: [],
  leaveRequests: [],
  settings: {},
  currentUser: null, // Stores session user
  roles: [],
  positions: [],
  copiedShift: null
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// On Page Load
document.addEventListener('DOMContentLoaded', async () => {
  // Check if this is a password recovery redirect
  const hash = window.location.hash;
  if (hash && hash.includes('type=recovery')) {
    document.getElementById('modal-update-password').classList.add('active');
  }

  // Set current week to this week
  state.currentWeekStart = getMondayOfCurrentWeek(new Date());
  
  // Check login state
  state.currentUser = BriskDB.getSession();
  
  if (!state.currentUser) {
    // Show login screen
    showLoginScreen();
    
    // Check for invitation code in URL parameter (e.g. ?invite=XXXX)
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite');
    if (inviteCode) {
      showRegisterCard();
      document.getElementById('reg-invite-code').value = inviteCode.toUpperCase();
    }
  } else {
    // Session exists, boot application
    await bootApplication();
  }

  // Setup Sidebar Tab Events
  document.querySelectorAll('.menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // Setup Week Pickers
  setupWeekPickers();
  
  // Initialize Clock in Header
  startLiveClock();

  // Listen for real-time Firebase changes with a light debounce (rendering throttle)
  let dbUpdateTimeout;
  window.addEventListener('brisk-db-updated', () => {
    clearTimeout(dbUpdateTimeout);
    dbUpdateTimeout = setTimeout(() => {
      loadDataFromState();
      renderActivePanel();
    }, 50);
  });

  // Form Validation UX limits
  document.getElementById('shift-start')?.addEventListener('change', function(e) {
    document.getElementById('shift-end').min = e.target.value;
  });
  document.getElementById('leave-start-date')?.addEventListener('change', function(e) {
    document.getElementById('leave-end-date').min = e.target.value;
  });

  // Modal accessibility & dismissal
  window.closeModal = function(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('closing');
    setTimeout(() => {
      modalEl.classList.remove('active');
      modalEl.classList.remove('closing');
    }, 200);
  };


  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => window.closeModal(m));
    }
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) window.closeModal(m);
    });
  });
});

// Boot the application: load data and apply role-based views
async function bootApplication() {
  try {
    // Show app layout, hide login
    document.getElementById('login-screen').classList.remove('active');

    // Set user badges
    document.getElementById('sidebar-user-name').textContent = state.currentUser.name;
    document.getElementById('dash-user-name').textContent = state.currentUser.name;

    // Sync data from cloud
    await BriskDB.syncFromServer();
    loadDataFromState();

    // Apply Role-Based Access Control (RBAC)
    applyRoleAccessControl();

    // Render active panel
    renderActivePanel();
  } catch (err) {
    console.error('Failed to sync from server on boot:', err);
    showToast('Syncing is taking longer than expected. Loading in background...', 'info');
  } finally {
    // Hide loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hide');
  }

  // Set the main layout mode (clear inline 'none' to allow CSS to control display via flex/grid)
  document.getElementById('app-root').style.display = '';
}

function loadDataFromState() {
  state.employees = BriskDB.getEmployees();
  state.shifts = BriskDB.getShifts();
  state.timecards = BriskDB.getTimecards();
  state.leaveRequests = BriskDB.getLeaveRequests();
  state.settings = BriskDB.getSettings();
  state.roles = BriskDB.getRoles();
  state.positions = BriskDB.getPositions();
  
  if (typeof renderRolesSettingsList === 'function') {
    renderRolesSettingsList();
  }
  if (typeof renderPositionsSettingsList === 'function') {
    renderPositionsSettingsList();
  }

  const sidebarName = document.getElementById('sidebar-company-name');
  if (sidebarName) sidebarName.textContent = state.settings.companyName || 'Amcal Pharmacy Woywoy Rosters';
  const settingsName = document.getElementById('settings-company-name');
  if (settingsName) settingsName.value = state.settings.companyName || 'Amcal Pharmacy Woywoy Rosters';

  if (state.currentUser && state.currentUser.role !== 'employee') {
    const pendingTimecards = state.timecards.filter(tc => !tc.approved).length;
    const badgeTc = document.getElementById('badge-timeclock');
    if (badgeTc) { badgeTc.style.display = pendingTimecards > 0 ? 'inline-block' : 'none'; badgeTc.textContent = pendingTimecards; }
    
    const pendingLeave = state.leaveRequests.filter(lr => lr.status === 'Pending').length;
    const badgeLeave = document.getElementById('badge-timeoff');
    if (badgeLeave) { badgeLeave.style.display = pendingLeave > 0 ? 'inline-block' : 'none'; badgeLeave.textContent = pendingLeave; }
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('theme-light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Initial theme load
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('theme-light');
}

// Role-Based UI visibility
function applyRoleAccessControl() {
  const role = state.currentUser.role;

  const menuEmployees = document.getElementById('menu-employees');
  const menuReports = document.getElementById('menu-reports');
  const menuSettings = document.getElementById('menu-settings');
  const schedulerControls = document.getElementById('scheduler-manager-controls');
  const quickActionsCard = document.getElementById('dash-quick-actions-card');
  const staffActionsCard = document.getElementById('dash-staff-actions-card');
  const clockTerminalDesc = document.getElementById('clock-terminal-description');
  const clockEmpSelect = document.getElementById('clock-emp-select');
  const adminPanel = document.getElementById('timeclock-admin-panel');
  const leaveSelectorGroup = document.getElementById('leave-employee-selector-group');

  if (role === 'employee') {
    // Hide manager menus, show staff actions
    if (menuEmployees) menuEmployees.classList.add('hide');
    if (menuReports) menuReports.classList.add('hide');
    if (menuSettings) menuSettings.classList.add('hide');
    if (schedulerControls) schedulerControls.classList.add('hide');
    if (quickActionsCard) quickActionsCard.classList.add('hide');
    if (staffActionsCard) staffActionsCard.classList.remove('hide');
    if (adminPanel) adminPanel.classList.add('hide');
    if (leaveSelectorGroup) leaveSelectorGroup.classList.add('hide');

    // Restrict clock actions only to self
    if (clockTerminalDesc) clockTerminalDesc.textContent = 'Register your clock stamps here.';
    if (clockEmpSelect) {
      clockEmpSelect.disabled = true;
    }
  } else {
    // Show manager menus, hide staff actions
    if (menuEmployees) menuEmployees.classList.remove('hide');
    if (menuReports) menuReports.classList.remove('hide');
    if (menuSettings) menuSettings.classList.remove('hide');
    if (schedulerControls) schedulerControls.classList.remove('hide');
    if (quickActionsCard) quickActionsCard.classList.remove('hide');
    if (staffActionsCard) staffActionsCard.classList.add('hide');
    if (adminPanel) adminPanel.classList.remove('hide');
    if (leaveSelectorGroup) leaveSelectorGroup.classList.remove('hide');
    
    if (clockTerminalDesc) clockTerminalDesc.textContent = 'Select your name to log clock stamps.';
    if (clockEmpSelect) {
      clockEmpSelect.disabled = false;
    }
  }
}

// Switch tabs routing
function switchTab(tabName) {
  state.currentTab = tabName;

  // Toggle active class and ARIA selected on menu buttons
  document.querySelectorAll('.menu-item').forEach(btn => {
    const isSelected = btn.getAttribute('data-tab') === tabName;
    btn.classList.toggle('active', isSelected);
    btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });

  // Toggle active class on mobile navigation items
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mobile-tab') === tabName);
  });

  // Toggle active class on panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });

  // Set Panel Title Header
  const titles = {
    dashboard: 'Dashboard',
    scheduler: 'Scheduler',
    daily: 'Daily View',
    employees: 'Employees',
    timeclock: 'Time Clock',
    timeoff: 'Time Off',
    reports: 'Reports & Payroll',
    settings: 'Data & Backup'
  };
  const titleEl = document.getElementById('current-panel-title');
  if (titleEl) titleEl.textContent = titles[tabName] || 'Dashboard';

  // Render active panel
  renderActivePanel();
  
  // Close sidebar on mobile after navigating
  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }
}

// Mobile Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('mobile-overlay');
  
  if (sidebar && overlay) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }
}
window.toggleSidebar = toggleSidebar;

// Render active panel based on routing state
function renderActivePanel() {
  loadDataFromState();

  switch (state.currentTab) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'scheduler':
      renderScheduler();
      break;
    case 'daily':
      renderDailyPanel();
      break;
    case 'employees':
      renderEmployeesList();
      break;
    case 'timeclock':
      renderTimeClockPanel();
      break;
    case 'timeoff':
      renderTimeOffPanel();
      break;
    case 'reports':
      renderReportsPanel();
      break;
    case 'settings':
      renderSettingsPanel(); // Let's also render settings inputs on load
      break;
  }
}

/* ==========================================================================
   AUTHENTICATION VIEW HANDLERS
   ========================================================================== */

function showLoginScreen() {
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('app-root').style.display = 'none';
  showLoginCard();
}

function showLoginCard() {
  document.getElementById('login-card').classList.remove('hide');
  document.getElementById('register-card').classList.add('hide');
}

function showRegisterCard() {
  document.getElementById('login-card').classList.add('hide');
  document.getElementById('register-card').classList.remove('hide');
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const res = await BriskDB.apiLogin(email, password);

  if (res.error) {
    showToast(res.error, 'error');
    return;
  }

  // apiLogin now returns the session object directly (Firebase Auth flow)
  if (res.email) {
    BriskDB.setSession(res);
    state.currentUser = res;
    document.getElementById('login-form').reset();
    await bootApplication();
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const inviteCode = document.getElementById('reg-invite-code').value;
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  const res = await BriskDB.apiRegister(email, password, name, inviteCode);

  if (res.error) {
    showToast(res.error, 'error');
    return;
  }

  showToast('Registration successful! Logging you in...', 'success');
  
  // Call apiLogin to get proper session data
  const loginRes = await BriskDB.apiLogin(email, password);
  if (loginRes.error) {
    showToast(loginRes.error, 'error');
    return;
  }
  
  state.currentUser = loginRes;

  document.getElementById('register-form').reset();
  document.getElementById('invite-code-group').classList.remove('hide'); // restore field
  await bootApplication();
}

function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    BriskDB.setSession(null);
    state.currentUser = null;
    showLoginScreen();
  }
}

// Manager generate invitation submit
async function handleInviteSubmit(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Generate Invite';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...'; }

  const email = document.getElementById('invite-email').value;
  const role = document.getElementById('invite-role').value;

  try {
    const res = await BriskDB.apiGenerateInvite(email, role);

    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    document.getElementById('invite-code-val').textContent = res.code;
    document.getElementById('invite-url-val').value = res.inviteUrl;
    document.getElementById('invite-result-box').classList.remove('hide');
    document.getElementById('invite-form').reset();
    showToast(`Invitation sent to ${email}!`, 'success');
  } catch (err) {
    showToast('Failed to generate invitation.', 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
  }
}

async function copyInviteUrl() {
  const code = document.getElementById('invite-code-val')?.textContent;
  if (!code || code === 'None') return;
  
  const url = document.getElementById('invite-url-val')?.value || `${window.location.origin}?invite=${code}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Invite link copied to clipboard!', 'success');
  } catch (err) {
    showToast('Failed to copy to clipboard.', 'error');
  }
}

/* ==========================================================================
   DATE HELPER FUNCTIONS
   ========================================================================== */

function getMondayOfCurrentWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.setDate(diff));
  mon.setHours(0,0,0,0);
  return mon;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getFormattedDateString(date) {
  const y = date.getFullYear();
  const m = MONTH_NAMES[date.getMonth()];
  const d = String(date.getDate()).padStart(2, '0');
  const dayName = DAY_NAMES[date.getDay()];
  return `${dayName}, ${d} ${m} ${y}`;
}

function getWeekRangeText(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d) => {
    return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  };
  return `${formatDate(monday)} - ${formatDate(sunday)}`;
}

let renderGeneration = 0;
async function checkHistoricalDataAndRender(renderCallback) {
  const currentGen = ++renderGeneration;
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  if (state.currentWeekStart < fourteenDaysAgo) {
    const endOfWeek = new Date(state.currentWeekStart);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    try {
      await BriskDB.fetchHistoricalWeek(formatDateISO(state.currentWeekStart), formatDateISO(endOfWeek));
    } catch (e) {
      console.error("Failed to lazy-load historical shifts", e);
    }
  }
  if (currentGen === renderGeneration) {
    renderCallback();
  }
}

function setupWeekPickers() {
  document.getElementById('btn-prev-week').addEventListener('click', async () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
    await checkHistoricalDataAndRender(renderScheduler);
  });
  document.getElementById('btn-next-week').addEventListener('click', async () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
    await checkHistoricalDataAndRender(renderScheduler);
  });

  document.getElementById('btn-report-prev-week').addEventListener('click', async () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
    await checkHistoricalDataAndRender(renderReportsPanel);
  });
  document.getElementById('btn-report-next-week').addEventListener('click', async () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
    await checkHistoricalDataAndRender(renderReportsPanel);
  });

  document.getElementById('btn-auto-schedule').addEventListener('click', triggerAutoScheduler);
  document.getElementById('btn-clear-week').addEventListener('click', triggerClearWeek);
}

function startLiveClock() {
  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');

  function tick() {
    const now = new Date();
    clockDate.textContent = getFormattedDateString(now);
    
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockTime.textContent = `${h}:${m}:${s}`;
    
    const mobileClock = document.getElementById('mobile-live-clock');
    if (mobileClock) {
      mobileClock.textContent = `${h}:${m}:${s}`;
    }
  }
  
  tick();
  setInterval(tick, 1000);
}


/* ==========================================================================
   PANEL: DASHBOARD
   ========================================================================== */

function renderDashboard() {
  const now = new Date();
  const todayStr = formatDateISO(now);
  // Always re-compute today's date on each render — never cache or hardcode
  document.getElementById('dash-today-date').textContent = todayStr;

  const activeEmployees = state.employees.filter(e => e.active);
  document.getElementById('dash-emp-count').textContent = activeEmployees.length;

  const mon = new Date(state.currentWeekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  mon.setHours(0,0,0,0);
  sun.setHours(23,59,59,999);

  const weekShifts = state.shifts.filter(s => {
    const sDate = new Date(s.date);
    sDate.setHours(0,0,0,0);
    return sDate >= mon && sDate <= sun;
  });
  document.getElementById('dash-shifts-count').textContent = weekShifts.length;

  const todayActiveClockins = state.timecards.filter(tc => {
    return tc.date === todayStr && tc.clockIn && !tc.clockOut;
  });
  document.getElementById('dash-active-clockins').textContent = todayActiveClockins.length;

  const pendingLeaves = state.leaveRequests.filter(r => r.status === 'Pending');
  document.getElementById('dash-pending-leaves').textContent = pendingLeaves.length;

  // Today's roster list (restricted based on role)
  let todayShifts = state.shifts.filter(s => s.date === todayStr);
  if (state.currentUser.role === 'employee') {
    // Employees can see everyone working today (team awareness)
  }

  // Fetch today's approved leave requests
  const todayLeaveRequests = state.leaveRequests.filter(r => {
    return r.status === 'approved' && todayStr >= r.startDate && todayStr <= r.endDate;
  });

  const tbody = document.getElementById('dash-today-shifts');
  tbody.innerHTML = '';

  if (todayShifts.length === 0 && todayLeaveRequests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding: 0;"><div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><h4>No shifts scheduled</h4><p>You have no shifts scheduled for today.</p></div></td></tr>`;
    return;
  }

  // Render active shifts
  todayShifts.forEach(shift => {
    const emp = state.employees.find(e => e.id === shift.employeeId);
    const empName = emp ? emp.name : '<span class="text-danger">Unassigned</span>';
    
    let statusBadge = '<span class="badge">Not Clocked In</span>';
    if (emp) {
      const tc = state.timecards.find(t => t.employeeId === emp.id && t.date === todayStr);
      if (tc) {
        if (tc.clockOut) {
          statusBadge = '<span class="badge badge-success">Finished</span>';
        } else if (tc.breaks && tc.breaks.length > 0 && tc.breaks[tc.breaks.length - 1].start && !tc.breaks[tc.breaks.length - 1].end) {
          statusBadge = '<span class="badge badge-warning">On Break</span>';
        } else if (tc.clockIn) {
          statusBadge = '<span class="badge badge-info">Working</span>';
        }
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${empName}</strong></td>
      <td>${shift.role}</td>
      <td>${shift.startTime} - ${shift.endTime}</td>
      <td>${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });

  // Render employees on leave today
  todayLeaveRequests.forEach(req => {
    const emp = state.employees.find(e => e.id === req.employeeId);
    if (!emp) return;
    
    const tr = document.createElement('tr');
    tr.style.opacity = '0.82';
    tr.innerHTML = `
      <td><strong>${emp.name}</strong></td>
      <td><span style="color:var(--text-muted); font-size:0.85rem;">Leave</span></td>
      <td><span style="font-size:0.85rem; color:var(--accent-gold);"><i class="fa-solid fa-umbrella-beach"></i> Vacation</span></td>
      <td><span class="badge" style="background:rgba(168, 85, 247, 0.12); color:#a855f7; border:1px solid rgba(168, 85, 247, 0.25);">On Leave</span></td>
    `;
    tbody.appendChild(tr);
  });
}


/* ==========================================================================
   PANEL: SCHEDULER
   ========================================================================== */

function renderScheduler() {
  document.getElementById('scheduler-week-range').textContent = getWeekRangeText(state.currentWeekStart);

  for (let i = 0; i < 7; i++) {
    const d = new Date(state.currentWeekStart);
    d.setDate(state.currentWeekStart.getDate() + i);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    const elId = `head-date-${d.getDay()}`;
    const headerEl = document.getElementById(elId);
    if (headerEl) {
      headerEl.textContent = `${dd}/${mm}`;
    }
  }

  const tbody = document.getElementById('scheduler-grid-body');
  tbody.innerHTML = '';

  const activeEmployees = state.employees.filter(e => e.active);

  const dispTotals = Array(7).fill(0);
  const frontTotals = Array(7).fill(0);
  const websterTotals = Array(7).fill(0);
  const grandTotals = Array(7).fill(0);

  // Accumulate hours for table cells during rendering or via preprocessing
  for (let i = 0; i < 7; i++) {
    const d = new Date(state.currentWeekStart);
    d.setDate(state.currentWeekStart.getDate() + i);
    const dateStr = formatDateISO(d);
    const dayShifts = state.shifts.filter(s => s.date === dateStr);
    
    dayShifts.forEach(s => {
      const hours = calculateShiftHours(s.startTime, s.endTime);
      const roleLower = s.role.toLowerCase();
      
      if (roleLower.includes('dispensary') || roleLower === 'pharmacist' || roleLower === 'pharmacist manager' || roleLower === 'dispense technician') {
        dispTotals[i] += hours;
      } else if (roleLower.includes('webster')) {
        websterTotals[i] += hours;
      } else {
        frontTotals[i] += hours;
      }
      grandTotals[i] += hours;
    });
  }

  // If user is employee, they see all staff rosters, but cannot click to add or edit
  activeEmployees.forEach(emp => {
    const tr = document.createElement('tr');
    
    const tdProfile = document.createElement('td');
    tdProfile.className = 'grid-employee-cell';
    
    const empWeekHours = calculateEmployeeWeekHours(emp.id, state.currentWeekStart);

    tdProfile.innerHTML = `
      <span class="grid-emp-name" ${state.currentUser.role !== 'employee' ? `onclick="openEditEmployeeModal('${emp.id}')" style="cursor:pointer; text-decoration: underline;"` : ''}>${emp.name}</span>
      <span class="grid-emp-role">${emp.role}</span>
      <span class="grid-emp-hours"><i class="fa-solid fa-clock"></i> ${empWeekHours.toFixed(1)}h / ${emp.maxHours}h</span>
    `;
    tr.appendChild(tdProfile);

    for (let i = 0; i < 7; i++) {
      const tdDay = document.createElement('td');
      tdDay.className = 'calendar-grid-cell';
      tdDay.setAttribute('data-employee-id', emp.id);
      
      const d = new Date(state.currentWeekStart);
      d.setDate(state.currentWeekStart.getDate() + i);
      const dateStr = formatDateISO(d);
      tdDay.setAttribute('data-date', dateStr);

      // Drag & Drop event handlers on target cell
      if (state.currentUser.role === 'owner' || state.currentUser.role === 'manager') {
        tdDay.addEventListener('dragover', (e) => {
          e.preventDefault();
          tdDay.classList.add('drag-hover');
        });
        tdDay.addEventListener('dragenter', (e) => {
          e.preventDefault();
          tdDay.classList.add('drag-hover');
        });
        tdDay.addEventListener('dragleave', () => {
          tdDay.classList.remove('drag-hover');
        });
        tdDay.addEventListener('drop', async (e) => {
          e.preventDefault();
          tdDay.classList.remove('drag-hover');
          const shiftId = e.dataTransfer.getData('text/plain');
          if (!shiftId) return;
          const shift = state.shifts.find(s => s.id === shiftId);
          if (!shift) return;

          const targetEmpId = tdDay.getAttribute('data-employee-id') || null;
          const targetDate = tdDay.getAttribute('data-date');

          if (e.altKey) {
            // Duplicate shift
            const duplicated = {
              employeeId: targetEmpId,
              role: shift.role,
              date: targetDate,
              startTime: shift.startTime,
              endTime: shift.endTime,
              notes: shift.notes
            };
            try {
              await BriskDB.addShift(duplicated);
              showToast('Shift duplicated successfully.', 'success');
              loadDataFromState();
              renderScheduler();
            } catch (err) {
              showToast('Failed to duplicate shift.', 'error');
            }
          } else {
            // Move shift
            if (targetEmpId) {
              const empShifts = state.shifts.filter(s => s.employeeId === targetEmpId && s.id !== shift.id);
              const hasOverlap = empShifts.some(s => BriskScheduler.isOverlapping(targetDate, shift.startTime, shift.endTime, s.date, s.startTime, s.endTime));
              if (hasOverlap) {
                showToast('Cannot move: shift overlaps with another shift for this employee.', 'error');
                return;
              }
            }
            try {
              shift.employeeId = targetEmpId;
              shift.date = targetDate;
              await BriskDB.updateShift(shift);
              showToast('Shift moved successfully.', 'success');
              loadDataFromState();
              renderScheduler();
            } catch (err) {
              showToast('Failed to move shift.', 'error');
            }
          }
        });
      }
      
      const cellShifts = state.shifts.filter(s => s.employeeId === emp.id && s.date === dateStr);
      cellShifts.forEach(shift => {
        const div = document.createElement('div');
        div.className = 'shift-card';
        if (state.currentUser.role === 'owner' || state.currentUser.role === 'manager') {
          div.draggable = true;
          div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', shift.id);
            div.classList.add('dragging');
          });
          div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
          });
        }

        // Color coding style
        const roleColor = state.roles.find(r => r.name.toLowerCase() === shift.role.toLowerCase())?.color || '#4f46e5';
        div.style.borderLeft = `4px solid ${roleColor}`;
        div.style.background = `rgba(${hexToRgb(roleColor)}, 0.08)`;

        div.innerHTML = `
          <div class="shift-card-header">${shift.role}</div>
          <div class="shift-card-time"><i class="fa-regular fa-clock"></i> ${shift.startTime} - ${shift.endTime}</div>
          ${shift.notes ? `<div class="shift-card-notes">${shift.notes}</div>` : ''}
        `;
        
        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex gap-2 align-center';

        if (state.currentUser.role === 'owner' || state.currentUser.role === 'manager') {
          const dupBtn = document.createElement('button');
          dupBtn.className = 'btn-icon';
          dupBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
          dupBtn.title = 'Copy Shift';
          dupBtn.onclick = (e) => {
            e.stopPropagation();
            state.copiedShift = { ...shift };
            showToast('Shift copied. Click "+" on any cell to paste!', 'success');
            updatePasteButtonState();
          };
          btnGroup.appendChild(dupBtn);

          const editBtn = document.createElement('button');
          editBtn.className = 'btn-icon';
          editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
          editBtn.onclick = (e) => { e.stopPropagation(); openEditShiftModal(shift); };
          btnGroup.appendChild(editBtn);
        }

        div.appendChild(btnGroup);
        tdDay.appendChild(div);
      });

      const isLeave = checkLeaveStatus(emp.id, dateStr);
      if (isLeave) {
        const leaveDiv = document.createElement('div');
        leaveDiv.className = 'badge badge-danger';
        leaveDiv.style.fontSize = '9px';
        leaveDiv.style.width = '100%';
        leaveDiv.style.textAlign = 'center';
        leaveDiv.style.marginTop = '4px';
        leaveDiv.textContent = '🏖️ On Leave';
        tdDay.appendChild(leaveDiv);
      } else if (state.currentUser.role !== 'employee') {
        const addBtn = document.createElement('div');
        addBtn.className = 'cell-add-btn';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.addEventListener('click', () => {
          openAddShiftModal(emp.id, dateStr);
        });
        tdDay.appendChild(addBtn);
      }

      tr.appendChild(tdDay);
    }
    tbody.appendChild(tr);
  });

  // Render Unassigned row (only managers see or manipulate this)
  if (state.currentUser.role !== 'employee') {
    const trUnassigned = document.createElement('tr');
    const tdUnassignedProfile = document.createElement('td');
    tdUnassignedProfile.className = 'grid-employee-cell';
    tdUnassignedProfile.style.background = 'rgba(231, 76, 60, 0.05)';
    tdUnassignedProfile.innerHTML = `
      <span class="grid-emp-name text-danger">⚠️ Unassigned Shifts</span>
      <span class="grid-emp-role">Awaiting placement</span>
    `;
    trUnassigned.appendChild(tdUnassignedProfile);

    for (let i = 0; i < 7; i++) {
      const tdDay = document.createElement('td');
      tdDay.className = 'calendar-grid-cell';
      tdDay.style.background = 'rgba(231, 76, 60, 0.02)';
      tdDay.setAttribute('data-employee-id', '');
      
      const d = new Date(state.currentWeekStart);
      d.setDate(state.currentWeekStart.getDate() + i);
      const dateStr = formatDateISO(d);
      tdDay.setAttribute('data-date', dateStr);

      if (state.currentUser.role === 'owner' || state.currentUser.role === 'manager') {
        tdDay.addEventListener('dragover', (e) => {
          e.preventDefault();
          tdDay.classList.add('drag-hover');
        });
        tdDay.addEventListener('dragenter', (e) => {
          e.preventDefault();
          tdDay.classList.add('drag-hover');
        });
        tdDay.addEventListener('dragleave', () => {
          tdDay.classList.remove('drag-hover');
        });
        tdDay.addEventListener('drop', async (e) => {
          e.preventDefault();
          tdDay.classList.remove('drag-hover');
          const shiftId = e.dataTransfer.getData('text/plain');
          if (!shiftId) return;
          const shift = state.shifts.find(s => s.id === shiftId);
          if (!shift) return;

          const targetDate = tdDay.getAttribute('data-date');

          if (e.altKey) {
            // Duplicate shift to unassigned
            const duplicated = {
              employeeId: null,
              role: shift.role,
              date: targetDate,
              startTime: shift.startTime,
              endTime: shift.endTime,
              notes: shift.notes
            };
            try {
              await BriskDB.addShift(duplicated);
              showToast('Shift duplicated to Unassigned.', 'success');
              loadDataFromState();
              renderScheduler();
            } catch (err) {
              showToast('Failed to duplicate shift.', 'error');
            }
          } else {
            // Move shift to unassigned
            try {
              shift.employeeId = null;
              shift.date = targetDate;
              await BriskDB.updateShift(shift);
              showToast('Shift unassigned.', 'success');
              loadDataFromState();
              renderScheduler();
            } catch (err) {
              showToast('Failed to unassign shift.', 'error');
            }
          }
        });
      }

      const cellShifts = state.shifts.filter(s => (s.employeeId === null || !state.employees.find(e => e.id === s.employeeId)?.active) && s.date === dateStr);
      cellShifts.forEach(shift => {
        const div = document.createElement('div');
        div.className = 'shift-card unassigned';
        if (state.currentUser.role === 'owner' || state.currentUser.role === 'manager') {
          div.draggable = true;
          div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', shift.id);
            div.classList.add('dragging');
          });
          div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
          });
        }

        // Color coding
        const roleColor = state.roles.find(r => r.name.toLowerCase() === shift.role.toLowerCase())?.color || '#ef4444';
        div.style.borderLeft = `4px solid ${roleColor}`;
        div.style.background = `rgba(${hexToRgb(roleColor)}, 0.08)`;

        div.innerHTML = `
          <div class="shift-card-header">${shift.role}</div>
          <div class="shift-card-time">${shift.startTime} - ${shift.endTime}</div>
          ${shift.notes ? `<div class="shift-card-notes">${shift.notes}</div>` : ''}
        `;

        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex gap-2 align-center';

        if (state.currentUser.role === 'owner' || state.currentUser.role === 'manager') {
          const dupBtn = document.createElement('button');
          dupBtn.className = 'btn-icon';
          dupBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
          dupBtn.title = 'Copy Shift';
          dupBtn.onclick = (e) => {
            e.stopPropagation();
            state.copiedShift = { ...shift };
            showToast('Shift copied. Click "+" on any cell to paste!', 'success');
            updatePasteButtonState();
          };
          btnGroup.appendChild(dupBtn);

          const editBtn = document.createElement('button');
          editBtn.className = 'btn-icon';
          editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
          editBtn.onclick = (e) => { e.stopPropagation(); openEditShiftModal(shift); };
          btnGroup.appendChild(editBtn);
        }
        div.appendChild(btnGroup);
        tdDay.appendChild(div);
      });

      const addBtn = document.createElement('div');
      addBtn.className = 'cell-add-btn';
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      addBtn.addEventListener('click', () => {
        openAddShiftModal('', dateStr);
      });
      tdDay.appendChild(addBtn);

      trUnassigned.appendChild(tdDay);
    }
    tbody.appendChild(trUnassigned);
  }

  const tfoot = document.getElementById('scheduler-grid-foot');
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="summary-row">
        <td>Dispensary Hours</td>
        ${dispTotals.map(h => `<td>${h > 0 ? h.toFixed(1) + 'h' : '-'}</td>`).join('')}
      </tr>
      <tr class="summary-row">
        <td>Front of Shop Hours</td>
        ${frontTotals.map(h => `<td>${h > 0 ? h.toFixed(1) + 'h' : '-'}</td>`).join('')}
      </tr>
      <tr class="summary-row">
        <td>Webster Hours</td>
        ${websterTotals.map(h => `<td>${h > 0 ? h.toFixed(1) + 'h' : '-'}</td>`).join('')}
      </tr>
      <tr class="summary-row grand-total">
        <td>Total Scheduled Hours</td>
        ${grandTotals.map(h => `<td>${h > 0 ? h.toFixed(1) + 'h' : '-'}</td>`).join('')}
      </tr>
    `;
  }

  // --- MOBILE TIMELINE RENDERING ---
  const mobileContainer = document.getElementById('scheduler-mobile-view');
  if (mobileContainer) {
    mobileContainer.innerHTML = '';
    const DAY_LONG_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(state.currentWeekStart);
      d.setDate(state.currentWeekStart.getDate() + i);
      const dateStr = formatDateISO(d);
      const dayName = DAY_LONG_NAMES[d.getDay()];
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');

      const dayCard = document.createElement('div');
      dayCard.className = 'mobile-day-card';

      let shiftsHtml = '';
      
      // 1. Regular Shifts for active employees
      const dayShifts = state.shifts.filter(s => s.date === dateStr && s.employeeId !== null);
      dayShifts.forEach(shift => {
        const emp = state.employees.find(e => e.id === shift.employeeId);
        if (!emp || !emp.active) return;

        const roleColor = state.roles.find(r => r.name.toLowerCase() === shift.role.toLowerCase())?.color || '#4f46e5';
        shiftsHtml += `
          <div class="mobile-shift-item" style="border-left: 4px solid ${roleColor}; background: rgba(${hexToRgb(roleColor)}, 0.04);">
            <div class="mobile-shift-header">
              <span class="mobile-shift-staff">${emp.name}</span>
              <span class="mobile-shift-role">${shift.role}</span>
            </div>
            <div class="mobile-shift-time">
              <i class="fa-regular fa-clock"></i> ${shift.startTime} - ${shift.endTime}
            </div>
            ${shift.notes ? `<div class="mobile-shift-notes">${shift.notes}</div>` : ''}
            ${state.currentUser.role !== 'employee' ? `
              <div class="mobile-shift-actions">
                <button class="btn btn-outline" style="padding: 2px 8px; font-size: 11px;" onclick="openEditShiftModalById('${shift.id}')">
                  <i class="fa-solid fa-pen"></i> Edit
                </button>
              </div>
            ` : ''}
          </div>
        `;
      });

      // 2. Unassigned Shifts (Only visible to manager/owner)
      if (state.currentUser.role !== 'employee') {
        const unassignedShifts = state.shifts.filter(s => s.date === dateStr && (s.employeeId === null || !state.employees.find(e => e.id === s.employeeId)?.active));
        unassignedShifts.forEach(shift => {
          const roleColor = state.roles.find(r => r.name.toLowerCase() === shift.role.toLowerCase())?.color || '#ef4444';
          shiftsHtml += `
            <div class="mobile-shift-item unassigned" style="border-left: 4px solid ${roleColor}; background: rgba(${hexToRgb(roleColor)}, 0.04);">
              <div class="mobile-shift-header">
                <span class="mobile-shift-staff text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Unassigned Shift</span>
                <span class="mobile-shift-role">${shift.role}</span>
              </div>
              <div class="mobile-shift-time">
                <i class="fa-regular fa-clock"></i> ${shift.startTime} - ${shift.endTime}
              </div>
              ${shift.notes ? `<div class="mobile-shift-notes">${shift.notes}</div>` : ''}
              <div class="mobile-shift-actions">
                <button class="btn btn-primary" style="padding: 2px 8px; font-size: 11px;" onclick="openEditShiftModalById('${shift.id}')">
                  <i class="fa-solid fa-user-plus"></i> Assign
                </button>
              </div>
            </div>
          `;
        });
      }

      // 3. On Leave Badges
      let leaveHtml = '';
      state.employees.forEach(emp => {
        if (!emp.active) return;
        const isLeave = checkLeaveStatus(emp.id, dateStr);
        if (isLeave) {
          leaveHtml += `
            <div class="badge" style="margin-top: 6px; display: inline-block; font-size: 10px; padding: 4px 8px; background: rgba(168, 85, 247, 0.12); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 4px; font-weight: 500;">
              🌴 ${emp.name} (On Leave)
            </div>
          `;
        }
      });

      if (!shiftsHtml && !leaveHtml) {
        shiftsHtml = `<div class="text-muted" style="font-size: 0.9rem; text-align: center; padding: 0.5rem 0;">No shifts scheduled</div>`;
      }

      // Add Day Action button (Add Shift) for Managers
      let addBtnHtml = '';
      if (state.currentUser.role !== 'employee') {
        addBtnHtml = `
          <button class="btn btn-outline" style="width: 100%; margin-top: 8px; padding: 6px; font-size: 12px;" onclick="openAddShiftModal('', '${dateStr}')">
            <i class="fa-solid fa-plus"></i> Add Shift for ${dayName}
          </button>
        `;
      }

      let dispHours = 0;
      let frontHours = 0;
      let websterHours = 0;
      
      const dayAllShifts = state.shifts.filter(s => s.date === dateStr);
      dayAllShifts.forEach(s => {
        const hours = calculateShiftHours(s.startTime, s.endTime);
        const roleLower = s.role.toLowerCase();
        
        if (roleLower.includes('dispensary') || roleLower === 'pharmacist' || roleLower === 'pharmacist manager' || roleLower === 'dispense technician') {
          dispHours += hours;
        } else if (roleLower.includes('webster')) {
          websterHours += hours;
        } else {
          frontHours += hours;
        }
      });
      const totalHoursForDay = dispHours + frontHours + websterHours;
      let hoursSummaryHtml = '';
      if (totalHoursForDay > 0) {
        hoursSummaryHtml = `
          <div class="mobile-day-summary" style="margin-top: 12px; padding: 10px; border-top: 1px solid var(--border-color); font-size: 0.8rem; display: flex; flex-wrap: wrap; gap: 8px; background: rgba(255,255,255,0.01); border-radius: var(--radius-sm);">
            <div style="flex: 1 1 40%;">Disp: <strong style="color: #10b981;">${dispHours.toFixed(1)}h</strong></div>
            <div style="flex: 1 1 40%;">Front: <strong style="color: #f59e0b;">${frontHours.toFixed(1)}h</strong></div>
            <div style="flex: 1 1 40%;">Webster: <strong style="color: #a855f7;">${websterHours.toFixed(1)}h</strong></div>
            <div style="flex: 1 1 40%;">Total: <strong style="color: var(--accent-cyan); font-weight: 700;">${totalHoursForDay.toFixed(1)}h</strong></div>
          </div>
        `;
      }

      dayCard.innerHTML = `
        <div class="mobile-day-header">
          <span class="mobile-day-name">${dayName}</span>
          <span class="mobile-day-date">${dd}/${mm}</span>
        </div>
        <div class="mobile-shift-list">
          ${shiftsHtml}
          ${leaveHtml}
        </div>
        ${hoursSummaryHtml}
        ${addBtnHtml}
      `;
      mobileContainer.appendChild(dayCard);
    }
  }
}

window.openEditShiftModalById = function(id) {
  const shift = state.shifts.find(s => s.id === id);
  if (shift) openEditShiftModal(shift);
};

function calculateEmployeeWeekHours(employeeId, weekStart) {
  const mon = new Date(weekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  mon.setHours(0,0,0,0);
  sun.setHours(23,59,59,999);
  
  const today = new Date();
  today.setHours(0,0,0,0);

  let total = 0;
  // Track dates we have timecards for
  const daysWithTimecards = new Set();

  // 1. Actual hours from timecards (for past days)
  const empTimecards = state.timecards.filter(tc => {
    if (tc.employeeId !== employeeId) return false;
    const tcDate = new Date(tc.date);
    tcDate.setHours(0,0,0,0);
    return tcDate >= mon && tcDate <= sun && tcDate < today;
  });
  
  empTimecards.forEach(tc => {
    if (tc.totalHours) {
      total += tc.totalHours;
      daysWithTimecards.add(tc.date);
    }
  });

  // 2. Scheduled hours from shifts (for today, future days, OR past days with no timecard)
  const empShifts = state.shifts.filter(s => {
    if (s.employeeId !== employeeId) return false;
    const sDate = new Date(s.date);
    sDate.setHours(0,0,0,0);
    return sDate >= mon && sDate <= sun;
  });
  
  empShifts.forEach(s => {
    const sDate = new Date(s.date);
    sDate.setHours(0,0,0,0);
    if (sDate >= today || !daysWithTimecards.has(s.date)) {
      total += BriskScheduler.getShiftDuration(s.startTime, s.endTime);
    }
  });

  return total;
}

function checkLeaveStatus(employeeId, dateStr) {
  const date = new Date(dateStr);
  date.setHours(0,0,0,0);

  return state.leaveRequests.some(req => {
    if (req.employeeId !== employeeId || req.status !== 'Approved') return false;
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    return date >= start && date <= end;
  });
}

async function triggerClearWeek() {
  if (!confirm('Are you sure you want to unassign all employee shifts for this week?')) return;

  const mon = new Date(state.currentWeekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  mon.setHours(0,0,0,0);
  sun.setHours(23,59,59,999);

  const weekShifts = state.shifts.filter(s => {
    const sDate = new Date(s.date);
    sDate.setHours(0,0,0,0);
    return sDate >= mon && sDate <= sun;
  });

  // Update each shift using batch operation
  try {
    const updatedShifts = weekShifts.map(s => ({ ...s, employeeId: null }));
    await BriskDB.batchUpdateShifts(updatedShifts);
    renderScheduler();
  } catch (err) {
    console.error('Clear Week Error:', err);
    showToast('Failed to clear week shifts. Please try again.', 'error');
  }
}

async function triggerAutoScheduler() {
  const targetWeekStr = formatDateISO(state.currentWeekStart);
  const clonedShifts = structuredClone(state.shifts);
  const result = BriskScheduler.run(clonedShifts, state.employees, state.leaveRequests, targetWeekStr, state.timecards, true);
  
  if (result.success) {
    // Save generated shifts to Firestore for target week only
    const targetWeekStart = new Date(targetWeekStr);
    const targetWeekEnd = new Date(targetWeekStart);
    targetWeekEnd.setDate(targetWeekStart.getDate() + 6);
    targetWeekStart.setHours(0,0,0,0);
    targetWeekEnd.setHours(23,59,59,999);

    const weekShifts = result.shifts.filter(s => {
      const sDate = new Date(s.date);
      sDate.setHours(0,0,0,0);
      return sDate >= targetWeekStart && sDate <= targetWeekEnd;
    });

    try {
      await BriskDB.batchUpdateShifts(weekShifts);
      state.shifts = result.shifts;
      renderScheduler();
      
      showToast(`📅 Auto-Scheduler Complete!\n\n- Shifts successfully assigned: ${result.assignedCount}\n- Shifts left unassigned: ${result.unassignedCount}\n\n[Placement Logs]\n${result.logs.slice(0, 10).join('\n')}\n${result.logs.length > 10 ? '...and more' : ''}`, 'success');
    } catch (err) {
      console.error('Auto-Scheduler Save Error:', err);
      showToast('Auto-Scheduler calculated the schedule, but failed to save to the database. Please try again.', 'error');
    }
  } else {
    showToast(result.message, 'success');
  }
}

/* ==========================================================================
   MODAL: SHIFT ADD/EDIT FORM
   ========================================================================== */

function openAddShiftModal(employeeId = '', dateStr = '') {
  document.getElementById('shift-modal-title').textContent = 'Add New Shift';
  document.getElementById('shift-id').value = '';
  document.getElementById('shift-notes').value = '';
  document.getElementById('btn-delete-shift').classList.add('hide');

  document.getElementById('shift-date').value = dateStr || formatDateISO(new Date());
  document.getElementById('shift-start').value = '09:00';
  document.getElementById('shift-end').value = '17:00';

  // Populate Roles select
  const roleSelect = document.getElementById('shift-role');
  roleSelect.innerHTML = '<option value="">-- Select Roster Role --</option>';
  state.roles.forEach(role => {
    const opt = document.createElement('option');
    opt.value = role.name;
    opt.textContent = role.name;
    roleSelect.appendChild(opt);
  });

  // Pre-select role if employee has default role
  if (employeeId) {
    const emp = state.employees.find(e => e.id === employeeId);
    if (emp && emp.role) {
      roleSelect.value = emp.role;
    }
  }

  const select = document.getElementById('shift-employee');
  select.innerHTML = '<option value="">-- Unassigned --</option>';
  
  state.employees.filter(e => e.active).forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `${emp.name} (${emp.role})`;
    if (emp.id === employeeId) opt.selected = true;
    select.appendChild(opt);
  });

  updatePasteButtonState();

  document.getElementById('modal-shift').classList.add('active');
}

function openEditShiftModal(shift) {
  document.getElementById('shift-modal-title').textContent = 'Edit Shift';
  document.getElementById('shift-id').value = shift.id;
  document.getElementById('shift-date').value = shift.date;
  document.getElementById('shift-start').value = shift.startTime;
  document.getElementById('shift-end').value = shift.endTime;
  document.getElementById('shift-notes').value = shift.notes || '';
  
  document.getElementById('btn-delete-shift').classList.remove('hide');

  // Populate Roles select
  const roleSelect = document.getElementById('shift-role');
  roleSelect.innerHTML = '<option value="">-- Select Roster Role --</option>';
  state.roles.forEach(role => {
    const opt = document.createElement('option');
    opt.value = role.name;
    opt.textContent = role.name;
    roleSelect.appendChild(opt);
  });
  roleSelect.value = shift.role;

  const select = document.getElementById('shift-employee');
  select.innerHTML = '<option value="">-- Unassigned --</option>';
  
  state.employees.filter(e => e.active).forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `${emp.name} (${emp.role})`;
    if (emp.id === shift.employeeId) opt.selected = true;
    select.appendChild(opt);
  });

  updatePasteButtonState();

  document.getElementById('modal-shift').classList.add('active');
}

function closeShiftModal() {
  window.closeModal(document.getElementById('modal-shift'));
  renderScheduler();
}

async function handleShiftSubmit(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Save Shift';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

  try {
    const id = document.getElementById('shift-id').value;
    const empId = document.getElementById('shift-employee').value || null;
    const role = document.getElementById('shift-role').value;
    const date = document.getElementById('shift-date').value;
    const start = document.getElementById('shift-start').value;
    const end = document.getElementById('shift-end').value;
    const notes = document.getElementById('shift-notes').value;

    if (empId) {
      // Strict Overlap validation only if assigned
      const empShifts = state.shifts.filter(s => s.employeeId === empId && s.id !== id);
      const hasOverlap = empShifts.some(s => BriskScheduler.isOverlapping(date, start, end, s.date, s.startTime, s.endTime));
      if (hasOverlap) {
        showToast('This shift overlaps with another shift for this employee.', 'error');
        return;
      }
    }

    if (empId && checkLeaveStatus(empId, date)) {
      if (!confirm('This employee has an approved leave request on this date. Force schedule this shift anyway?')) {
        return;
      }
    }

    // Trading Hours Validation
    if (state.settings && state.settings.tradingHours) {
      const shiftDateObj = new Date(date);
      const dayOfWeek = shiftDateObj.getDay();
      const tradingHours = state.settings.tradingHours[String(dayOfWeek)];
      
      if (tradingHours) {
        if (tradingHours.closed) {
          if (!confirm(`Warning: The pharmacy is marked as CLOSED on this day (${shiftDateObj.toLocaleDateString('en-AU', { weekday: 'long' })}). Do you want to schedule this shift anyway?`)) {
            return;
          }
        } else {
          const shiftStartDec = timeToDecimal(start);
          const shiftEndDec = timeToDecimal(end);
          const tradingOpenDec = timeToDecimal(tradingHours.open);
          const tradingCloseDec = timeToDecimal(tradingHours.close);
          
          if (shiftStartDec < tradingOpenDec || shiftEndDec > tradingCloseDec) {
            if (!confirm(`Warning: Shift hours (${start} - ${end}) fall outside the pharmacy trading hours (${tradingHours.open} - ${tradingHours.close}) on this day. Do you want to schedule this shift anyway?`)) {
              return;
            }
          }
        }
      }
    }

    if (empId) {
      const emp = state.employees.find(e => e.id === empId);
      const duration = BriskScheduler.getShiftDuration(start, end);
      const currentWeekHours = calculateEmployeeWeekHours(empId, getMondayOfCurrentWeek(new Date(date)));
      
      let prevDuration = 0;
      if (id) {
        const prevShift = state.shifts.find(s => s.id === id);
        if (prevShift && prevShift.employeeId === empId) {
          prevDuration = BriskScheduler.getShiftDuration(prevShift.startTime, prevShift.endTime);
        }
      }

      if (currentWeekHours - prevDuration + duration > emp.maxHours) {
        if (!confirm(`Adding this shift will exceed ${emp.name}'s weekly limit of ${emp.maxHours} hours. Continue?`)) {
          return;
        }
      }
    }

    const shiftData = {
      employeeId: empId,
      role: role,
      date: date,
      startTime: start,
      endTime: end,
      notes: notes
    };

    if (id) {
      shiftData.id = id;
      await BriskDB.updateShift(shiftData);
      showToast('Shift updated successfully.', 'success');
    } else {
      await BriskDB.addShift(shiftData);
      showToast('Shift added successfully.', 'success');
    }
    closeShiftModal();
    loadDataFromState();
  } catch (err) {
    console.error('Save Shift Error:', err);
    showToast(err.message || 'Failed to save shift.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}

async function handleShiftDelete() {
  const id = document.getElementById('shift-id').value;
  if (id && confirm('Delete this shift permanently?')) {
    try {
      await BriskDB.deleteShift(id);
      closeShiftModal();
      renderActivePanel();
    } catch (error) {
      console.error('Failed to delete shift:', error);
      showToast('Failed to delete shift: ' + error.message, 'error');
    }
  }
}


/* ==========================================================================
   PANEL: EMPLOYEES DIRECTORY
   ========================================================================== */

function renderEmployeesList() {
  const container = document.getElementById('employees-cards-container');
  container.innerHTML = '';

  const searchVal = document.getElementById('employee-search-input').value.toLowerCase();
  
  const filtered = state.employees.filter(emp => {
    if (!emp.active) return false;
    return emp.name.toLowerCase().includes(searchVal) || 
           emp.role.toLowerCase().includes(searchVal);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1;"><div class="empty-state"><i class="fa-solid fa-users-slash"></i><h4>No employees found</h4><p>Add a team member to start building your roster.</p></div></div>`;
    return;
  }

  filtered.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'employee-card';

    let availBubbles = '';
    const dayInitialList = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 0; i < 7; i++) {
      const hasAvail = emp.availability[i] != null;
      availBubbles += `<div class="avail-day-bubble ${hasAvail ? 'active' : ''}">${dayInitialList[i]}</div>`;
    }

    card.innerHTML = `
      <div class="employee-card-header">
        <div class="emp-details">
          <h4>${emp.name}</h4>
          <p>${emp.role}</p>
        </div>
        <span class="badge badge-success">Active</span>
      </div>
      <div class="employee-card-meta">
        <span>Email: <strong>${emp.email}</strong></span>
        <span>Limit: <strong>Max ${emp.maxHours}h / week</strong></span>
      </div>
      <div class="employee-card-avail">
        <span>Work Availability:</span>
        <div class="avail-list">
          ${availBubbles}
        </div>
      </div>
      <div class="employee-card-actions">
        <button class="btn btn-outline btn-block" onclick="openEditEmployeeModal('${emp.id}')">
          <i class="fa-solid fa-user-pen"></i> Edit Profile
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderAvailabilityFormInputs(availability = {}) {
  const container = document.querySelector('.availability-inputs-grid');
  container.innerHTML = '';
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (let i = 0; i < 7; i++) {
    const current = availability[i] || null;
    const isChecked = current !== null;
    const startTime = current ? current.start : '09:00';
    const endTime = current ? current.end : '17:00';

    const row = document.createElement('div');
    row.className = 'avail-input-row';
    row.innerHTML = `
      <div class="avail-inputs-row-meta">
        <input type="checkbox" id="avail-check-${i}" ${isChecked ? 'checked' : ''} onchange="toggleAvailTimeInputs(${i})">
        <label for="avail-check-${i}" class="avail-input-label" style="cursor:pointer; margin-left: 6px;">${dayNames[i]}</label>
      </div>
      <div class="avail-inputs-row-times ${isChecked ? '' : 'hide'}" id="avail-times-container-${i}">
        <input type="time" id="avail-start-${i}" class="form-control" value="${startTime}">
        <span>~</span>
        <input type="time" id="avail-end-${i}" class="form-control" value="${endTime}">
      </div>
    `;
    container.appendChild(row);
  }
}

function toggleAvailTimeInputs(dayIdx) {
  const isChecked = document.getElementById(`avail-check-${dayIdx}`).checked;
  const container = document.getElementById(`avail-times-container-${dayIdx}`);
  if (isChecked) {
    container.classList.remove('hide');
  } else {
    container.classList.add('hide');
  }
}


/* ==========================================================================
   MODAL: EMPLOYEE ADD/EDIT FORM
   ========================================================================== */

function openAddEmployeeModal() {
  document.getElementById('employee-modal-title').textContent = 'Register New Employee';
  document.getElementById('employee-id').value = '';
  document.getElementById('emp-name').value = '';
  document.getElementById('emp-email').value = '';
  document.getElementById('emp-rate').value = '';
  document.getElementById('emp-max-hours').value = '38';
  document.getElementById('btn-delete-employee').classList.add('hide');

  const roleSelect = document.getElementById('emp-role');
  roleSelect.innerHTML = '<option value="">-- Select Default Position --</option>';
  state.positions.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos.name;
    opt.textContent = pos.name;
    roleSelect.appendChild(opt);
  });

  const defaultAvail = {
    0: null,
    1: { start: '09:00', end: '17:00' },
    2: { start: '09:00', end: '17:00' },
    3: { start: '09:00', end: '17:00' },
    4: { start: '09:00', end: '17:00' },
    5: { start: '09:00', end: '17:00' },
    6: null
  };
  renderAvailabilityFormInputs(defaultAvail);

  document.getElementById('modal-employee').classList.add('active');
}

function openEditEmployeeModal(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  document.getElementById('employee-modal-title').textContent = 'Edit Employee Profile';
  document.getElementById('employee-id').value = emp.id;
  document.getElementById('emp-name').value = emp.name;
  document.getElementById('emp-email').value = emp.email;
  document.getElementById('emp-rate').value = emp.hourlyRate;
  document.getElementById('emp-max-hours').value = emp.maxHours;
  
  const roleSelect = document.getElementById('emp-role');
  roleSelect.innerHTML = '<option value="">-- Select Default Position --</option>';
  state.positions.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos.name;
    opt.textContent = pos.name;
    roleSelect.appendChild(opt);
  });
  roleSelect.value = emp.role;

  if (emp.id === state.currentUser.employeeId) {
    document.getElementById('btn-delete-employee').classList.add('hide'); 
  } else {
    document.getElementById('btn-delete-employee').classList.remove('hide');
  }

  renderAvailabilityFormInputs(emp.availability);

  document.getElementById('modal-employee').classList.add('active');
}

function closeEmployeeModal() {
  window.closeModal(document.getElementById('modal-employee'));
  renderEmployeesList();
}

async function handleEmployeeSubmit(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Save Employee';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

  const id = document.getElementById('employee-id').value;
  const name = document.getElementById('emp-name').value;
  const role = document.getElementById('emp-role').value;
  const email = document.getElementById('emp-email').value;
  const hourlyRate = parseFloat(document.getElementById('emp-rate').value);
  const maxHours = parseInt(document.getElementById('emp-max-hours').value);

  const availability = {};
  for (let i = 0; i < 7; i++) {
    const isChecked = document.getElementById(`avail-check-${i}`).checked;
    if (isChecked) {
      const start = document.getElementById(`avail-start-${i}`).value;
      const end = document.getElementById(`avail-end-${i}`).value;
      
      if (start >= end) {
        showToast(`Availability times for ${DAY_NAMES[i]} are invalid.`, 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
        return;
      }
      availability[i] = { start: start, end: end };
    } else {
      availability[i] = null;
    }
  }

  const employeeData = {
    name: name,
    role: role,
    email: email,
    hourlyRate: hourlyRate,
    maxHours: maxHours,
    availability: availability
  };

  try {
    if (id) {
      employeeData.id = id;
      await BriskDB.updateEmployee(employeeData);
      showToast('Employee updated successfully.', 'success');
    } else {
      await BriskDB.addEmployee(employeeData);
      showToast('Employee added successfully.', 'success');
    }
    closeEmployeeModal();
    loadDataFromState();
  } catch (err) {
    showToast('Failed to save employee.', 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
  }
}

async function handleEmployeeDelete() {
  const id = document.getElementById('employee-id').value;
  if (id && confirm('Delete this employee permanently? Future shifts will be unassigned.')) {
    try {
      const todayStr = formatDateISO(new Date());
      // Only unassign future shifts to prevent Firestore 500-batch limit crash and preserve history
      const empShifts = state.shifts.filter(s => s.employeeId === id && s.date >= todayStr).map(s => ({ ...s, employeeId: null }));
      await BriskDB.batchUpdateShifts(empShifts);
      await BriskDB.deleteEmployee(id);
      closeEmployeeModal();
      renderActivePanel();
    } catch (error) {
      console.error('Failed to delete employee:', error);
      showToast('Failed to delete employee: ' + error.message, 'error');
    }
  }
}


/* ==========================================================================
   PANEL: TIME CLOCK (출퇴근기록)
   ========================================================================== */

function renderTimeClockPanel() {
  const select = document.getElementById('clock-emp-select');
  select.innerHTML = '';
  
  const role = state.currentUser.role;
  
  if (role === 'employee') {
    if (!state.currentUser.employeeId) {
      select.innerHTML = '<option>Profile not found</option>';
      return;
    }
    // Only add self
    const opt = document.createElement('option');
    opt.value = state.currentUser.employeeId;
    opt.textContent = state.currentUser.name;
    opt.selected = true;
    select.appendChild(opt);
  } else {
    // Add all active employees
    state.employees.filter(e => e.active).forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = `${emp.name} (${emp.role})`;
      if (emp.id === state.currentUser.employeeId) opt.selected = true;
      select.appendChild(opt);
    });
  }



  updateTerminalStatus();
  renderAdminTimesheets();
}

function updateTerminalStatus() {
  const empId = document.getElementById('clock-emp-select').value;
  if (!empId) return;

  const todayStr = formatDateISO(new Date());
  
  // Fetch timecards for employee
  const empTcs = state.timecards.filter(t => t.employeeId === empId);
  empTcs.sort((a, b) => new Date(b.clockIn || b.date) - new Date(a.clockIn || a.date));
  
  // Find the most recent active (no clockOut) or today's timecard
  let tc = empTcs.find(t => !t.clockOut) || empTcs.find(t => t.date === todayStr);

  const dot = document.getElementById('terminal-status-dot');
  const txt = document.getElementById('terminal-status-text');
  const sub = document.getElementById('terminal-sub-status');

  const btnIn = document.getElementById('btn-clock-in');
  const btnOut = document.getElementById('btn-clock-out');
  const btnBStart = document.getElementById('btn-start-break');
  const btnBEnd = document.getElementById('btn-end-break');

  btnIn.disabled = false;
  btnOut.disabled = false;
  btnBStart.disabled = false;
  btnBEnd.disabled = false;

  if (!tc) {
    dot.className = 'status-indicator status-offline';
    txt.textContent = 'Not Clocked In';
    sub.textContent = 'No stamps recorded today.';

    btnOut.disabled = true;
    btnBStart.disabled = true;
    btnBEnd.disabled = true;
  } else {
    const formatTime = (isoStr) => {
      const d = new Date(isoStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    if (tc.clockOut) {
      dot.className = 'status-indicator status-offline';
      txt.textContent = 'Clocked Out';
      sub.textContent = `Completed today (In: ${formatTime(tc.clockIn)} ~ Out: ${formatTime(tc.clockOut)})`;

      btnIn.disabled = true;
      btnOut.disabled = true;
      btnBStart.disabled = true;
      btnBEnd.disabled = true;
    } else {
      const lastBreak = tc.breaks && tc.breaks.length > 0 ? tc.breaks[tc.breaks.length - 1] : null;
      const onBreak = lastBreak && lastBreak.start && !lastBreak.end;

      if (onBreak) {
        dot.className = 'status-indicator status-break';
        txt.textContent = 'On Break';
        sub.textContent = `Break began at: ${formatTime(lastBreak.start)}`;

        btnIn.disabled = true;
        btnOut.disabled = true;
        btnBStart.disabled = true;
      } else {
        dot.className = 'status-indicator status-online';
        txt.textContent = 'Working (Clocked In)';
        sub.textContent = `Clocked in at: ${formatTime(tc.clockIn)}`;

        btnIn.disabled = true;
        btnBEnd.disabled = true;
      }
    }
  }
}

async function handleClockAction(action) {
  const empId = document.getElementById('clock-emp-select').value;
  if (!empId) return;

  // Disable all clock buttons immediately to prevent double-tap
  const btns = ['btn-clock-in','btn-clock-out','btn-start-break','btn-end-break'];
  btns.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });

  const todayStr = formatDateISO(new Date());
  const nowISO = new Date().toISOString();

  // Fetch timecards for employee
  const empTcs = BriskDB.getTimecards().filter(t => t.employeeId === empId);
  empTcs.sort((a, b) => new Date(b.clockIn || b.date) - new Date(a.clockIn || a.date));
  
  // Find the most recent active timecard (no clockOut)
  let tc = empTcs.find(t => !t.clockOut);

  // Auto-clock-out failsafe (cap at 14 hours) for abandoned timecards before starting a new action
  if (tc && !tc.clockOut) {
    const elapsedMs = new Date(nowISO).getTime() - new Date(tc.clockIn).getTime();
    if (elapsedMs > 14 * 60 * 60 * 1000) {
      // Auto-close it
      tc.clockOut = new Date(new Date(tc.clockIn).getTime() + 14 * 60 * 60 * 1000).toISOString();
      tc.totalHours = calculateTimecardHours(tc);
      await BriskDB.updateTimecard(tc);
      tc = null; // Reset to null so they can clock in again
    }
  }


  try {
    if (action === 'in') {
      if (tc) return; // already clocked in
      tc = {
        employeeId: empId,
        date: todayStr,
        clockIn: nowISO,
        clockOut: null,
        breaks: [],
        totalHours: 0,
        approved: false,
        approvedBy: ''
      };
      await BriskDB.addTimecard(tc);
      // Optimistically update local state so UI reflects instantly
      state.timecards.push(tc);

    } else if (action === 'out') {
      if (!tc || tc.clockOut) return;
      const lastBreak = tc.breaks && tc.breaks.length > 0 ? tc.breaks[tc.breaks.length - 1] : null;
      if (lastBreak && !lastBreak.end) lastBreak.end = nowISO;
      tc.clockOut = nowISO;
      tc.totalHours = calculateTimecardHours(tc);
      await BriskDB.updateTimecard(tc);

    } else if (action === 'break-start') {
      if (!tc || tc.clockOut) return;
      if (!tc.breaks) tc.breaks = [];
      tc.breaks.push({ start: nowISO, end: null });
      await BriskDB.updateTimecard(tc);

    } else if (action === 'break-end') {
      if (!tc || tc.clockOut) return;
      const lastBreak = tc.breaks && tc.breaks.length > 0 ? tc.breaks[tc.breaks.length - 1] : null;
      if (lastBreak && !lastBreak.end) lastBreak.end = nowISO;
      await BriskDB.updateTimecard(tc);
    }
  } catch (err) {
    showToast('Clock action failed: ' + err.message, 'error');
  }

  // Refresh UI immediately from live BriskDB data
  loadDataFromState();
  updateTerminalStatus();
  renderAdminTimesheets();
}

function calculateTimecardHours(tc) {
  if (!tc.clockIn || !tc.clockOut) return 0;

  const start = new Date(tc.clockIn);
  const end = new Date(tc.clockOut);
  let diffMs = end.getTime() - start.getTime();

  let breakMs = 0;
  if (tc.breaks) {
    tc.breaks.forEach(b => {
      if (b.start && b.end) {
        breakMs += (new Date(b.end).getTime() - new Date(b.start).getTime());
      }
    });
  }

  const netHours = (diffMs - breakMs) / (1000 * 60 * 60);
  return Math.max(0, parseFloat(netHours.toFixed(2)));
}

function renderAdminTimesheets() {
  const tbody = document.getElementById('timesheet-table-body');
  tbody.innerHTML = '';

  const mon = new Date(state.currentWeekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  mon.setHours(0,0,0,0);
  sun.setHours(23,59,59,999);

  let weekCards = state.timecards.filter(tc => {
    const tcDate = new Date(tc.date);
    tcDate.setHours(0,0,0,0);
    return tcDate >= mon && tcDate <= sun;
  });

  if (state.currentUser.role === 'employee') {
    // Employees can't see the admin panel list at all (handled in applyRoleAccessControl)
    return;
  }

  if (weekCards.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 0;"><div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><h4>No timesheets recorded</h4><p>No clock-in data found for this week.</p></div></td></tr>`;
    return;
  }

  weekCards.sort((a,b) => b.date.localeCompare(a.date));

  weekCards.forEach(tc => {
    const emp = state.employees.find(e => e.id === tc.employeeId);
    const empName = emp ? emp.name : 'Unknown';

    const formatTimeHM = (isoStr) => {
      if (!isoStr) return '-';
      const d = new Date(isoStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    let statusHtml = '';
    let actionHtml = '';

    if (tc.approved) {
      statusHtml = `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Approved</span>`;
      actionHtml = `<span class="text-muted" style="font-size:11px;">Manager: ${tc.approvedBy}</span>`;
    } else {
      statusHtml = `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Pending</span>`;
      actionHtml = `
        <div class="action-group">
          <button class="btn btn-primary" style="padding: 4px 8px; font-size:11px;" onclick="approveTimecard('${tc.id}')">
          Approve
          </button>
          <button class="btn btn-outline" style="padding: 4px 8px; font-size:11px;" onclick="openTimecardEditModal('${tc.id}')">Edit</button>
        </div>
      `;
    }

    const empTimecardsForWeek = weekCards.filter(c => c.employeeId === emp.id);
    const empActualWeekHours = empTimecardsForWeek.reduce((sum, c) => sum + c.totalHours, 0);
    const otBadge = (empActualWeekHours > emp.maxHours) ? ' <span class="badge badge-danger">OT Exceeded</span>' : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tc.date}</td>
      <td><strong>${empName}</strong></td>
      <td>${formatTimeHM(tc.clockIn)}</td>
      <td>${formatTimeHM(tc.clockOut)}</td>
      <td>
        <div style="font-weight: 500;">Total: ${tc.totalHours.toFixed(1)}h${otBadge}
        <button class="btn btn-icon" onclick="openTimecardEditModal('${tc.id}')" style="padding: 2px 6px; margin-left: 8px;"><i class="fa-solid fa-pen"></i></button>
        </div>
      </td>
      <td>${statusHtml}</td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function approveTimecard(tcId) {
  const tc = state.timecards.find(t => t.id === tcId);
  if (!tc) return;

  tc.approved = true;
  tc.approvedBy = state.currentUser.name;
  
  await BriskDB.updateTimecard(tc);
  loadDataFromState();
  renderAdminTimesheets();
}

function openTimecardEditModal(tcId) {
  const tc = state.timecards.find(t => t.id === tcId);
  if (!tc) return;

  document.getElementById('timecard-edit-id').value = tc.id;
  
  // Format for datetime-local: YYYY-MM-DDThh:mm
  const formatForInput = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    // Use local time for datetime-local input
    const tzoffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  document.getElementById('timecard-edit-in').value = formatForInput(tc.clockIn);
  document.getElementById('timecard-edit-out').value = formatForInput(tc.clockOut);
  
  document.getElementById('modal-timecard-edit').classList.add('active');
}

function closeTimecardEditModal() {
  window.closeModal(document.getElementById('modal-timecard-edit'));
  renderReportsPanel();
}

async function saveTimecardEdit() {
  const tcId = document.getElementById('timecard-edit-id').value;
  const inVal = document.getElementById('timecard-edit-in').value;
  const outVal = document.getElementById('timecard-edit-out').value;
  
  const tc = state.timecards.find(t => t.id === tcId);
  if (!tc) return;
  
  if (inVal) tc.clockIn = new Date(inVal).toISOString();
  if (outVal) tc.clockOut = new Date(outVal).toISOString();
  
  if (tc.breaks && tc.breaks.length > 0) {
    const shiftStart = new Date(tc.clockIn).getTime();
    const shiftEnd = tc.clockOut ? new Date(tc.clockOut).getTime() : Infinity;
    tc.breaks = tc.breaks.filter(b => {
      const bStart = new Date(b.start).getTime();
      const bEnd = b.end ? new Date(b.end).getTime() : Infinity;
      return bStart < shiftEnd && bEnd > shiftStart;
    });
  }
  
  tc.totalHours = calculateTimecardHours(tc);
  tc.approved = false;
  tc.approvedBy = null;
  
  try {
    await BriskDB.updateTimecard(tc);
    showToast('Timecard updated', 'success');
    closeTimecardEditModal();
    loadDataFromState();
  } catch (err) {
    showToast('Failed to update timecard', 'error');
  }
}

window.openTimecardEditModal = openTimecardEditModal;
window.closeTimecardEditModal = closeTimecardEditModal;
window.saveTimecardEdit = saveTimecardEdit;


/* ==========================================================================
   PANEL: TIME OFF REQUESTS
   ========================================================================== */

function renderTimeOffPanel() {
  const tbody = document.getElementById('leave-table-body');
  tbody.innerHTML = '';

  const leaveSelect = document.getElementById('leave-emp-select');
  if (leaveSelect) {
    leaveSelect.innerHTML = '<option value="">Select Employee</option>' + 
      state.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  }

  const requests = [...state.leaveRequests];
  
  requests.sort((a,b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return b.startDate.localeCompare(a.startDate);
  });

  const isManager = state.currentUser.role !== 'employee';
  
  // Hide Decisions header column if employee
  const thDec = document.querySelector('.manager-action-th');
  if (thDec) {
    if (isManager) thDec.classList.remove('hide');
    else thDec.classList.add('hide');
  }

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${isManager ? 5 : 4}" style="padding: 0;"><div class="empty-state"><i class="fa-solid fa-plane-slash"></i><h4>No leave requests</h4><p>There are no leave requests filed at this time.</p></div></td></tr>`;
    return;
  }

  requests.forEach(req => {
    const emp = state.employees.find(e => e.id === req.employeeId);
    const empName = emp ? emp.name : 'Unknown';

    let statusBadge = '';
    let actionsHtml = '';

    if (req.status === 'Pending') {
      statusBadge = '<span class="badge badge-warning">Pending</span>';
      actionsHtml = `
        <div class="action-group">
        <button class="btn btn-success" style="padding: 4px 8px; font-size:11px;" onclick="decideLeaveRequest('${req.id}', 'Approved')">Approve</button>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size:11px;" onclick="decideLeaveRequest('${req.id}', 'Rejected')">Reject</button>
        </div>
      `;
    } else if (req.status === 'Approved') {
      statusBadge = '<span class="badge badge-success">Approved</span>';
      actionsHtml = `<button class="btn btn-outline" style="padding: 4px 8px; font-size:11px;" onclick="decideLeaveRequest('${req.id}', 'Pending')">Set Pending</button>`;
    } else {
      statusBadge = '<span class="badge badge-danger">Rejected</span>';
      actionsHtml = `<button class="btn btn-outline" style="padding: 4px 8px; font-size:11px;" onclick="decideLeaveRequest('${req.id}', 'Pending')">Set Pending</button>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${empName}</strong></td>
      <td>${req.startDate} ~ ${req.endDate}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${req.reason}</td>
      <td>${statusBadge}</td>
      ${isManager ? `<td><div style="display:flex; gap: 4px;">${actionsHtml}</div></td>` : ''}
    `;
    tbody.appendChild(tr);
  });
}

async function handleLeaveSubmit(event) {
  event.preventDefault();

  // If employee role, automatically set empId to current user employeeId
  const empId = state.currentUser.role === 'employee' ? state.currentUser.employeeId : document.getElementById('leave-emp-select').value;
  const start = document.getElementById('leave-start-date').value;
  const end = document.getElementById('leave-end-date').value;
  const reason = document.getElementById('leave-reason').value;

  if (start > end) {
    showToast('End date cannot be earlier than start date.', 'error');
    return;
  }

  const todayStr = formatDateISO(new Date());
  if (start < todayStr) {
    showToast('Start date cannot be in the past.', 'error');
    return;
  }

  const req = {
    employeeId: empId,
    startDate: start,
    endDate: end,
    reason: reason
  };

  await BriskDB.addLeaveRequest(req);
  document.getElementById('leave-request-form').reset();
  
  loadDataFromState();
  renderTimeOffPanel();
}

async function decideLeaveRequest(reqId, decision) {
  const req = state.leaveRequests.find(r => r.id === reqId);
  if (!req) return;

  req.status = decision;
  await BriskDB.updateLeaveRequest(req);

  if (decision === 'Approved') {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    const conflictingShifts = state.shifts.filter(s => {
      if (s.employeeId !== req.employeeId) return false;
      const sDate = new Date(s.date);
      sDate.setHours(0,0,0,0);
      return sDate >= start && sDate <= end;
    });

    if (conflictingShifts.length > 0) {
      const doUnassign = confirm(`⚠️ Roster Conflict Warning: Leave approved.\nThis employee has ${conflictingShifts.length} shifts scheduled during this leave.\nWould you like to automatically unassign them now?`);
      if (doUnassign) {
        try {
          const updatedShifts = conflictingShifts.map(s => ({ ...s, employeeId: null }));
          await BriskDB.batchUpdateShifts(updatedShifts);
          
          // Partial auto-schedule to fill the gaps using the leave's week
          const targetWeekStart = getMondayOfCurrentWeek(new Date(req.startDate));
          const targetWeekStr = formatDateISO(targetWeekStart);
          // Refresh state.shifts to reflect the unassignments locally before running scheduler
          state.shifts = state.shifts.map(s => {
            if (updatedShifts.find(us => us.id === s.id)) return { ...s, employeeId: null };
            return s;
          });
          const result = BriskScheduler.run(state.shifts, state.employees, state.leaveRequests, targetWeekStr, state.timecards, false);
          
          if (result.success && result.assignedCount > 0) {
            const reAssignedShifts = result.shifts.filter(s => updatedShifts.find(us => us.id === s.id && s.employeeId !== null));
            if (reAssignedShifts.length > 0) {
               await BriskDB.batchUpdateShifts(reAssignedShifts);
               showToast(`Successfully unassigned ${updatedShifts.length} conflicting shifts.\nAuto-scheduler was able to backfill ${reAssignedShifts.length} of them immediately!`, 'success');
            } else {
               showToast(`Successfully unassigned ${updatedShifts.length} conflicting shifts.\nCould not find available staff to auto-backfill them.`, 'success');
            }
          }
        } catch(err) {
          console.error('Failed to unassign conflicting shifts:', err);
          showToast('Failed to automatically unassign conflicting shifts.', 'error');
        }
      }
    }
  }

  loadDataFromState();
  renderTimeOffPanel();
}


/* ==========================================================================
   PANEL: REPORTS & PAYROLL (Roster Emailing Trigger)
   ========================================================================== */

function renderReportsPanel() {
  document.getElementById('report-week-range').textContent = getWeekRangeText(state.currentWeekStart);
  
  const printDatesText = `Period: ${formatDateISO(state.currentWeekStart)} ~ ${formatDateISO(new Date(state.currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}`;
  document.getElementById('report-print-dates').textContent = printDatesText;

  const tbody = document.getElementById('report-table-body');
  tbody.innerHTML = '';

  const mon = new Date(state.currentWeekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  mon.setHours(0,0,0,0);
  sun.setHours(23,59,59,999);

  let totalSchedHoursSum = 0;
  let totalActualHoursSum = 0;
  let totalActualCostSum = 0;

  const activeEmployees = state.employees.filter(e => e.active);

  activeEmployees.forEach(emp => {
    const empWeekHours = calculateEmployeeWeekHours(emp.id, state.currentWeekStart);

    const empTimecards = state.timecards.filter(tc => {
      if (tc.employeeId !== emp.id) return false;
      const tcDate = new Date(tc.date);
      tcDate.setHours(0,0,0,0);
      return tcDate >= mon && tcDate <= sun && tc.approved;
    });

    let actualHours = 0;
    empTimecards.forEach(tc => {
      actualHours += tc.totalHours;
    });

    const hourlyRate = emp.hourlyRate || 0;
    const grossPay = actualHours * hourlyRate;

    totalSchedHoursSum += empWeekHours;
    totalActualHoursSum += actualHours;
    totalActualCostSum += grossPay;

    const otBadge = (actualHours > emp.maxHours) ? ' <span class="badge badge-danger">OT Exceeded</span>' : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${emp.name}</strong> <span class="text-muted" style="font-size:11px;">(${emp.role})</span></td>
      <td class="text-right">$${hourlyRate.toFixed(2)}</td>
      <td class="text-right">${empWeekHours.toFixed(1)}h</td>
      <td class="text-right">${actualHours.toFixed(1)}h${otBadge}</td>
      <td class="text-right text-neon">$${grossPay.toFixed(2)}</td>
      <td class="text-center print-hide">
        <button class="btn btn-outline" style="padding:4px 8px; font-size:11px;" onclick="openEmailRosterModal('${emp.id}')" ${empWeekHours === 0 ? 'disabled' : ''}>
          <i class="fa-solid fa-envelope"></i> Email Roster
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('rep-total-sched-hours').textContent = `${totalSchedHoursSum.toFixed(1)}h`;
  document.getElementById('rep-total-actual-hours').textContent = `${totalActualHoursSum.toFixed(1)}h`;
  document.getElementById('rep-total-actual-cost').textContent = `$${totalActualCostSum.toFixed(2)}`;
}

// Open specific staff member's roster email modal
function openEmailRosterModal(employeeId) {
  const emp = state.employees.find(e => e.id === employeeId);
  if (!emp) return;

  const mon = new Date(state.currentWeekStart);
  const weekStartStr = formatDateISO(mon);

  document.getElementById('email-roster-emp-id').value = employeeId;
  document.getElementById('email-roster-emp-name').textContent = emp.name;

  let text = `Here is your roster for the week of ${getWeekRangeText(mon)}:\n\n`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const dateStr = formatDateISO(d);
    
    const dayShifts = state.shifts.filter(s => s.employeeId === employeeId && s.date === dateStr);
    if (dayShifts.length > 0) {
      dayShifts.forEach(s => {
        text += `📅 [${DAY_NAMES[d.getDay()]}] ${dateStr}\n`;
        text += `   - Time: ${s.startTime} ~ ${s.endTime}\n`;
        text += `   - Role: ${s.role}\n`;
        if (s.notes) text += `   - Notes: ${s.notes}\n`;
        text += `\n`;
      });
    }
  }

  document.getElementById('email-roster-textarea').value = text;
  document.getElementById('modal-email-roster').classList.add('active');
}

function closeEmailRosterModal() {
  document.getElementById('modal-email-roster').classList.remove('active');
}

// Call backend API route to send SMTP email
async function sendRosterEmail() {
  const empId = document.getElementById('email-roster-emp-id').value;
  const text = document.getElementById('email-roster-textarea').value;
  const weekStart = formatDateISO(state.currentWeekStart);

  const btn = document.querySelector('#modal-email-roster .btn-neon');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

  try {
    const res = await BriskDB.apiSendRosterEmail(empId, weekStart, text);

    if (res.error) {
      showToast(`Error: ${res.error}`, 'error');
    } else {
      showToast(res.message, 'success');
      closeEmailRosterModal();
    }
  } catch (err) {
    showToast(`Unexpected error: ${err.message || err}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function publishSchedule() {
  const mon = new Date(state.currentWeekStart);
  let hasDrafts = false;
  let hasUnassigned = false;
  
  const updates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const dateStr = formatDateISO(d);
    
    const dayShifts = state.shifts.filter(s => s.date === dateStr);
    dayShifts.forEach(s => {
      if (s.employeeId === null) {
        hasUnassigned = true;
      } else if (s.status !== 'published') {
        hasDrafts = true;
        updates.push({ id: s.id, status: 'published' });
      }
    });
  }

  if (!hasDrafts && !hasUnassigned) {
    showToast('All shifts this week are already published.', 'info');
    return;
  }
  
  if (hasUnassigned && !confirm('You have unassigned shifts. Publish the rest anyway?')) {
    return;
  }

  try {
    const btn = document.querySelector('button[onclick="publishSchedule()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
    
    await BriskDB.batchUpdateShifts(updates);
    showToast('Schedule published and employees notified!', 'success');
    
    // Auto-schedule email could go here
    btn.innerHTML = originalText;
  } catch (err) {
    console.error(err);
    showToast('Failed to publish schedule.', 'error');
  }
}

window.publishSchedule = publishSchedule;


/* ==========================================================================
   PANEL: SETTINGS & DATABASE
   ========================================================================== */

async function saveCompanySetting() {
  const name = document.getElementById('settings-company-name').value;
  if (!name.trim()) return;

  state.settings.companyName = name;
  BriskDB.saveSettings(state.settings);
  
  loadDataFromState();
  showToast('Organization name saved.', 'success');
}

async function exportDatabaseFile() {
  const jsonStr = await BriskDB.exportData();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `brisk_schedules_backup_${formatDateISO(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   PASSWORD RESET FLOW
   ========================================================================== */
function openResetPasswordModal(event) {
  if (event) event.preventDefault();
  document.getElementById('modal-reset-password').classList.add('active');
}

function closeResetPasswordModal() {
  document.getElementById('modal-reset-password').classList.remove('active');
}

async function handleResetPasswordSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('reset-email').value;
  if (!email) return;

  const btn = document.querySelector('#modal-reset-password button[type="submit"]');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

  try {
    const res = await BriskDB.apiResetPasswordForEmail(email);
    if (res.error) {
      showToast('Error: ' + res.error, 'error');
    } else {
      showToast('Password reset link sent to your email!', 'success');
      closeResetPasswordModal();
    }
  } catch (err) {
    showToast('Failed to send reset link.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

async function handleUpdatePasswordSubmit(event) {
  event.preventDefault();
  const password = document.getElementById('update-new-password').value;
  if (!password || password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }

  const btn = document.querySelector('#modal-update-password button[type="submit"]');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  try {
    const res = await BriskDB.apiUpdatePassword(password);
    if (res.error) {
      showToast('Error: ' + res.error, 'error');
    } else {
      showToast('Password updated successfully! Please log in.', 'success');
      window.location.hash = ''; // Clear recovery hash
      document.getElementById('modal-update-password').classList.remove('active');
      showLoginScreen();
    }
  } catch (err) {
    showToast('Failed to update password.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

/* ==========================================================================
   GLOBAL WINDOW BINDINGS — Required because app.js is loaded as type="module"
   which scopes all functions to the module. Inline HTML handlers (onclick,
   onsubmit) can only call functions on the global window object.
   ========================================================================== */
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.handleLogout = handleLogout;
window.handleInviteSubmit = handleInviteSubmit;
window.handleShiftSubmit = handleShiftSubmit;
window.handleShiftDelete = handleShiftDelete;
window.handleEmployeeSubmit = handleEmployeeSubmit;
window.handleEmployeeDelete = handleEmployeeDelete;
window.handleClockAction = handleClockAction;
window.handleLeaveSubmit = handleLeaveSubmit;
window.showLoginCard = showLoginCard;
window.showRegisterCard = showRegisterCard;
window.switchTab = switchTab;
window.openAddShiftModal = openAddShiftModal;
window.openEditShiftModal = openEditShiftModal;
window.closeShiftModal = closeShiftModal;
window.openAddEmployeeModal = openAddEmployeeModal;
window.openEditEmployeeModal = openEditEmployeeModal;
window.closeEmployeeModal = closeEmployeeModal;
window.openEmailRosterModal = openEmailRosterModal;
window.closeEmailRosterModal = closeEmailRosterModal;
window.sendRosterEmail = sendRosterEmail;
window.copyInviteUrl = copyInviteUrl;
window.exportDatabaseFile = exportDatabaseFile;
window.saveCompanySetting = saveCompanySetting;
window.toggleAvailTimeInputs = toggleAvailTimeInputs;
window.openResetPasswordModal = openResetPasswordModal;
window.closeResetPasswordModal = closeResetPasswordModal;
window.handleResetPasswordSubmit = handleResetPasswordSubmit;
window.handleUpdatePasswordSubmit = handleUpdatePasswordSubmit;

/* ==========================================================================
   ROLE CUSTOMIZATION HANDLERS
   ========================================================================== */

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '79, 70, 229';
}

function renderRolesSettingsList() {
  const container = document.getElementById('roles-settings-list');
  if (!container) return;

  container.innerHTML = '';
  
  if (state.roles.length === 0) {
    container.innerHTML = '<div class="text-muted">No custom roles defined.</div>';
    return;
  }

  state.roles.forEach(role => {
    const div = document.createElement('div');
    div.className = 'role-item-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '8px';
    div.style.padding = '8px';
    div.style.background = 'var(--bg-card)';
    div.style.border = '1px solid var(--border-color)';
    div.style.borderRadius = 'var(--radius-sm)';

    div.innerHTML = `
      <input type="text" value="${role.name}" class="form-control" style="flex:1; height:34px; font-size:0.9rem;" onchange="handleRoleNameChange('${role.id}', this.value)">
      <input type="color" value="${role.color}" style="width:34px; height:34px; padding:0 2px; cursor:pointer; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:transparent;" onchange="handleRoleColorChange('${role.id}', this.value)">
      <button class="btn btn-danger btn-icon" style="height:34px; width:34px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="handleRoleDelete('${role.id}')"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
  });
}

async function handleAddRoleSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById('new-role-name');
  const colorInput = document.getElementById('new-role-color');
  if (!nameInput || !colorInput) return;

  const name = nameInput.value.trim();
  const color = colorInput.value;

  if (!name) return;

  if (state.roles.some(r => r.name.toLowerCase() === name.toLowerCase())) {
    showToast('A role with this name already exists.', 'error');
    return;
  }

  try {
    await BriskDB.addRole({ name, color });
    nameInput.value = '';
    showToast('Role added successfully.', 'success');
    loadDataFromState();
    renderRolesSettingsList();
  } catch (err) {
    showToast('Failed to add role.', 'error');
  }
}

async function handleRoleNameChange(id, newName) {
  const name = newName.trim();
  if (!name) return;

  const role = state.roles.find(r => r.id === id);
  if (!role) return;

  if (role.name === name) return;

  if (state.roles.some(r => r.id !== id && r.name.toLowerCase() === name.toLowerCase())) {
    showToast('Another role already has this name.', 'error');
    loadDataFromState();
    renderRolesSettingsList();
    return;
  }

  try {
    role.name = name;
    await BriskDB.updateRole(role);
    showToast('Role name updated.', 'success');
    loadDataFromState();
    renderRolesSettingsList();
  } catch (err) {
    showToast('Failed to update role name.', 'error');
  }
}

async function handleRoleColorChange(id, newColor) {
  const role = state.roles.find(r => r.id === id);
  if (!role) return;

  if (role.color === newColor) return;

  try {
    role.color = newColor;
    await BriskDB.updateRole(role);
    showToast('Role color updated.', 'success');
    loadDataFromState();
    renderScheduler();
    renderRolesSettingsList();
  } catch (err) {
    showToast('Failed to update role color.', 'error');
  }
}

async function handleRoleDelete(id) {
  if (!confirm('Are you sure you want to delete this role? Any employee or shift assigned to this role will remain assigned, but the role color coding will be lost.')) {
    return;
  }

  try {
    await BriskDB.deleteRole(id);
    showToast('Role deleted successfully.', 'success');
    loadDataFromState();
    renderRolesSettingsList();
  } catch (err) {
    showToast('Failed to delete role.', 'error');
  }
}

function renderPositionsSettingsList() {
  const container = document.getElementById('positions-settings-list');
  if (!container) return;

  container.innerHTML = '';
  
  if (state.positions.length === 0) {
    container.innerHTML = '<div class="text-muted">No custom positions defined.</div>';
    return;
  }

  state.positions.forEach(pos => {
    const div = document.createElement('div');
    div.className = 'position-item-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '8px';
    div.style.padding = '8px';
    div.style.background = 'var(--bg-card)';
    div.style.border = '1px solid var(--border-color)';
    div.style.borderRadius = 'var(--radius-sm)';

    div.innerHTML = `
      <input type="text" value="${pos.name}" class="form-control" style="flex:1; height:34px; font-size:0.9rem;" onchange="handlePositionNameChange('${pos.id}', this.value)">
      <button class="btn btn-danger btn-icon" style="height:34px; width:34px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="handlePositionDelete('${pos.id}')"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
  });
}

async function handleAddPositionSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById('new-position-name');
  if (!nameInput) return;

  const name = nameInput.value.trim();
  if (!name) return;

  if (state.positions.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('A position with this name already exists.', 'error');
    return;
  }

  try {
    await BriskDB.addPosition(name);
    nameInput.value = '';
    showToast('Position added successfully.', 'success');
    loadDataFromState();
    renderPositionsSettingsList();
  } catch (err) {
    showToast('Failed to add position.', 'error');
  }
}

async function handlePositionNameChange(id, newName) {
  const name = newName.trim();
  if (!name) return;

  const pos = state.positions.find(p => p.id === id);
  if (!pos) return;

  if (pos.name === name) return;

  if (state.positions.some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
    showToast('Another position already has this name.', 'error');
    loadDataFromState();
    renderPositionsSettingsList();
    return;
  }

  try {
    pos.name = name;
    await BriskDB.updatePosition(pos);
    showToast('Position name updated.', 'success');
    loadDataFromState();
    renderPositionsSettingsList();
  } catch (err) {
    showToast('Failed to update position name.', 'error');
  }
}

async function handlePositionDelete(id) {
  if (!confirm('Are you sure you want to delete this position? Employees with this default position will remain assigned, but it will no longer show in the register options.')) {
    return;
  }

  try {
    await BriskDB.deletePosition(id);
    showToast('Position deleted successfully.', 'success');
    loadDataFromState();
    renderPositionsSettingsList();
  } catch (err) {
    showToast('Failed to delete position.', 'error');
  }
}

function updatePasteButtonState() {
  const pasteContainer = document.getElementById('shift-paste-container');
  if (!pasteContainer) return;
  
  if (state.copiedShift) {
    pasteContainer.style.display = 'block';
    pasteContainer.innerHTML = `
      <button type="button" class="btn btn-outline btn-block" onclick="pasteCopiedShiftDetails()" style="border-style: dashed; border-color: var(--accent-cyan); display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i class="fa-regular fa-clipboard"></i> Paste Copied Shift (${state.copiedShift.startTime} - ${state.copiedShift.endTime} ${state.copiedShift.role})
      </button>
    `;
  } else {
    pasteContainer.style.display = 'none';
  }
}

function pasteCopiedShiftDetails() {
  if (!state.copiedShift) return;
  
  const roleSelect = document.getElementById('shift-role');
  if (roleSelect) roleSelect.value = state.copiedShift.role;
  
  const startInput = document.getElementById('shift-start');
  if (startInput) startInput.value = state.copiedShift.startTime;
  
  const endInput = document.getElementById('shift-end');
  if (endInput) endInput.value = state.copiedShift.endTime;
  
  const notesInput = document.getElementById('shift-notes');
  if (notesInput) notesInput.value = state.copiedShift.notes || '';
  
  showToast('Copied shift details pasted!', 'success');
}

window.renderRolesSettingsList = renderRolesSettingsList;
window.handleAddRoleSubmit = handleAddRoleSubmit;
window.handleRoleNameChange = handleRoleNameChange;
window.handleRoleColorChange = handleRoleColorChange;
window.handleRoleDelete = handleRoleDelete;
window.renderPositionsSettingsList = renderPositionsSettingsList;
window.handleAddPositionSubmit = handleAddPositionSubmit;
window.handlePositionNameChange = handlePositionNameChange;
window.handlePositionDelete = handlePositionDelete;
window.pasteCopiedShiftDetails = pasteCopiedShiftDetails;
window.hexToRgb = hexToRgb;
window.updatePasteButtonState = updatePasteButtonState;
window.approveTimecard = approveTimecard;
window.decideLeaveRequest = decideLeaveRequest;

window.openChangePasswordModal = function() {
  document.getElementById('modal-change-password').classList.add('active');
};

window.closeChangePasswordModal = function() {
  document.getElementById('modal-change-password').classList.remove('active');
  const newPass = document.getElementById('change-new-password');
  const confirmPass = document.getElementById('change-confirm-password');
  if (newPass) newPass.value = '';
  if (confirmPass) confirmPass.value = '';
};

window.handleChangePasswordSubmit = async function(event) {
  event.preventDefault();
  const newPass = document.getElementById('change-new-password').value;
  const confirmPass = document.getElementById('change-confirm-password').value;

  if (newPass !== confirmPass) {
    showToast('Passwords do not match.', 'error');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const origText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

  try {
    const res = await BriskDB.apiUpdatePassword(newPass);
    if (res.error) throw new Error(res.error);

    showToast('Password changed successfully!', 'success');
    closeChangePasswordModal();
  } catch (err) {
    showToast(err.message || 'Failed to update password.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origText;
  }
};

window.triggerGlobalRefresh = async function() {
  const refreshBtn = document.getElementById('btn-global-refresh');
  const icon = refreshBtn ? refreshBtn.querySelector('i') : null;
  
  if (icon) icon.classList.add('fa-spin');
  showToast('Refreshing data from Supabase...', 'info');

  try {
    // Force sync and reload
    await BriskDB.syncFromServer();
    loadDataFromState();
    renderActivePanel();
    showToast('Data refreshed successfully!', 'success');
  } catch (err) {
    showToast('Failed to refresh: ' + err.message, 'error');
  } finally {
    if (icon) {
      setTimeout(() => {
        icon.classList.remove('fa-spin');
      }, 700);
    }
  }
};

// --- Trading Hours and Daily View Helpers ---

const DEFAULT_TRADING_HOURS = {
  "1": { "open": "08:30", "close": "17:30", "closed": false },
  "2": { "open": "08:30", "close": "17:30", "closed": false },
  "3": { "open": "08:30", "close": "17:30", "closed": false },
  "4": { "open": "08:30", "close": "17:30", "closed": false },
  "5": { "open": "08:30", "close": "17:30", "closed": false },
  "6": { "open": "09:00", "close": "13:00", "closed": false },
  "0": { "open": "00:00", "close": "00:00", "closed": true }
};

function timeToDecimal(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}
window.timeToDecimal = timeToDecimal;

function calculateShiftHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, diffMinutes / 60);
}
window.calculateShiftHours = calculateShiftHours;

function renderSettingsPanel() {
  if (!state.settings) state.settings = {};
  if (!state.settings.tradingHours) {
    state.settings.tradingHours = DEFAULT_TRADING_HOURS;
  }
  const th = state.settings.tradingHours;
  
  for (let d = 0; d < 7; d++) {
    const dayData = th[String(d)] || DEFAULT_TRADING_HOURS[String(d)];
    if (!dayData) continue;
    
    const closedCheckbox = document.getElementById(`trading-closed-${d}`);
    const openInput = document.getElementById(`trading-open-${d}`);
    const closeInput = document.getElementById(`trading-close-${d}`);
    
    if (closedCheckbox) closedCheckbox.checked = !!dayData.closed;
    if (openInput) {
      openInput.value = dayData.open || '08:30';
      openInput.disabled = !!dayData.closed;
    }
    if (closeInput) {
      closeInput.value = dayData.close || '17:30';
      closeInput.disabled = !!dayData.closed;
    }
  }

  // Also prefill Organization Name
  const settingsName = document.getElementById('settings-company-name');
  if (settingsName) settingsName.value = state.settings.companyName || 'Amcal Pharmacy Woywoy Rosters';
}
window.renderSettingsPanel = renderSettingsPanel;

function toggleTradingDayClosed(dayNum) {
  const closedCheckbox = document.getElementById(`trading-closed-${dayNum}`);
  const openInput = document.getElementById(`trading-open-${dayNum}`);
  const closeInput = document.getElementById(`trading-close-${dayNum}`);
  
  if (closedCheckbox && openInput && closeInput) {
    const isClosed = closedCheckbox.checked;
    openInput.disabled = isClosed;
    closeInput.disabled = isClosed;
  }
}
window.toggleTradingDayClosed = toggleTradingDayClosed;

async function saveTradingHours(event) {
  event.preventDefault();
  const th = {};
  
  for (let d = 0; d < 7; d++) {
    const closedCheckbox = document.getElementById(`trading-closed-${d}`);
    const openInput = document.getElementById(`trading-open-${d}`);
    const closeInput = document.getElementById(`trading-close-${d}`);
    
    th[String(d)] = {
      closed: closedCheckbox ? closedCheckbox.checked : false,
      open: openInput ? openInput.value : '08:30',
      close: closeInput ? closeInput.value : '17:30'
    };
  }
  
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const origText = submitBtn ? submitBtn.innerHTML : 'Save Trading Hours';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }
  
  try {
    const updatedSettings = {
      ...state.settings,
      tradingHours: th
    };
    await BriskDB.saveSettings(updatedSettings);
    state.settings = updatedSettings;
    showToast('Pharmacy Trading Hours saved successfully!', 'success');
  } catch (err) {
    console.error('Save Trading Hours Error:', err);
    showToast('Failed to save trading hours: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}
window.saveTradingHours = saveTradingHours;

function adjustDailyDate(offset) {
  const d = new Date(state.dailyDate);
  d.setDate(state.dailyDate.getDate() + offset);
  state.dailyDate = d;
  renderDailyPanel();
}
window.adjustDailyDate = adjustDailyDate;

function setDailyDateToday() {
  state.dailyDate = new Date();
  renderDailyPanel();
}
window.setDailyDateToday = setDailyDateToday;

function renderDailyPanel() {
  const dateDisplay = document.getElementById('daily-date-display');
  if (dateDisplay) {
    // Australian Date Format: Friday, 10 July 2026
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateDisplay.textContent = state.dailyDate.toLocaleDateString('en-AU', options);
  }
  
  const dateStr = formatDateISO(state.dailyDate);
  const dayShifts = state.shifts.filter(s => s.date === dateStr);
  
  // Sort shifts by start time
  dayShifts.sort((a, b) => {
    return timeToDecimal(a.startTime) - timeToDecimal(b.startTime);
  });
  
  // Render timeline visual
  const timelineVisual = document.getElementById('daily-timeline-visual');
  const timelineLabels = document.getElementById('daily-timeline-labels');
  
  if (timelineVisual && timelineLabels) {
    timelineVisual.innerHTML = '';
    timelineLabels.innerHTML = '';
    
    // Get trading hours for the active day of week
    const dayOfWeek = state.dailyDate.getDay();
    const th = (state.settings && state.settings.tradingHours) 
      ? state.settings.tradingHours[String(dayOfWeek)] 
      : DEFAULT_TRADING_HOURS[String(dayOfWeek)];
    
    if (th && th.closed) {
      timelineVisual.innerHTML = `
        <div style="text-align: center; line-height: 60px; color: var(--text-danger); font-weight: 600;">
          <i class="fa-solid fa-store-slash"></i> Pharmacy Closed Today
        </div>
      `;
      timelineVisual.style.height = '60px';
    } else {
      // Determine timeline range: start 30m before open, end 30m after close (default to 8am - 6pm if closed/missing)
      const openHour = th ? timeToDecimal(th.open) : 8.5;
      const closeHour = th ? timeToDecimal(th.close) : 17.5;
      const timelineStart = Math.floor(openHour - 0.5);
      const timelineEnd = Math.ceil(closeHour + 0.5);
      const span = timelineEnd - timelineStart;
      
      // Render hours markers/labels
      for (let h = timelineStart; h <= timelineEnd; h++) {
        const spanLabel = document.createElement('span');
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const ampm = h >= 12 ? 'pm' : 'am';
        spanLabel.textContent = `${hour12}${ampm}`;
        timelineLabels.appendChild(spanLabel);
      }
      
      // Render visual timeline bars stacked vertically to handle overlap
      let rowCount = 0;
      dayShifts.forEach((s, idx) => {
        const emp = state.employees.find(e => e.id === s.employeeId);
        const empName = emp ? emp.name : 'Unassigned Shift';
        
        const left = Math.max(0, Math.min(100, ((timeToDecimal(s.startTime) - timelineStart) / span) * 100));
        const width = Math.max(1, Math.min(100 - left, ((timeToDecimal(s.endTime) - timeToDecimal(s.startTime)) / span) * 100));
        const roleColor = state.roles.find(r => r.name.toLowerCase() === s.role.toLowerCase())?.color || '#ef4444';
        
        const rowTop = 10 + (idx * 28);
        rowCount++;
        
        const bar = document.createElement('div');
        bar.className = 'timeline-bar';
        bar.style.position = 'absolute';
        bar.style.left = `${left}%`;
        bar.style.width = `${width}%`;
        bar.style.top = `${rowTop}px`;
        bar.style.height = '22px';
        bar.style.background = roleColor;
        bar.style.opacity = '0.9';
        bar.style.borderRadius = 'var(--radius-sm)';
        bar.style.fontSize = '0.75rem';
        bar.style.color = '#fff';
        bar.style.padding = '0 8px';
        bar.style.whiteSpace = 'nowrap';
        bar.style.overflow = 'hidden';
        bar.style.textOverflow = 'ellipsis';
        bar.style.lineHeight = '22px';
        bar.style.fontWeight = '500';
        bar.title = `${empName}: ${s.startTime} - ${s.endTime} (${s.role})`;
        bar.textContent = `${empName} (${s.role})`;
        
        timelineVisual.appendChild(bar);
      });
      
      // Adjust timeline container height dynamically
      timelineVisual.style.height = `${Math.max(60, rowCount * 28 + 20)}px`;
    }
  }
  
  // Render table checklist body
  const tbody = document.getElementById('daily-shifts-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    
    if (dayShifts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-muted" style="text-align: center; padding: 24px;">
            No shifts scheduled for this date.
          </td>
        </tr>
      `;
    } else {
      dayShifts.forEach(s => {
        const emp = state.employees.find(e => e.id === s.employeeId);
        const empName = emp ? emp.name : '<span style="color:var(--text-danger);"><i class="fa-solid fa-triangle-exclamation"></i> Unassigned</span>';
        const empRole = emp ? emp.role : 'N/A';
        const roleColor = state.roles.find(r => r.name.toLowerCase() === s.role.toLowerCase())?.color || '#ef4444';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding-left: 16px; font-weight: 500;">
            <div>${empName}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400;">${empRole}</div>
          </td>
          <td style="text-align: center; font-weight: 600;">
            <i class="fa-regular fa-clock" style="margin-right: 4px; color: var(--accent-cyan);"></i> ${s.startTime} - ${s.endTime}
          </td>
          <td style="text-align: center;">
            <span class="badge" style="background: rgba(${hexToRgb(roleColor)}, 0.12); color: ${roleColor}; border: 1px solid rgba(${hexToRgb(roleColor)}, 0.25); font-weight: 600;">
              ${s.role}
            </span>
          </td>
          <td style="padding-left: 16px; font-size: 0.85rem; color: var(--text-muted); font-style: ${s.notes ? 'normal' : 'italic'};">
            ${s.notes ? s.notes : 'No special notes/instructions for this shift.'}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }
}
window.renderDailyPanel = renderDailyPanel;


