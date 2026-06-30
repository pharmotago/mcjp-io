/**
 * BriskSchedules Core Frontend Application Logic
 */

// Application State
let state = {
  currentTab: 'dashboard',
  currentWeekStart: null, // Date object (Monday)
  employees: [],
  shifts: [],
  timecards: [],
  leaveRequests: [],
  settings: {}
};

// Map day index to English names
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Database
  BriskDB.init();
  
  // Set current week to this week
  state.currentWeekStart = getMondayOfCurrentWeek(new Date());
  
  // Load State from Database
  loadDataFromDB();

  // Setup Sidebar Tab Events
  document.querySelectorAll('.menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Setup Week Pickers
  setupWeekPickers();
  
  // Initialize Clock in Header
  startLiveClock();
  
  // Render current panel
  renderActivePanel();

  // Bind DB import file handler
  document.getElementById('database-import-file').addEventListener('change', handleDatabaseImportChange);
});

// Load all arrays from DB
function loadDataFromDB() {
  state.employees = BriskDB.getEmployees();
  state.shifts = BriskDB.getShifts();
  state.timecards = BriskDB.getTimecards();
  state.leaveRequests = BriskDB.getLeaveRequests();
  state.settings = BriskDB.getSettings();

  // Update UI Elements
  document.getElementById('sidebar-company-name').textContent = state.settings.companyName || 'Brisk Pharmacy Group';
  document.getElementById('settings-company-name').value = state.settings.companyName || 'Brisk Pharmacy Group';
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
  // Always refresh lists in case DB modified
  loadDataFromDB();

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
      // Elements loaded in loadDataFromDB
      break;
  }
}

/* ==========================================================================
   DATE HELPER FUNCTIONS
   ========================================================================== */

function getMondayOfCurrentWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const mon = new Date(date.setDate(diff));
  mon.setHours(0,0,0,0);
  return mon;
}

function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

function getFormattedDateString(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getWeekRangeText(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d) => {
    const month = MONTH_NAMES[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  };
  return `${formatDate(monday)} - ${formatDate(sunday)}`;
}

// Set up week selection buttons
function setupWeekPickers() {
  // Scheduler week picker
  document.getElementById('btn-prev-week').addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
    renderScheduler();
  });
  document.getElementById('btn-next-week').addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
    renderScheduler();
  });

  // Report week picker
  document.getElementById('btn-report-prev-week').addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
    renderReportsPanel();
  });
  document.getElementById('btn-report-next-week').addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
    renderReportsPanel();
  });

  // Bind auto scheduler click
  document.getElementById('btn-auto-schedule').addEventListener('click', triggerAutoScheduler);
  document.getElementById('btn-clear-week').addEventListener('click', triggerClearWeek);
}

