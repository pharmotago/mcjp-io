/**
 * BriskSchedules Local Database Layer (LocalStorage-backed)
 */
const BriskDB = (function() {
  const STORAGE_KEYS = {
    EMPLOYEES: 'brisk_employees',
    SHIFTS: 'brisk_shifts',
    TIMECARDS: 'brisk_timecards',
    LEAVE_REQUESTS: 'brisk_leave_requests',
    SETTINGS: 'brisk_settings'
  };

  // Helper to save to local storage
  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Helper to load from local storage
  function load(key, defaultVal = []) {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  }

  // Initialize DB with Seed Data if empty
  function init() {
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      seedDatabase();
    }
  }

  function seedDatabase() {
    // 1. Employees Seed
    const employees = [
      {
        id: 'emp_1',
        name: 'Sung Joo Peter Kim',
        email: 'peter@mcjp.io',
        role: 'Pharmacist Manager',
        hourlyRate: 85.00,
        maxHours: 45,
        availability: {
          0: null, // Sunday
          1: { start: '08:00', end: '18:00' }, // Monday
          2: { start: '08:00', end: '18:00' },
          3: { start: '08:00', end: '18:00' },
          4: { start: '08:00', end: '18:00' },
          5: { start: '08:00', end: '18:00' },
          6: { start: '09:00', end: '13:00' }  // Saturday
        },
        active: true
      },
      {
        id: 'emp_2',
        name: 'Maddie Kim',
        email: 'maddie@mcjp.io',
        role: 'Pharmacy Intern',
        hourlyRate: 35.00,
        maxHours: 20,
        availability: {
          0: null,
          1: { start: '09:00', end: '17:00' },
          2: { start: '09:00', end: '17:00' },
          3: { start: '09:00', end: '17:00' },
          4: { start: '09:00', end: '17:00' },
          5: { start: '09:00', end: '17:00' },
          6: null
        },
        active: true
      },
      {
        id: 'emp_3',
        name: 'Charlie Kim',
        email: 'charlie@mcjp.io',
        role: 'Junior Assistant',
        hourlyRate: 25.00,
        maxHours: 15,
        availability: {
          0: null,
          1: null,
          2: { start: '15:30', end: '18:00' },
          3: null,
          4: { start: '15:30', end: '18:00' },
          5: null,
          6: { start: '09:00', end: '13:00' }
        },
        active: true
      },
      {
        id: 'emp_4',
        name: 'John Smith',
        email: 'john.smith@gmail.com',
        role: 'Dispense Technician',
        hourlyRate: 42.50,
        maxHours: 38,
        availability: {
          0: null,
          1: { start: '08:30', end: '17:30' },
          2: { start: '08:30', end: '17:30' },
          3: { start: '08:30', end: '17:30' },
          4: { start: '08:30', end: '17:30' },
          5: { start: '08:30', end: '17:30' },
          6: null
        },
        active: true
      },
      {
        id: 'emp_5',
        name: 'Sarah Connor',
        email: 'sarah.c@gmail.com',
        role: 'Retail Associate',
        hourlyRate: 28.50,
        maxHours: 30,
        availability: {
          0: null,
          1: { start: '09:00', end: '18:00' },
          2: { start: '09:00', end: '18:00' },
          3: { start: '09:00', end: '18:00' },
          4: { start: '09:00', end: '18:00' },
          5: { start: '09:00', end: '18:00' },
          6: { start: '09:00', end: '13:00' }
        },
        active: true
      }
    ];

    // Get dates for this current week (Monday to Sunday)
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    function getFormattedDate(offsetDays) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    }

    // 2. Shifts Seed (This week)
    const shifts = [
      {
        id: 'shift_1',
        employeeId: 'emp_1',
        date: getFormattedDate(0), // Monday
        startTime: '08:30',
        endTime: '17:30',
        role: 'Pharmacist Manager',
        notes: 'Opening shift, check orders.'
      },
      {
        id: 'shift_2',
        employeeId: 'emp_4',
        date: getFormattedDate(0),
        startTime: '08:30',
        endTime: '17:30',
        role: 'Dispense Technician',
        notes: 'Help with dispensing.'
      },
      {
        id: 'shift_3',
        employeeId: 'emp_1',
        date: getFormattedDate(1), // Tuesday
        startTime: '08:30',
        endTime: '17:30',
        role: 'Pharmacist Manager',
        notes: ''
      },
      {
        id: 'shift_4',
        employeeId: 'emp_5',
        date: getFormattedDate(1),
        startTime: '09:00',
        endTime: '17:00',
        role: 'Retail Associate',
        notes: 'Customer service counter.'
      },
      {
        id: 'shift_5',
        employeeId: 'emp_2',
        date: getFormattedDate(2), // Wednesday
        startTime: '09:00',
        endTime: '17:00',
        role: 'Pharmacy Intern',
        notes: 'Maddie - clinical case review and dispensary practice.'
      },
      {
        id: 'shift_6',
        employeeId: 'emp_1',
        date: getFormattedDate(2),
        startTime: '08:30',
        endTime: '17:30',
        role: 'Pharmacist Manager',
        notes: ''
      },
      {
        id: 'shift_7',
        employeeId: 'emp_3',
        date: getFormattedDate(3), // Thursday
        startTime: '15:30',
        endTime: '18:00',
        role: 'Junior Assistant',
        notes: 'Charlie - restocking and shelf hygiene.'
      },
      {
        id: 'shift_8',
        employeeId: 'emp_1',
        date: getFormattedDate(4), // Friday
        startTime: '08:30',
        endTime: '17:30',
        role: 'Pharmacist Manager',
        notes: ''
      },
      {
        id: 'shift_9',
        employeeId: 'emp_4',
        date: getFormattedDate(4),
        startTime: '08:30',
        endTime: '17:30',
        role: 'Dispense Technician',
        notes: ''
      }
    ];

    // 3. Timecard Logs Seed (Previous days of current week, e.g., Monday and Tuesday)
    const timecards = [
      {
        id: 'tc_1',
        employeeId: 'emp_1',
        date: getFormattedDate(0),
        clockIn: `${getFormattedDate(0)}T08:25:00.000Z`,
        clockOut: `${getFormattedDate(0)}T17:35:00.000Z`,
        breaks: [
          { start: `${getFormattedDate(0)}T13:00:00.000Z`, end: `${getFormattedDate(0)}T13:30:00.000Z` }
        ],
        totalHours: 8.67,
        approved: true,
        approvedBy: 'System'
      },
      {
        id: 'tc_2',
        employeeId: 'emp_4',
        date: getFormattedDate(0),
        clockIn: `${getFormattedDate(0)}T08:32:00.000Z`,
        clockOut: `${getFormattedDate(0)}T17:30:00.000Z`,
        breaks: [
          { start: `${getFormattedDate(0)}T12:30:00.000Z`, end: `${getFormattedDate(0)}T13:00:00.000Z` }
        ],
        totalHours: 8.47,
        approved: true,
        approvedBy: 'Sung Joo Peter Kim'
      },
      {
        id: 'tc_3',
        employeeId: 'emp_1',
        date: getFormattedDate(1),
        clockIn: `${getFormattedDate(1)}T08:28:00.000Z`,
        clockOut: `${getFormattedDate(1)}T17:31:00.000Z`,
        breaks: [
          { start: `${getFormattedDate(1)}T13:10:00.000Z`, end: `${getFormattedDate(1)}T13:40:00.000Z` }
        ],
        totalHours: 8.55,
        approved: false,
        approvedBy: ''
      }
    ];

    // 4. Leave Requests Seed
    const leaveRequests = [
      {
        id: 'leave_1',
        employeeId: 'emp_4',
        startDate: getFormattedDate(7), // Next Monday
        endDate: getFormattedDate(9),   // Next Wednesday
        reason: 'Dentist appointment & family visit',
        status: 'Pending'
      },
      {
        id: 'leave_2',
        employeeId: 'emp_5',
        startDate: getFormattedDate(14), // Week after next
        endDate: getFormattedDate(14),
        reason: 'Personal administration',
        status: 'Approved'
      }
    ];

    // Save everything
    save(STORAGE_KEYS.EMPLOYEES, employees);
    save(STORAGE_KEYS.SHIFTS, shifts);
    save(STORAGE_KEYS.TIMECARDS, timecards);
    save(STORAGE_KEYS.LEAVE_REQUESTS, leaveRequests);
    save(STORAGE_KEYS.SETTINGS, { companyName: 'Brisk Pharmacy Group' });
  }

  // Database API
  return {
    init: init,
    clearAll: function() {
      localStorage.clear();
      seedDatabase();
    },
    // Employees
    getEmployees: function() { return load(STORAGE_KEYS.EMPLOYEES); },
    saveEmployees: function(data) { save(STORAGE_KEYS.EMPLOYEES, data); },
    addEmployee: function(employee) {
      const employees = this.getEmployees();
      employee.id = 'emp_' + Date.now();
      employee.active = true;
      employees.push(employee);
      this.saveEmployees(employees);
      return employee;
    },
    updateEmployee: function(updated) {
      const employees = this.getEmployees();
      const idx = employees.findIndex(e => e.id === updated.id);
      if (idx !== -1) {
        employees[idx] = { ...employees[idx], ...updated };
        this.saveEmployees(employees);
      }
    },
    deleteEmployee: function(id) {
      const employees = this.getEmployees();
      const filtered = employees.filter(e => e.id !== id);
      this.saveEmployees(filtered);
    },

    // Shifts
    getShifts: function() { return load(STORAGE_KEYS.SHIFTS); },
    saveShifts: function(data) { save(STORAGE_KEYS.SHIFTS, data); },
    addShift: function(shift) {
      const shifts = this.getShifts();
      shift.id = 'shift_' + Date.now();
      shifts.push(shift);
      this.saveShifts(shifts);
      return shift;
    },
    updateShift: function(updated) {
      const shifts = this.getShifts();
      const idx = shifts.findIndex(s => s.id === updated.id);
      if (idx !== -1) {
        shifts[idx] = { ...shifts[idx], ...updated };
        this.saveShifts(shifts);
      }
    },
    deleteShift: function(id) {
      const shifts = this.getShifts();
      const filtered = shifts.filter(s => s.id !== id);
      this.saveShifts(filtered);
    },

    // Timecards
    getTimecards: function() { return load(STORAGE_KEYS.TIMECARDS); },
    saveTimecards: function(data) { save(STORAGE_KEYS.TIMECARDS, data); },
    addTimecard: function(tc) {
      const timecards = this.getTimecards();
      tc.id = 'tc_' + Date.now();
      timecards.push(tc);
      this.saveTimecards(timecards);
      return tc;
    },
    updateTimecard: function(updated) {
      const timecards = this.getTimecards();
      const idx = timecards.findIndex(t => t.id === updated.id);
      if (idx !== -1) {
        timecards[idx] = { ...timecards[idx], ...updated };
        this.saveTimecards(timecards);
      }
    },

    // Leave Requests
    getLeaveRequests: function() { return load(STORAGE_KEYS.LEAVE_REQUESTS); },
    saveLeaveRequests: function(data) { save(STORAGE_KEYS.LEAVE_REQUESTS, data); },
    addLeaveRequest: function(req) {
      const requests = this.getLeaveRequests();
      req.id = 'leave_' + Date.now();
      req.status = 'Pending';
      requests.push(req);
      this.saveLeaveRequests(requests);
      return req;
    },
    updateLeaveRequest: function(updated) {
      const requests = this.getLeaveRequests();
      const idx = requests.findIndex(r => r.id === updated.id);
      if (idx !== -1) {
        requests[idx] = { ...requests[idx], ...updated };
        this.saveLeaveRequests(requests);
      }
    },

    // Settings
    getSettings: function() { return load(STORAGE_KEYS.SETTINGS, { companyName: 'Brisk Pharmacy Group' }); },
    saveSettings: function(settings) { save(STORAGE_KEYS.SETTINGS, settings); },

    // Export/Import JSON
    exportData: function() {
      const exportObj = {
        employees: this.getEmployees(),
        shifts: this.getShifts(),
        timecards: this.getTimecards(),
        leaveRequests: this.getLeaveRequests(),
        settings: this.getSettings(),
        version: '1.0.0',
        exportedAt: new Date().toISOString()
      };
      return JSON.stringify(exportObj, null, 2);
    },
    importData: function(jsonString) {
      try {
        const importObj = JSON.parse(jsonString);
        if (importObj.employees) save(STORAGE_KEYS.EMPLOYEES, importObj.employees);
        if (importObj.shifts) save(STORAGE_KEYS.SHIFTS, importObj.shifts);
        if (importObj.timecards) save(STORAGE_KEYS.TIMECARDS, importObj.timecards);
        if (importObj.leaveRequests) save(STORAGE_KEYS.LEAVE_REQUESTS, importObj.leaveRequests);
        if (importObj.settings) save(STORAGE_KEYS.SETTINGS, importObj.settings);
        return true;
      } catch (err) {
        console.error('Import database parse error:', err);
        return false;
      }
    }
  };
})();
