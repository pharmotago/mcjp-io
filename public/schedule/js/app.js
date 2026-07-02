/**
 * BriskSchedules Upgraded Core Frontend Application Logic
 */

// Application State
let state = {
  currentTab: 'dashboard',
  currentWeekStart: null, // Date object (Monday)
  employees: [],
  shifts: [],
  timecards: [],
  leaveRequests: [],
  settings: {},
  currentUser: null // Stores session user
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// On Page Load
document.addEventListener('DOMContentLoaded', async () => {
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

  // Listen for real-time Firebase changes
  window.addEventListener('brisk-db-updated', () => {
    loadDataFromState();
    renderActivePanel();
  });
});

// Boot the application: load data and apply role-based views
async function bootApplication() {
  // Show app layout, hide login
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-root').style.display = 'grid';

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
}

function loadDataFromState() {
  state.employees = BriskDB.getEmployees();
  state.shifts = BriskDB.getShifts();
  state.timecards = BriskDB.getTimecards();
  state.leaveRequests = BriskDB.getLeaveRequests();
  state.settings = BriskDB.getSettings();

  document.getElementById('sidebar-company-name').textContent = state.settings.companyName || 'Amcal Pharmacy Woywoy Rosters';
  document.getElementById('settings-company-name').value = state.settings.companyName || 'Amcal Pharmacy Woywoy Rosters';
}

// Role-Based UI visibility
function applyRoleAccessControl() {
  const role = state.currentUser.role;

  const menuEmployees = document.getElementById('menu-employees');
  const menuReports = document.getElementById('menu-reports');
  const menuSettings = document.getElementById('menu-settings');
  const schedulerControls = document.getElementById('scheduler-manager-controls');
  const quickActionsCard = document.getElementById('dash-quick-actions-card');
  const clockTerminalDesc = document.getElementById('clock-terminal-description');
  const clockEmpSelect = document.getElementById('clock-emp-select');
  const adminPanel = document.getElementById('timeclock-admin-panel');
  const leaveSelectorGroup = document.getElementById('leave-employee-selector-group');

  if (role === 'employee') {
    // Hide manager menus
    if (menuEmployees) menuEmployees.classList.add('hide');
    if (menuReports) menuReports.classList.add('hide');
    if (menuSettings) menuSettings.classList.add('hide');
    if (schedulerControls) schedulerControls.classList.add('hide');
    if (quickActionsCard) quickActionsCard.classList.add('hide');
    if (adminPanel) adminPanel.classList.add('hide');
    if (leaveSelectorGroup) leaveSelectorGroup.classList.add('hide');

    // Restrict clock actions only to self
    if (clockTerminalDesc) clockTerminalDesc.textContent = 'Register your clock stamps here.';
    if (clockEmpSelect) {
      clockEmpSelect.disabled = true;
    }
  } else {
    // Show manager menus
    if (menuEmployees) menuEmployees.classList.remove('hide');
    if (menuReports) menuReports.classList.remove('hide');
    if (menuSettings) menuSettings.classList.remove('hide');
    if (schedulerControls) schedulerControls.classList.remove('hide');
    if (quickActionsCard) quickActionsCard.classList.remove('hide');
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

  // Toggle active class on menu buttons
  document.querySelectorAll('.menu-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Toggle active class on panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    if (panel.id === `panel-${tabName}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Set Panel Title Header
  const titles = {
    dashboard: 'Dashboard',
    scheduler: 'Scheduler',
    employees: 'Employees',
    timeclock: 'Time Clock',
    timeoff: 'Time Off',
    reports: 'Reports & Payroll',
    settings: 'Data & Backup'
  };
  document.getElementById('current-panel-title').textContent = titles[tabName] || 'Dashboard';

  // Render active panel
  renderActivePanel();
}

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
    alert(res.error);
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
    alert(res.error);
    return;
  }

  alert('Registration successful! Logging you in...');
  const sessionData = {
    ...res.user,
    token: res.token
  };
  BriskDB.setSession(sessionData);
  state.currentUser = sessionData;
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
  const email = document.getElementById('invite-email').value;
  const role = document.getElementById('invite-role').value;

  const res = await BriskDB.apiGenerateInvite(email, role);

  if (res.error) {
    alert(res.error);
    return;
  }

  document.getElementById('invite-code-val').textContent = res.code;
  document.getElementById('invite-url-val').value = res.inviteUrl;
  document.getElementById('invite-result-box').classList.remove('hide');
  document.getElementById('invite-form').reset();
}

function copyInviteUrl() {
  const urlEl = document.getElementById('invite-url-val');
  urlEl.select();
  document.execCommand('copy');
  alert('Invitation link copied to clipboard!');
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
  return `${dayName}, ${m} ${d}, ${y}`;
}

function getWeekRangeText(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d) => {
    return `${MONTH_NAMES[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  };
  return `${formatDate(monday)} - ${formatDate(sunday)}`;
}

function setupWeekPickers() {
  document.getElementById('btn-prev-week').addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
    renderScheduler();
  });
  document.getElementById('btn-next-week').addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
    renderScheduler();
  });

  document.getElementById('btn-report-prev-week').addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
    renderReportsPanel();
  });
  document.getElementById('btn-report-next-week').addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
    renderReportsPanel();
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

  const tbody = document.getElementById('dash-today-shifts');
  tbody.innerHTML = '';

  if (todayShifts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;">No shifts scheduled for today.</td></tr>`;
    return;
  }

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
    
    const elId = `head-date-${(i + 1) % 7}`;
    const headerEl = document.getElementById(elId);
    if (headerEl) {
      headerEl.textContent = `${mm}/${dd}`;
    }
  }

  const tbody = document.getElementById('scheduler-grid-body');
  tbody.innerHTML = '';

  const activeEmployees = state.employees.filter(e => e.active);

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
      
      const d = new Date(state.currentWeekStart);
      d.setDate(state.currentWeekStart.getDate() + i);
      const dateStr = formatDateISO(d);
      
      const cellShifts = state.shifts.filter(s => s.employeeId === emp.id && s.date === dateStr);
      cellShifts.forEach(shift => {
        const div = document.createElement('div');
        div.className = 'shift-card';
        div.innerHTML = `
          <div class="shift-card-header">${shift.role}</div>
          <div class="shift-card-time"><i class="fa-regular fa-clock"></i> ${shift.startTime} - ${shift.endTime}</div>
          ${shift.notes ? `<div class="shift-card-notes">${shift.notes}</div>` : ''}
        `;
        if (state.currentUser.role !== 'employee') {
          div.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditShiftModal(shift);
          });
        }
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
      
      const d = new Date(state.currentWeekStart);
      d.setDate(state.currentWeekStart.getDate() + i);
      const dateStr = formatDateISO(d);

      const cellShifts = state.shifts.filter(s => s.employeeId === null && s.date === dateStr);
      cellShifts.forEach(shift => {
        const div = document.createElement('div');
        div.className = 'shift-card unassigned';
        div.innerHTML = `
          <div class="shift-card-header">${shift.role}</div>
          <div class="shift-card-time">${shift.startTime} - ${shift.endTime}</div>
          ${shift.notes ? `<div class="shift-card-notes">${shift.notes}</div>` : ''}
        `;
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditShiftModal(shift);
        });
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
}

