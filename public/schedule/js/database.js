/**
 * BriskSchedules Cloud Database & Sync Layer
 */
const BriskDB = (function() {
  const STORAGE_KEYS = {
    EMPLOYEES: 'brisk_employees',
    SHIFTS: 'brisk_shifts',
    TIMECARDS: 'brisk_timecards',
    LEAVE_REQUESTS: 'brisk_leave_requests',
    SETTINGS: 'brisk_settings',
    SESSION: 'brisk_session'
  };

  // Local memory cache
  let _employees = [];
  let _shifts = [];
  let _timecards = [];
  let _leaveRequests = [];
  let _settings = { companyName: 'Brisk Pharmacy Group' };
  
  // Track deletions for server sync
  let _deletedShifts = [];
  let _deletedEmployees = [];

  // Helper to load session
  function getSession() {
    const val = localStorage.getItem(STORAGE_KEYS.SESSION);
    return val ? JSON.parse(val) : null;
  }

  function setSession(session) {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      // Clear data on logout
      _employees = [];
      _shifts = [];
      _timecards = [];
      _leaveRequests = [];
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
      localStorage.removeItem(STORAGE_KEYS.SHIFTS);
      localStorage.removeItem(STORAGE_KEYS.TIMECARDS);
      localStorage.removeItem(STORAGE_KEYS.LEAVE_REQUESTS);
    }
  }

  // Get HTTP headers for authenticated requests
  function getAuthHeaders() {
    const session = getSession();
    if (!session) return {};
    return {
      'Content-Type': 'application/json',
      'x-user-role': session.role,
      'x-employee-id': session.employeeId || '',
      'x-user-email': session.email
    };
  }

  // Fetch data from Vercel API and sync local cache
  async function syncFromServer() {
    const session = getSession();
    if (!session) return false;

    try {
      const res = await fetch('/api/schedule/data', {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error('Failed to fetch data from cloud server.');
      }

      const data = await res.json();
      
      _employees = data.employees || [];
      _shifts = data.shifts || [];
      _timecards = data.timecards || [];
      _leaveRequests = data.leaveRequests || [];

      // Save a local storage backup copy for offline/fallback
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(_employees));
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(_shifts));
      localStorage.setItem(STORAGE_KEYS.TIMECARDS, JSON.stringify(_timecards));
      localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(_leaveRequests));

      // Reset deletions tracking
      _deletedShifts = [];
      _deletedEmployees = [];

      return true;
    } catch (err) {
      console.error('[CloudSync] Sync GET failed. Falling back to local storage cache.', err);
      // Fallback
      _employees = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
      _shifts = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIFTS) || '[]');
      _timecards = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMECARDS) || '[]');
      _leaveRequests = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEAVE_REQUESTS) || '[]');
      return false;
    }
  }

  // Post updates to Vercel API
  async function syncToServer(itemType = null, singleItem = null) {
    const session = getSession();
    if (!session) return false;

    try {
      let payload = {};

      if (session.role === 'owner' || session.role === 'manager') {
        // Manager syncs the whole batch
        payload = {
          employees: _employees,
          shifts: _shifts,
          timecards: _timecards,
          leaveRequests: _leaveRequests,
          deletedShifts: _deletedShifts,
          deletedEmployees: _deletedEmployees
        };
      } else {
        // Employee only syncs individual timecard or leave request
        if (!itemType || !singleItem) return false;
        payload = {
          type: itemType,
          data: singleItem
        };
      }

      const res = await fetch('/api/schedule/data', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save data to cloud server.');
      }

      // Reset deleted trackers on success
      _deletedShifts = [];
      _deletedEmployees = [];

      return true;
    } catch (err: any) {
      console.error('[CloudSync] Sync POST failed.', err);
      alert(`Cloud sync warning: ${err.message}`);
      return false;
    }
  }

  // Cloud API Call wrapper for Login
  async function apiLogin(email, password) {
    try {
      const res = await fetch('/api/schedule/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      return data;
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // Cloud API Call wrapper for Registration
  async function apiRegister(email, password, name, inviteCode) {
    try {
      const res = await fetch('/api/schedule/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, inviteCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      return data;
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // Cloud API Call wrapper for Invitation Generation
  async function apiGenerateInvite(email, role) {
    try {
      const res = await fetch('/api/schedule/auth/invite', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, role })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate invitation.');
      return data;
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // Cloud API Call wrapper for sending Roster Email
  async function apiSendRosterEmail(employeeId, weekStart, rosterText) {
    try {
      const res = await fetch('/api/schedule/email', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ employeeId, weekStart, rosterText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send roster email.');
      return data;
    } catch (err: any) {
      return { error: err.message };
    }
  }

  return {
    // Session API
    getSession,
    setSession,
    syncFromServer,
    syncToServer,
    
    // Auth Wrappers
    apiLogin,
    apiRegister,
    apiGenerateInvite,
    apiSendRosterEmail,

    // Local getters (fed from syncFromServer)
    getEmployees: function() { return _employees; },
    getShifts: function() { return _shifts; },
    getTimecards: function() { return _timecards; },
    getLeaveRequests: function() { return _leaveRequests; },
    getSettings: function() { return _settings; },
    
    // DB Modifiers
    addEmployee: async function(emp) {
      emp.id = 'emp_temp_' + Date.now(); // temporary client-side ID, replaced by UUID in postgres
      emp.active = true;
      _employees.push(emp);
      await syncToServer();
      await syncFromServer(); // pull down generated UUIDs
    },
    updateEmployee: async function(updated) {
      const idx = _employees.findIndex(e => e.id === updated.id);
      if (idx !== -1) {
        _employees[idx] = { ..._employees[idx], ...updated };
        await syncToServer();
      }
    },
    deleteEmployee: async function(id) {
      if (!id.startsWith('emp_temp_')) {
        _deletedEmployees.push(id);
      }
      _employees = _employees.filter(e => e.id !== id);
      await syncToServer();
    },

    // Shifts CRUD
    addShift: async function(shift) {
      shift.id = 'shift_temp_' + Date.now();
      _shifts.push(shift);
      await syncToServer();
      await syncFromServer();
    },
    updateShift: async function(updated) {
      const idx = _shifts.findIndex(s => s.id === updated.id);
      if (idx !== -1) {
        _shifts[idx] = { ..._shifts[idx], ...updated };
        await syncToServer();
      }
    },
    deleteShift: async function(id) {
      if (!id.startsWith('shift_temp_')) {
        _deletedShifts.push(id);
      }
      _shifts = _shifts.filter(s => s.id !== id);
      await syncToServer();
    },

    // Timecards CRUD
    addTimecard: async function(tc) {
      tc.id = 'tc_temp_' + Date.now();
      _timecards.push(tc);
      const session = getSession();
      if (session.role === 'employee') {
        await syncToServer('timecard', tc);
      } else {
        await syncToServer();
      }
      await syncFromServer();
    },
    updateTimecard: async function(updated) {
      const idx = _timecards.findIndex(t => t.id === updated.id);
      if (idx !== -1) {
        _timecards[idx] = { ..._timecards[idx], ...updated };
        const session = getSession();
        if (session.role === 'employee') {
          await syncToServer('timecard', _timecards[idx]);
        } else {
          await syncToServer();
        }
      }
    },

    // Leave Requests CRUD
    addLeaveRequest: async function(lr) {
      lr.id = 'leave_temp_' + Date.now();
      lr.status = 'Pending';
      _leaveRequests.push(lr);
      const session = getSession();
      if (session.role === 'employee') {
        await syncToServer('leave_request', lr);
      } else {
        await syncToServer();
      }
      await syncFromServer();
    },
    updateLeaveRequest: async function(updated) {
      const idx = _leaveRequests.findIndex(r => r.id === updated.id);
      if (idx !== -1) {
        _leaveRequests[idx] = { ..._leaveRequests[idx], ...updated };
        await syncToServer();
      }
    },

    // settings
    saveSettings: function(settings) {
      _settings = settings;
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },

    // Backup
    exportData: function() {
      const exportObj = {
        employees: _employees,
        shifts: _shifts,
        timecards: _timecards,
        leaveRequests: _leaveRequests,
        version: '1.0.0',
        exportedAt: new Date().toISOString()
      };
      return JSON.stringify(exportObj, null, 2);
    }
  };
})();