// Header live time tick
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
  const todayStr = formatDateISO(new Date());
  document.getElementById('dash-today-date').textContent = todayStr;

  // Active employees count
  const activeEmployees = state.employees.filter(e => e.active);
  document.getElementById('dash-emp-count').textContent = `${activeEmployees.length} Employee${activeEmployees.length !== 1 ? 's' : ''}`;

  // Filter shifts for this week
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
  document.getElementById('dash-shifts-count').textContent = `${weekShifts.length} Shift${weekShifts.length !== 1 ? 's' : ''}`;

  // Active clock ins count
  const todayActiveClockins = state.timecards.filter(tc => {
    return tc.date === todayStr && tc.clockIn && !tc.clockOut;
  });
  document.getElementById('dash-active-clockins').textContent = `${todayActiveClockins.length} Employee${todayActiveClockins.length !== 1 ? 's' : ''}`;

  // Pending leave requests count
  const pendingLeaves = state.leaveRequests.filter(r => r.status === 'Pending');
  document.getElementById('dash-pending-leaves').textContent = `${pendingLeaves.length} Request${pendingLeaves.length !== 1 ? 's' : ''}`;

  // Render today's shift list
  const todayShifts = state.shifts.filter(s => s.date === todayStr);
  const tbody = document.getElementById('dash-today-shifts');
  tbody.innerHTML = '';

  if (todayShifts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;">No shifts scheduled for today.</td></tr>`;
    return;
  }

  todayShifts.forEach(shift => {
    const emp = state.employees.find(e => e.id === shift.employeeId);
    const empName = emp ? emp.name : '<span class="text-danger">Unassigned</span>';
    
    // Check clock in status for today
    let statusBadge = '<span class="badge">Not Clocked In</span>';
    if (emp) {
      const tc = state.timecards.find(t => t.employeeId === emp.id && t.date === todayStr);
      if (tc) {
        if (tc.clockOut) {
          statusBadge = '<span class="badge badge-success">Clocked Out</span>';
        } else if (tc.breaks.length > 0 && tc.breaks[tc.breaks.length - 1].start && !tc.breaks[tc.breaks.length - 1].end) {
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

  // Set header column dates
  for (let i = 0; i < 7; i++) {
    const d = new Date(state.currentWeekStart);
    d.setDate(state.currentWeekStart.getDate() + i);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    // Grid Header elements: head-date-1 (Mon), head-date-2 (Tue)... head-date-0 (Sun)
    const elId = `head-date-${(i + 1) % 7}`;
    const headerEl = document.getElementById(elId);
    if (headerEl) {
      headerEl.textContent = `${mm}/${dd}`;
    }
  }

  const tbody = document.getElementById('scheduler-grid-body');
  tbody.innerHTML = '';

  // Get active employees list
  const activeEmployees = state.employees.filter(e => e.active);

  // Generate a row for each employee
  activeEmployees.forEach(emp => {
    const tr = document.createElement('tr');
    
    // First column: Profile details
    const tdProfile = document.createElement('td');
    tdProfile.className = 'grid-employee-cell';
    
    // Calculate total scheduled hours for this employee this week
    const empWeekHours = calculateEmployeeWeekHours(emp.id, state.currentWeekStart);

    tdProfile.innerHTML = `
      <span class="grid-emp-name" onclick="openEditEmployeeModal('${emp.id}')" style="cursor:pointer; text-decoration: underline;">${emp.name}</span>
      <span class="grid-emp-role">${emp.role}</span>
      <span class="grid-emp-hours"><i class="fa-solid fa-clock"></i> ${empWeekHours.toFixed(1)}h / ${emp.maxHours}h</span>
    `;
    tr.appendChild(tdProfile);

    // Seven weekday columns (Mon = index 0, ..., Sun = index 6)
    for (let i = 0; i < 7; i++) {
      const tdDay = document.createElement('td');
      tdDay.className = 'calendar-grid-cell';
      
      const d = new Date(state.currentWeekStart);
      d.setDate(state.currentWeekStart.getDate() + i);
      const dateStr = formatDateISO(d);
      
      // Render shifts in cell
      const cellShifts = state.shifts.filter(s => s.employeeId === emp.id && s.date === dateStr);
      cellShifts.forEach(shift => {
        const div = document.createElement('div');
        div.className = 'shift-card';
        div.innerHTML = `
          <div class="shift-card-header">${shift.role}</div>
          <div class="shift-card-time"><i class="fa-regular fa-clock"></i> ${shift.startTime} - ${shift.endTime}</div>
          ${shift.notes ? `<div class="shift-card-notes">${shift.notes}</div>` : ''}
        `;
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditShiftModal(shift);
        });
        tdDay.appendChild(div);
      });

      // Check if employee is on approved leave
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
      } else {
        // Render add button
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

  // Render one more row for Unassigned shifts
  const trUnassigned = document.createElement('tr');
  const tdUnassignedProfile = document.createElement('td');
  tdUnassignedProfile.className = 'grid-employee-cell';
  tdUnassignedProfile.style.background = 'rgba(231, 76, 60, 0.05)';
  tdUnassignedProfile.innerHTML = `
    <span class="grid-emp-name text-danger">⚠️ Unassigned Shift</span>
    <span class="grid-emp-role">Pending employee assignment</span>
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

// Calculate total hours scheduled for an employee in a week
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

// Helper: check if employee is on leave on date
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

// Trigger Clear Week
function triggerClearWeek() {
  if (!confirm('Are you sure you want to clear all employee assignments for the current week?')) return;

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

  BriskDB.saveShifts(state.shifts);
  renderScheduler();
}

// Run client-side Auto-Scheduling engine
function triggerAutoScheduler() {
  const targetWeekStr = formatDateISO(state.currentWeekStart);
  
  // Execute algorithm
  const result = BriskScheduler.run(state.shifts, state.employees, state.leaveRequests, targetWeekStr);
  
  if (result.success) {
    BriskDB.saveShifts(result.shifts);
    loadDataFromDB();
    renderScheduler();
    
    // Print logic log inside a visual alerts box
    alert(`📅 Auto-Scheduler Complete!\n\n- Successfully assigned shifts: ${result.assignedCount}\n- Unassigned shifts remaining: ${result.unassignedCount}\n\n[Detailed Placement Logs]\n${result.logs.slice(0, 10).join('\n')}\n${result.logs.length > 10 ? '...truncated' : ''}`);
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

  // Populate date
  document.getElementById('shift-date').value = dateStr || formatDateISO(new Date());
  
  // Set default hours
  document.getElementById('shift-start').value = '09:00';
  document.getElementById('shift-end').value = '17:00';

  // Populate Employee Dropdown
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

  // Populate Employee Dropdown
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

function handleShiftSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('shift-id').value;
  const empId = document.getElementById('shift-employee').value || null;
  const role = document.getElementById('shift-role').value;
  const date = document.getElementById('shift-date').value;
  const start = document.getElementById('shift-start').value;
  const end = document.getElementById('shift-end').value;
  const notes = document.getElementById('shift-notes').value;

  // Basic validation check
  if (start >= end) {
    alert('Start time must be before end time.');
    return;
  }

  // Check if employee is on leave on this date
  if (empId && checkLeaveStatus(empId, date)) {
    if (!confirm('This employee has approved leave on this date. Are you sure you want to force schedule this shift?')) {
      return;
    }
  }

  // Check if scheduled hours exceed max hours limit
  if (empId) {
    const emp = state.employees.find(e => e.id === empId);
    const duration = BriskScheduler.getShiftDuration(start, end);
    const currentWeekHours = calculateEmployeeWeekHours(empId, getMondayOfCurrentWeek(new Date(date)));
    
    // If it's an edit, subtract the previous shift duration first
    let prevDuration = 0;
    if (id) {
      const prevShift = state.shifts.find(s => s.id === id);
      if (prevShift && prevShift.employeeId === empId) {
        prevDuration = BriskScheduler.getShiftDuration(prevShift.startTime, prevShift.endTime);
      }
    }

    if (currentWeekHours - prevDuration + duration > emp.maxHours) {
      if (!confirm(`Adding this shift will exceed ${emp.name}'s maximum weekly hours (${emp.maxHours}h). Do you want to proceed?`)) {
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
    // Edit existing
    shiftData.id = id;
    BriskDB.updateShift(shiftData);
  } else {
    // Create new
    BriskDB.addShift(shiftData);
  }

  closeShiftModal();
  renderActivePanel();
}

function handleShiftDelete() {
  const id = document.getElementById('shift-id').value;
  if (id && confirm('Are you sure you want to delete this shift?')) {
    BriskDB.deleteShift(id);
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
    container.innerHTML = `<div class="glass-card text-center text-muted" style="grid-column: 1/-1; padding: 3rem;">No registered employees found matching the criteria.</div>`;
    return;
  }

  filtered.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'employee-card';

    // Build availability visual dots
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
        <span>Hourly Rate: <strong>$${emp.hourlyRate.toFixed(2)} / hr</strong></span>
        <span>Weekly Limit: <strong>${emp.maxHours} hrs/week</strong></span>
      </div>
      <div class="employee-card-avail">
        <span>Weekly Availability:</span>
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

// Generate the day-by-day availability selector fields inside Employee modal
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
  document.getElementById('employee-modal-title').textContent = 'Add New Employee';
  document.getElementById('employee-id').value = '';
  document.getElementById('emp-name').value = '';
  document.getElementById('emp-role').value = '';
  document.getElementById('emp-email').value = '';
  document.getElementById('emp-rate').value = '';
  document.getElementById('emp-max-hours').value = '38';
  document.getElementById('btn-delete-employee').classList.add('hide');

  // Default availability: Mon-Fri active, Sun/Sat unavailable
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

  document.getElementById('employee-modal-title').textContent = 'Edit Employee Details';
  document.getElementById('employee-id').value = emp.id;
  document.getElementById('emp-name').value = emp.name;
  document.getElementById('emp-role').value = emp.role;
  document.getElementById('emp-email').value = emp.email;
  document.getElementById('emp-rate').value = emp.hourlyRate;
  document.getElementById('emp-max-hours').value = emp.maxHours;
  
  // Protect system accounts or allow delete
  if (emp.id === 'emp_1') {
    document.getElementById('btn-delete-employee').classList.add('hide'); // Cannot delete primary owner
  } else {
    document.getElementById('btn-delete-employee').classList.remove('hide');
  }

  renderAvailabilityFormInputs(emp.availability);

  document.getElementById('modal-employee').classList.add('active');
}

function closeEmployeeModal() {
  document.getElementById('modal-employee').classList.remove('active');
}

function handleEmployeeSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('employee-id').value;
  const name = document.getElementById('emp-name').value;
  const role = document.getElementById('emp-role').value;
  const email = document.getElementById('emp-email').value;
  const hourlyRate = parseFloat(document.getElementById('emp-rate').value);
  const maxHours = parseInt(document.getElementById('emp-max-hours').value);

  // Extract day-by-day Availability inputs
  const availability = {};
  for (let i = 0; i < 7; i++) {
    const isChecked = document.getElementById(`avail-check-${i}`).checked;
    if (isChecked) {
      const start = document.getElementById(`avail-start-${i}`).value;
      const end = document.getElementById(`avail-end-${i}`).value;
      
      if (start >= end) {
        alert(`Invalid availability time on ${DAY_NAMES[i]} (Start time cannot be after end time).`);
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
    BriskDB.updateEmployee(employeeData);
  } else {
    BriskDB.addEmployee(employeeData);
  }

  closeEmployeeModal();
  renderActivePanel();
}

function handleEmployeeDelete() {
  const id = document.getElementById('employee-id').value;
  if (id && confirm('Are you sure you want to completely delete this employee from the database?\nAny scheduled shifts for this employee will be set to unassigned.')) {
    
    // Clear employee shifts
    state.shifts.forEach(s => {
      if (s.employeeId === id) s.employeeId = null;
    });
    BriskDB.saveShifts(state.shifts);

    // Delete employee
    BriskDB.deleteEmployee(id);
    closeEmployeeModal();
    renderActivePanel();
  }
}


/* ==========================================================================
   PANEL: TIME CLOCK
   ========================================================================== */

function renderTimeClockPanel() {
  // Populate dropdowns
  const select = document.getElementById('clock-emp-select');
  select.innerHTML = '';
  
  state.employees.filter(e => e.active).forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `${emp.name} (${emp.role})`;
    select.appendChild(opt);
  });

  // Load employee for leave select dropdown as well
  const leaveSelect = document.getElementById('leave-emp-select');
  leaveSelect.innerHTML = '';
  state.employees.filter(e => e.active).forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = emp.name;
    leaveSelect.appendChild(opt);
  });

  // Refresh status
  updateTerminalStatus();

  // Render weekly admin timesheet reviewer table
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

  // Clear disabled states
  btnIn.disabled = false;
  btnOut.disabled = false;
  btnBStart.disabled = false;
  btnBEnd.disabled = false;

  if (!tc) {
    // Clocked Out (No record today)
    dot.className = 'status-indicator status-offline';
    txt.textContent = 'Not Clocked In';
    sub.textContent = 'No clock-in record for today.';

    btnOut.disabled = true;
    btnBStart.disabled = true;
    btnBEnd.disabled = true;
  } else {
    const formatTime = (isoStr) => {
      const d = new Date(isoStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    if (tc.clockOut) {
      // Finished work
      dot.className = 'status-indicator status-offline';
      txt.textContent = 'Clocked Out';
      sub.textContent = `Shift completed today (In: ${formatTime(tc.clockIn)} ~ Out: ${formatTime(tc.clockOut)})`;

      btnIn.disabled = true;
      btnOut.disabled = true;
      btnBStart.disabled = true;
      btnBEnd.disabled = true;
    } else {
      // Active clock in
      const lastBreak = tc.breaks[tc.breaks.length - 1];
      const onBreak = lastBreak && lastBreak.start && !lastBreak.end;

      if (onBreak) {
        // Currently on break
        dot.className = 'status-indicator status-break';
        txt.textContent = 'On Break';
        sub.textContent = `Break started at: ${formatTime(lastBreak.start)}`;

        btnIn.disabled = true;
        btnOut.disabled = true;
        btnBStart.disabled = true;
      } else {
        // Clocked in and working
        dot.className = 'status-indicator status-online';
        txt.textContent = 'Working';
        sub.textContent = `Clocked in at: ${formatTime(tc.clockIn)}`;

        btnIn.disabled = true;
        btnBEnd.disabled = true;
      }
    }
  }
}

function handleClockAction(action) {
  const empId = document.getElementById('clock-emp-select').value;
  if (!empId) return;

  const todayStr = formatDateISO(new Date());
  let tc = state.timecards.find(t => t.employeeId === empId && t.date === todayStr);

  const nowISO = new Date().toISOString();

  if (action === 'in') {
    if (tc) return; // already exists
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
    BriskDB.addTimecard(tc);
  } else if (action === 'out') {
    if (!tc || tc.clockOut) return;
    
    // Close break if open
    const lastBreak = tc.breaks[tc.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = nowISO;
    }

    tc.clockOut = nowISO;
    tc.totalHours = calculateTimecardHours(tc);
    BriskDB.updateTimecard(tc);
  } else if (action === 'break-start') {
    if (!tc || tc.clockOut) return;
    tc.breaks.push({
      start: nowISO,
      end: null
    });
    BriskDB.updateTimecard(tc);
  } else if (action === 'break-end') {
    if (!tc || tc.clockOut) return;
    const lastBreak = tc.breaks[tc.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = nowISO;
    }
    BriskDB.updateTimecard(tc);
  }

  // Reload & Refresh views
  loadDataFromDB();
  updateTerminalStatus();
  renderAdminTimesheets();
}

function calculateTimecardHours(tc) {
  if (!tc.clockIn || !tc.clockOut) return 0;

  const start = new Date(tc.clockIn);
  const end = new Date(tc.clockOut);
  let diffMs = end - start;

  // Subtract break duration
  let breakMs = 0;
  tc.breaks.forEach(b => {
    if (b.start && b.end) {
      breakMs += (new Date(b.end) - new Date(b.start));
    }
  });

  const netHours = (diffMs - breakMs) / (1000 * 60 * 60);
  return Math.max(0, parseFloat(netHours.toFixed(2)));
}

// Render Manager admin review panel
function renderAdminTimesheets() {
  const tbody = document.getElementById('timesheet-table-body');
  tbody.innerHTML = '';

  // Get active timesheets for this current week range
  const mon = new Date(state.currentWeekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  mon.setHours(0,0,0,0);
  sun.setHours(23,59,59,999);

  const weekCards = state.timecards.filter(tc => {
    const tcDate = new Date(tc.date);
    tcDate.setHours(0,0,0,0);
    return tcDate >= mon && tcDate <= sun;
  });

  if (weekCards.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">No time clock records for this week.</td></tr>`;
    return;
  }

  // Sort descending by date
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
      actionHtml = `<span class="text-muted" style="font-size:12px;">Approved by: ${tc.approvedBy}</span>`;
    } else {
      statusHtml = `<span class="badge badge-warning">Pending Approval</span>`;
      actionHtml = `
        <button class="btn btn-success" style="padding:4px 8px; font-size:11px;" onclick="approveTimecard('${tc.id}')">
          Approve
        </button>
      `;
    }

    // Allow manual correction of hours if they make mistakes
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

function approveTimecard(tcId) {
  const tc = state.timecards.find(t => t.id === tcId);
  if (!tc) return;

  tc.approved = true;
  tc.approvedBy = 'Sung Joo Peter Kim';
  
  BriskDB.updateTimecard(tc);
  loadDataFromDB();
  renderAdminTimesheets();
}

function changeTimecardHours(tcId, newVal) {
  const tc = state.timecards.find(t => t.id === tcId);
  if (!tc) return;

  const hours = parseFloat(newVal);
  if (isNaN(hours) || hours < 0) {
    alert('Please enter a valid number of hours.');
    return;
  }

  tc.totalHours = hours;
  BriskDB.updateTimecard(tc);
  loadDataFromDB();
}


/* ==========================================================================
   PANEL: TIME OFF REQUESTS
   ========================================================================== */

function renderTimeOffPanel() {
  const tbody = document.getElementById('leave-table-body');
  tbody.innerHTML = '';

  const requests = [...state.leaveRequests];
  // Sort pending requests first
  requests.sort((a,b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return b.startDate.localeCompare(a.startDate);
  });

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No time off requests found.</td></tr>`;
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
      actionsHtml = `<button class="btn btn-outline" style="padding: 4px 8px; font-size:11px;" onclick="decideLeaveRequest('${req.id}', 'Pending')">Change to Pending</button>`;
    } else {
      statusBadge = '<span class="badge badge-danger">Rejected</span>';
      actionsHtml = `<button class="btn btn-outline" style="padding: 4px 8px; font-size:11px;" onclick="decideLeaveRequest('${req.id}', 'Pending')">Change to Pending</button>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${empName}</strong></td>
      <td>${req.startDate} ~ ${req.endDate}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${req.reason}</td>
      <td>${statusBadge}</td>
      <td>
        <div style="display:flex; gap: 4px;">
          ${actionsHtml}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function handleLeaveSubmit(event) {
  event.preventDefault();

  const empId = document.getElementById('leave-emp-select').value;
  const start = document.getElementById('leave-start-date').value;
  const end = document.getElementById('leave-end-date').value;
  const reason = document.getElementById('leave-reason').value;

  if (start > end) {
    alert('End date cannot be before start date.');
    return;
  }

  const req = {
    employeeId: empId,
    startDate: start,
    endDate: end,
    reason: reason
  };

  BriskDB.addLeaveRequest(req);
  document.getElementById('leave-request-form').reset();
  
  loadDataFromDB();
  renderTimeOffPanel();
}

function decideLeaveRequest(reqId, decision) {
  const req = state.leaveRequests.find(r => r.id === reqId);
  if (!req) return;

  req.status = decision;
  BriskDB.updateLeaveRequest(req);

  // If approved, verify if there are any conflicting shifts scheduled for this person
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
      alert(`⚠️ Notice: Time off has been approved.\nHowever, there are already ${conflictingShifts.length} scheduled shifts during this approved period.\nPlease manually adjust these assignments in the Scheduler tab.`);
    }
  }

  loadDataFromDB();
  renderTimeOffPanel();
}


/* ==========================================================================
   PANEL: REPORTS & PAYROLL
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
    // 1. Scheduled Hours
    const empWeekHours = calculateEmployeeWeekHours(emp.id, state.currentWeekStart);
    const expectedCost = empWeekHours * emp.hourlyRate;

    // 2. Actual Clocked & Approved Hours
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

    // Sums
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
    `;
    tbody.appendChild(tr);
  });

  // Set sums in tfoot
  document.getElementById('rep-total-sched-hours').textContent = `${totalSchedHoursSum.toFixed(1)} hrs`;
  document.getElementById('rep-total-actual-hours').textContent = `${totalActualHoursSum.toFixed(1)} hrs`;
  document.getElementById('rep-total-sched-cost').textContent = `$${totalSchedCostSum.toFixed(2)}`;
  document.getElementById('rep-total-actual-cost').textContent = `$${totalActualCostSum.toFixed(2)}`;
}

// Generate the copyable text email format for schedule briefing
function openEmailScheduleModal() {
  const area = document.getElementById('email-schedule-textarea');
  
  const mon = new Date(state.currentWeekStart);
  let text = `Hello team,\nHere is the weekly work schedule for the week of ${getWeekRangeText(mon)} from BriskSchedules.\n\n`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const dateStr = formatDateISO(d);
    
    text += `📅 [${DAY_NAMES[d.getDay()]}] ${dateStr}\n`;
    
    const dayShifts = state.shifts.filter(s => s.date === dateStr);
    if (dayShifts.length === 0) {
      text += ` - (No shifts scheduled)\n`;
    } else {
      dayShifts.forEach(s => {
        const emp = state.employees.find(e => e.id === s.employeeId);
        const name = emp ? emp.name : '⚠️ Unassigned';
        text += ` - ${s.startTime} ~ ${s.endTime} : ${name} (${s.role}) ${s.notes ? `[Note: ${s.notes}]` : ''}\n`;
      });
    }
    text += `\n`;
  }

  text += `Please check your scheduled times and make sure to use the Time Clock when clocking in and out. For any questions, please contact the manager.\nThank you.`;
  
  area.value = text;
  document.getElementById('modal-email-schedule').classList.add('active');
}

// Close modal
function closeEmailScheduleModal() {
  document.getElementById('modal-email-schedule').classList.remove('active');
}

function copyEmailScheduleText() {
  const area = document.getElementById('email-schedule-textarea');
  area.select();
  document.execCommand('copy');
  alert('Email schedule template text successfully copied to clipboard!');
  closeEmailScheduleModal();
}


/* ==========================================================================
   PANEL: SETTINGS & DATABASE
   ========================================================================== */

function saveCompanySetting() {
  const name = document.getElementById('settings-company-name').value;
  if (!name.trim()) return;

  state.settings.companyName = name;
  BriskDB.saveSettings(state.settings);
  
  // Reload
  loadDataFromDB();
  alert('Company name has been successfully saved.');
}

function resetDatabaseToDemo() {
  if (!confirm('Warning: Are you sure you want to perform a factory reset on the database?\nThis action will erase all manual data and settings, and overwrite them with the initial sample demo data.')) {
    return;
  }

  BriskDB.clearAll();
  loadDataFromDB();
  switchTab('dashboard');
  alert('Database has been successfully reset to default demo values.');
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

function handleDatabaseImportChange(e) {
  // Just updates UI or does check
}

function importDatabaseFile() {
  const fileInput = document.getElementById('database-import-file');
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select a JSON backup file to import.');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(evt) {
    const content = evt.target.result;
    const success = BriskDB.importData(content);
    if (success) {
      loadDataFromDB();
      switchTab('dashboard');
      alert('Database has been successfully restored from the backup file!');
      fileInput.value = ''; // Reset input
    } else {
      alert('Database restore failed: The JSON file format is invalid or corrupted.');
    }
  };

  reader.readAsText(file);
}