function calculateEmployeeWeekHours(employeeId, weekStart) {
  const mon = new Date(weekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  mon.setHours(0,0,0,0);
  sun.setHours(23,59,59,999);

  const empShifts = state.shifts.filter(s => {
    if (s.employeeId !== employeeId) return false;
    const sDate = new Date(s.date);
    sDate.setHours(0,0,0,0);
    return sDate >= mon && sDate <= sun;
  });

  let total = 0;
  empShifts.forEach(s => {
    total += BriskScheduler.getShiftDuration(s.startTime, s.endTime);
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

  weekShifts.forEach(s => {
    s.employeeId = null;
  });

  await BriskDB.syncToServer();
  renderScheduler();
}

async function triggerAutoScheduler() {
  const targetWeekStr = formatDateISO(state.currentWeekStart);
  const result = BriskScheduler.run(state.shifts, state.employees, state.leaveRequests, targetWeekStr);
  
  if (result.success) {
    state.shifts = result.shifts;
    await BriskDB.syncToServer();
    renderScheduler();
    
    alert(`📅 Auto-Scheduler Complete!\n\n- Shifts successfully assigned: ${result.assignedCount}\n- Shifts left unassigned: ${result.unassignedCount}\n\n[Placement Logs]\n${result.logs.slice(0, 10).join('\n')}\n${result.logs.length > 10 ? '...and more' : ''}`);
  } else {
    alert(result.message);
  }
}

/* ==========================================================================
   MODAL: SHIFT ADD/EDIT FORM
   ========================================================================== */

function openAddShiftModal(employeeId = '', dateStr = '') {
  document.getElementById('shift-modal-title').textContent = 'Add New Shift';
  document.getElementById('shift-id').value = '';
  document.getElementById('shift-role').value = '';
  document.getElementById('shift-notes').value = '';
  document.getElementById('btn-delete-shift').classList.add('hide');

  document.getElementById('shift-date').value = dateStr || formatDateISO(new Date());
  document.getElementById('shift-start').value = '09:00';
  document.getElementById('shift-end').value = '17:00';

  const select = document.getElementById('shift-employee');
  select.innerHTML = '<option value="">-- Unassigned --</option>';
  
  state.employees.filter(e => e.active).forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `${emp.name} (${emp.role})`;
    if (emp.id === employeeId) opt.selected = true;
    select.appendChild(opt);
  });

  document.getElementById('modal-shift').classList.add('active');
}

function openEditShiftModal(shift) {
  document.getElementById('shift-modal-title').textContent = 'Edit Shift';
  document.getElementById('shift-id').value = shift.id;
  document.getElementById('shift-role').value = shift.role;
  document.getElementById('shift-date').value = shift.date;
  document.getElementById('shift-start').value = shift.startTime;
  document.getElementById('shift-end').value = shift.endTime;
  document.getElementById('shift-notes').value = shift.notes || '';
  
  document.getElementById('btn-delete-shift').classList.remove('hide');

  const select = document.getElementById('shift-employee');
  select.innerHTML = '<option value="">-- Unassigned --</option>';
  
  state.employees.filter(e => e.active).forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `${emp.name} (${emp.role})`;
    if (emp.id === shift.employeeId) opt.selected = true;
    select.appendChild(opt);
  });

  document.getElementById('modal-shift').classList.add('active');
}

function closeShiftModal() {
  document.getElementById('modal-shift').classList.remove('active');
}

async function handleShiftSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('shift-id').value;
  const empId = document.getElementById('shift-employee').value || null;
  const role = document.getElementById('shift-role').value;
  const date = document.getElementById('shift-date').value;
  const start = document.getElementById('shift-start').value;
  const end = document.getElementById('shift-end').value;
  const notes = document.getElementById('shift-notes').value;

  if (start >= end) {
    alert('Start time must be earlier than end time.');
    return;
  }

  if (empId && checkLeaveStatus(empId, date)) {
    if (!confirm('This employee has an approved leave request on this date. Force schedule this shift anyway?')) {
      return;
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
  } else {
    await BriskDB.addShift(shiftData);
  }

  closeShiftModal();
  renderActivePanel();
}

async function handleShiftDelete() {
  const id = document.getElementById('shift-id').value;
  if (id && confirm('Delete this shift permanently?')) {
    await BriskDB.deleteShift(id);
    closeShiftModal();
    renderActivePanel();
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
    container.innerHTML = `<div class="glass-card text-center text-muted" style="grid-column: 1/-1; padding: 3rem;">No active employees found.</div>`;
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
        <span>Rate: <strong>$${emp.hourlyRate.toFixed(2)} / hr</strong></span>
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
  document.getElementById('emp-role').value = '';
  document.getElementById('emp-email').value = '';
  document.getElementById('emp-rate').value = '';
  document.getElementById('emp-max-hours').value = '38';
  document.getElementById('btn-delete-employee').classList.add('hide');

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
  document.getElementById('emp-role').value = emp.role;
  document.getElementById('emp-email').value = emp.email;
  document.getElementById('emp-rate').value = emp.hourlyRate;
  document.getElementById('emp-max-hours').value = emp.maxHours;
  
  if (emp.id === state.currentUser.employeeId) {
    document.getElementById('btn-delete-employee').classList.add('hide'); 
  } else {
    document.getElementById('btn-delete-employee').classList.remove('hide');
  }

  renderAvailabilityFormInputs(emp.availability);

  document.getElementById('modal-employee').classList.add('active');
}

function closeEmployeeModal() {
  document.getElementById('modal-employee').classList.remove('active');
}

async function handleEmployeeSubmit(event) {
  event.preventDefault();

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
        alert(`Availability times for ${DAY_NAMES[i]} are invalid.`);
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

  if (id) {
    employeeData.id = id;
    await BriskDB.updateEmployee(employeeData);
  } else {
    await BriskDB.addEmployee(employeeData);
  }

  closeEmployeeModal();
  renderActivePanel();
}

async function handleEmployeeDelete() {
  const id = document.getElementById('employee-id').value;
  if (id && confirm('Delete this employee permanently? The shifts assigned to them will be unassigned.')) {
    state.shifts.forEach(s => {
      if (s.employeeId === id) s.employeeId = null;
    });
    await BriskDB.saveShifts(state.shifts);
    await BriskDB.deleteEmployee(id);
    closeEmployeeModal();
    renderActivePanel();
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

  // Populate leave request select dropdown
  const leaveSelect = document.getElementById('leave-emp-select');
  leaveSelect.innerHTML = '';
  
  if (role === 'employee') {
    const opt = document.createElement('option');
    opt.value = state.currentUser.employeeId;
    opt.textContent = state.currentUser.name;
    opt.selected = true;
    leaveSelect.appendChild(opt);
  } else {
    state.employees.filter(e => e.active).forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.name;
      if (emp.id === state.currentUser.employeeId) opt.selected = true;
      leaveSelect.appendChild(opt);
    });
  }

  updateTerminalStatus();
  renderAdminTimesheets();
}

function updateTerminalStatus() {
  const empId = document.getElementById('clock-emp-select').value;
  if (!empId) return;

  const todayStr = formatDateISO(new Date());
  const tc = state.timecards.find(t => t.employeeId === empId && t.date === todayStr);

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

  const todayStr = formatDateISO(new Date());
  let tc = state.timecards.find(t => t.employeeId === empId && t.date === todayStr);

  const nowISO = new Date().toISOString();

  if (action === 'in') {
    if (tc) return;
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
  } else if (action === 'out') {
    if (!tc || tc.clockOut) return;
    
    const lastBreak = tc.breaks[tc.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = nowISO;
    }

    tc.clockOut = nowISO;
    tc.totalHours = calculateTimecardHours(tc);
    await BriskDB.updateTimecard(tc);
  } else if (action === 'break-start') {
    if (!tc || tc.clockOut) return;
    tc.breaks.push({
      start: nowISO,
      end: null
    });
    await BriskDB.updateTimecard(tc);
  } else if (action === 'break-end') {
    if (!tc || tc.clockOut) return;
    const lastBreak = tc.breaks[tc.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = nowISO;
    }
    await BriskDB.updateTimecard(tc);
  }

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
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">No timesheets recorded this week.</td></tr>`;
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
      statusHtml = `<span class="badge badge-warning">Pending</span>`;
      actionHtml = `
        <button class="btn btn-success" style="padding:4px 8px; font-size:11px;" onclick="approveTimecard('${tc.id}')">
          Approve
        </button>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tc.date}</td>
      <td><strong>${empName}</strong></td>
      <td>${formatTimeHM(tc.clockIn)}</td>
      <td>${formatTimeHM(tc.clockOut)}</td>
      <td>
        <input type="number" step="0.1" value="${tc.totalHours}" class="form-control" style="width:75px; padding:3px 6px; display:inline;" id="tc-input-hours-${tc.id}" onchange="changeTimecardHours('${tc.id}', this.value)" ${tc.approved ? 'disabled' : ''}> h
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

async function changeTimecardHours(tcId, newVal) {
  const tc = state.timecards.find(t => t.id === tcId);
  if (!tc) return;

  const hours = parseFloat(newVal);
  if (isNaN(hours) || hours < 0) {
    alert('Please enter a valid hours count.');
    return;
  }

  tc.totalHours = hours;
  await BriskDB.updateTimecard(tc);
  loadDataFromState();
}


/* ==========================================================================
   PANEL: TIME OFF REQUESTS
   ========================================================================== */

function renderTimeOffPanel() {
  const tbody = document.getElementById('leave-table-body');
  tbody.innerHTML = '';

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
    tbody.innerHTML = `<tr><td colspan="${isManager ? 5 : 4}" class="text-center text-muted" style="padding: 2rem;">No leave requests filed.</td></tr>`;
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
        <button class="btn btn-success" style="padding: 4px 8px; font-size:11px;" onclick="decideLeaveRequest('${req.id}', 'Approved')">Approve</button>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size:11px;" onclick="decideLeaveRequest('${req.id}', 'Rejected')">Reject</button>
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
    alert('End date cannot be earlier than start date.');
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
      alert(`⚠️ Roster Conflict Warning: Leave approved.\nHowever, this employee already has ${conflictingShifts.length} shifts scheduled during this leave period. Please adjust their roster shifts.`);
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
  let totalSchedCostSum = 0;
  let totalActualCostSum = 0;

  const activeEmployees = state.employees.filter(e => e.active);

  activeEmployees.forEach(emp => {
    const empWeekHours = calculateEmployeeWeekHours(emp.id, state.currentWeekStart);
    const expectedCost = empWeekHours * emp.hourlyRate;

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
    const actualCost = actualHours * emp.hourlyRate;

    totalSchedHoursSum += empWeekHours;
    totalActualHoursSum += actualHours;
    totalSchedCostSum += expectedCost;
    totalActualCostSum += actualCost;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${emp.name}</strong> <span class="text-muted" style="font-size:11px;">(${emp.role})</span></td>
      <td class="text-right">$${emp.hourlyRate.toFixed(2)}</td>
      <td class="text-right">${empWeekHours.toFixed(1)}h</td>
      <td class="text-right">${actualHours.toFixed(1)}h</td>
      <td class="text-right">$${expectedCost.toFixed(2)}</td>
      <td class="text-right text-neon">$${actualCost.toFixed(2)}</td>
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
  document.getElementById('rep-total-sched-cost').textContent = `$${totalSchedCostSum.toFixed(2)}`;
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

  const res = await BriskDB.apiSendRosterEmail(empId, weekStart, text);

  btn.disabled = false;
  btn.innerHTML = originalText;

  if (res.error) {
    alert(`Error: ${res.error}`);
  } else {
    alert(res.message);
    closeEmailRosterModal();
  }
}

// Generate full roster briefing to copy
function openEmailScheduleModal() {
  const area = document.getElementById('email-schedule-textarea');
  const mon = new Date(state.currentWeekStart);
  let text = `Hi Team,\nHere is the roster schedule for the week of ${getWeekRangeText(mon)}:\n\n`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const dateStr = formatDateISO(d);
    
    text += `📅 [${DAY_NAMES[d.getDay()]}] ${dateStr}\n`;
    
    const dayShifts = state.shifts.filter(s => s.date === dateStr);
    if (dayShifts.length === 0) {
      text += ` - No shifts scheduled\n`;
    } else {
      dayShifts.forEach(s => {
        const emp = state.employees.find(e => e.id === s.employeeId);
        const name = emp ? emp.name : '⚠️ Unassigned';
        text += ` - ${s.startTime} ~ ${s.endTime} : ${name} (${s.role}) ${s.notes ? `[Notes: ${s.notes}]` : ''}\n`;
      });
    }
    text += `\n`;
  }

  text += `Please check your shifts and make sure to clock in/out on time. Contact management for any shift swap inquiries.\nThanks!`;
  
  area.value = text;
  document.getElementById('modal-email-schedule').classList.add('active');
}

function closeEmailScheduleModal() {
  document.getElementById('modal-email-schedule').classList.remove('active');
}

function copyEmailScheduleText() {
  const area = document.getElementById('email-schedule-textarea');
  area.select();
  document.execCommand('copy');
  alert(' Roster schedule text copied to clipboard!');
  closeEmailScheduleModal();
}


/* ==========================================================================
   PANEL: SETTINGS & DATABASE
   ========================================================================== */

async function saveCompanySetting() {
  const name = document.getElementById('settings-company-name').value;
  if (!name.trim()) return;

  state.settings.companyName = name;
  BriskDB.saveSettings(state.settings);
  
  loadDataFromState();
  alert('Organization name saved.');
}

function exportDatabaseFile() {
  const jsonStr = BriskDB.exportData();
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
window.openEmailScheduleModal = openEmailScheduleModal;
window.closeEmailScheduleModal = closeEmailScheduleModal;
window.copyEmailScheduleText = copyEmailScheduleText;
window.copyInviteUrl = copyInviteUrl;
window.exportDatabaseFile = exportDatabaseFile;
window.saveCompanySetting = saveCompanySetting;
window.toggleAvailTimeInputs = toggleAvailTimeInputs;
