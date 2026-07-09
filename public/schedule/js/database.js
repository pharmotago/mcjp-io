/**
 * BriskSchedules Cloud Database & Sync Layer — Supabase PostgreSQL implementation
 */
import supabase from './supabase-client.js';

const BriskDB = (function() {
  const STORAGE_KEYS = {
    SESSION: 'brisk_session'
  };

  let _employees = [];
  let _shifts = [];
  let _historicalShifts = [];
  let _timecards = [];
  let _historicalTimecards = [];
  let _leaveRequests = [];
  let _historicalLeaveRequests = [];
  let _settings = { companyName: 'Amcal Pharmacy Woywoy Rosters' };
  
  let _roles = [];
  const DEFAULT_ROLES = [
    { id: 'role_pm', name: 'Pharmacist Manager', color: '#10b981' },
    { id: 'role_rm', name: 'Retail Manager', color: '#f59e0b' },
    { id: 'role_pa', name: 'Pharmacy Assistant', color: '#3b82f6' },
    { id: 'role_o', name: 'Owner', color: '#ec4899' },
    { id: 'role_dt', name: 'Dispense Technician', color: '#a855f7' },
    { id: 'role_ra', name: 'Retail Associate', color: '#06b6d4' }
  ];

  let _listeners = [];
  let _initialLoadCompleted = {
    employees: false,
    shifts: false,
    timecards: false,
    leaveRequests: false
  };
  let _fetchedHistoricalRanges = new Set();
  let _activeFetches = {};

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
      _historicalShifts = [];
      _timecards = [];
      _historicalTimecards = [];
      _leaveRequests = [];
      _historicalLeaveRequests = [];
      
      // Detach all listeners
      _listeners.forEach(unsub => unsub());
      _listeners = [];
      
      _initialLoadCompleted = { employees: false, shifts: false, timecards: false, leaveRequests: false };

      supabase.auth.signOut().catch(err => console.warn('Supabase signOut failed:', err));
    }
  }

  // --- SQL Mapper Functions to resolve DB Snake Case vs JS Camel Case ---
  function mapEmployeeToDb(emp) {
    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      hourly_rate: emp.hourlyRate,
      max_hours: emp.maxHours,
      availability: emp.availability,
      active: emp.active
    };
  }

  function mapEmployeeFromDb(emp) {
    if (!emp) return null;
    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      hourlyRate: parseFloat(emp.hourly_rate),
      maxHours: parseInt(emp.max_hours),
      availability: emp.availability,
      active: emp.active
    };
  }

  function mapShiftToDb(shift) {
    return {
      id: shift.id,
      employee_id: shift.employeeId,
      date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      role: shift.role,
      notes: shift.notes
    };
  }

  function mapShiftFromDb(shift) {
    if (!shift) return null;
    return {
      id: shift.id,
      employeeId: shift.employee_id,
      date: shift.date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      role: shift.role,
      notes: shift.notes
    };
  }

  function mapTimecardToDb(tc) {
    return {
      id: tc.id,
      employee_id: tc.employeeId,
      date: tc.date,
      clock_in: tc.clockIn,
      clock_out: tc.clockOut,
      breaks: tc.breaks,
      total_hours: tc.totalHours,
      approved: tc.approved,
      approved_by: tc.approvedBy
    };
  }

  function mapTimecardFromDb(tc) {
    if (!tc) return null;
    return {
      id: tc.id,
      employeeId: tc.employee_id,
      date: tc.date,
      clockIn: tc.clock_in,
      clockOut: tc.clock_out,
      breaks: tc.breaks,
      totalHours: parseFloat(tc.total_hours),
      approved: tc.approved,
      approvedBy: tc.approved_by
    };
  }

  function mapLeaveRequestToDb(lr) {
    return {
      id: lr.id,
      employee_id: lr.employeeId,
      start_date: lr.startDate,
      end_date: lr.endDate,
      reason: lr.reason,
      status: lr.status
    };
  }

  function mapLeaveRequestFromDb(lr) {
    if (!lr) return null;
    return {
      id: lr.id,
      employeeId: lr.employee_id,
      startDate: lr.start_date,
      endDate: lr.end_date,
      reason: lr.reason,
      status: lr.status
    };
  }

  // Set up real-time postgres_changes listeners
  function setupListeners() {
    const session = getSession();
    if (!session) return;

    // Clear previous listeners
    _listeners.forEach(unsub => unsub());
    _listeners = [];

    // 1. Employees Listener
    const empChannel = supabase.channel('realtime:brisk_employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brisk_employees' }, payload => {
        const { eventType, new: newRec } = payload;
        
        // Handle virtual roles employee update
        if (newRec && newRec.email === 'system_roles@brisk.internal') {
          if (newRec.availability && Array.isArray(newRec.availability.roles)) {
            _roles = newRec.availability.roles;
            window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'roles' } }));
          }
          return;
        }

        const mappedNew = mapEmployeeFromDb(newRec);
        if (mappedNew) {
          if (eventType === 'INSERT') {
            if (!_employees.some(e => e.id === mappedNew.id)) _employees.push(mappedNew);
          } else if (eventType === 'UPDATE') {
            const idx = _employees.findIndex(e => e.id === mappedNew.id);
            if (idx !== -1) _employees[idx] = mappedNew;
            else _employees.push(mappedNew);
          }
          window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'employees' } }));
        }
      })
      .subscribe();
    _listeners.push(() => supabase.removeChannel(empChannel));

    // 2. Shifts Listener
    const shiftChannel = supabase.channel('realtime:brisk_shifts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brisk_shifts' }, payload => {
        const { eventType, new: newRec, old: oldRec } = payload;
        const mappedNew = mapShiftFromDb(newRec);
        if (eventType === 'INSERT') {
          if (!_shifts.some(s => s.id === mappedNew.id)) _shifts.push(mappedNew);
        } else if (eventType === 'UPDATE') {
          const idx = _shifts.findIndex(s => s.id === mappedNew.id);
          if (idx !== -1) _shifts[idx] = mappedNew;
          else _shifts.push(mappedNew);
        } else if (eventType === 'DELETE') {
          _shifts = _shifts.filter(s => s.id !== oldRec.id);
        }
        window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'shifts' } }));
      })
      .subscribe();
    _listeners.push(() => supabase.removeChannel(shiftChannel));

    // 3. Timecards Listener
    const tcChannel = supabase.channel('realtime:brisk_timecards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brisk_timecards' }, payload => {
        const { eventType, new: newRec, old: oldRec } = payload;
        const mappedNew = mapTimecardFromDb(newRec);
        if (eventType === 'INSERT') {
          if (!_timecards.some(t => t.id === mappedNew.id)) _timecards.push(mappedNew);
        } else if (eventType === 'UPDATE') {
          const idx = _timecards.findIndex(t => t.id === mappedNew.id);
          if (idx !== -1) _timecards[idx] = mappedNew;
          else _timecards.push(mappedNew);
        }
        window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'timecards' } }));
      })
      .subscribe();
    _listeners.push(() => supabase.removeChannel(tcChannel));

    // 4. Leave Requests Listener
    const leaveChannel = supabase.channel('realtime:brisk_leave_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brisk_leave_requests' }, payload => {
        const { eventType, new: newRec, old: oldRec } = payload;
        const mappedNew = mapLeaveRequestFromDb(newRec);
        if (eventType === 'INSERT') {
          if (!_leaveRequests.some(l => l.id === mappedNew.id)) _leaveRequests.push(mappedNew);
        } else if (eventType === 'UPDATE') {
          const idx = _leaveRequests.findIndex(l => l.id === mappedNew.id);
          if (idx !== -1) _leaveRequests[idx] = mappedNew;
          else _leaveRequests.push(mappedNew);
        }
        window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'leave_requests' } }));
      })
      .subscribe();
    _listeners.push(() => supabase.removeChannel(leaveChannel));

    // 5. Roles Listener
    const roleChannel = supabase.channel('realtime:brisk_roles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brisk_roles' }, payload => {
        const { eventType, new: newRec, old: oldRec } = payload;
        if (eventType === 'INSERT') {
          if (!_roles.some(r => r.id === newRec.id)) {
            _roles.push(newRec);
            _roles.sort((a,b) => a.name.localeCompare(b.name));
          }
        } else if (eventType === 'UPDATE') {
          const idx = _roles.findIndex(r => r.id === newRec.id);
          if (idx !== -1) {
            _roles[idx] = newRec;
            _roles.sort((a,b) => a.name.localeCompare(b.name));
          }
        } else if (eventType === 'DELETE') {
          _roles = _roles.filter(r => r.id !== oldRec.id);
        }
        window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'roles' } }));
      })
      .subscribe();
    _listeners.push(() => supabase.removeChannel(roleChannel));
  }

  async function createOrUpdateSystemRolesInDb(rolesList) {
    try {
      const { data: existing } = await supabase
        .from('brisk_employees')
        .select('*')
        .eq('email', 'system_roles@brisk.internal')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('brisk_employees')
          .update({
            availability: { roles: rolesList }
          })
          .eq('email', 'system_roles@brisk.internal');
      } else {
        await supabase
          .from('brisk_employees')
          .insert({
            id: '00000000-0000-0000-0000-000000000001',
            name: '__system_roles__',
            email: 'system_roles@brisk.internal',
            role: 'system',
            hourly_rate: 0.00,
            max_hours: 0,
            availability: { roles: rolesList },
            active: false
          });
      }
    } catch (err) {
      console.warn('Failed to save roles to virtual employee in Supabase:', err);
    }
  }

  // Triggered on app load
  async function syncFromServer() {
    const session = getSession();
    if (!session) return false;

    // Bounding window: 14 days ago (optimized to reduce network reads)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const windowStr = fourteenDaysAgo.toISOString().split('T')[0];

    try {
      // 1. Employees Load
      const { data: emps, error: empErr } = await supabase.from('brisk_employees').select('*');
      if (empErr) throw empErr;
      
      const allEmployees = (emps || []).map(mapEmployeeFromDb);
      const systemRolesEmp = allEmployees.find(e => e.email === 'system_roles@brisk.internal');
      
      // Filter out virtual role storage employee
      _employees = allEmployees.filter(e => e.email !== 'system_roles@brisk.internal');
      _initialLoadCompleted.employees = true;

      // 2. Shifts Load (>= 14 days ago)
      const { data: sfs, error: sfErr } = await supabase.from('brisk_shifts').select('*').gte('date', windowStr);
      if (sfErr) throw sfErr;
      _shifts = (sfs || []).map(mapShiftFromDb);
      _initialLoadCompleted.shifts = true;

      // 3. Timecards Load (>= 14 days ago)
      const { data: tcs, error: tcErr } = await supabase.from('brisk_timecards').select('*').gte('date', windowStr);
      if (tcErr) throw tcErr;
      _timecards = (tcs || []).map(mapTimecardFromDb);
      _initialLoadCompleted.timecards = true;

      // 4. Leave Requests Load (>= 14 days ago)
      const { data: lrs, error: lrErr } = await supabase.from('brisk_leave_requests').select('*').gte('end_date', windowStr);
      if (lrErr) throw lrErr;
      _leaveRequests = (lrs || []).map(mapLeaveRequestFromDb);
      _initialLoadCompleted.leaveRequests = true;

      // 5. Settings Load
      const { data: sets } = await supabase.from('brisk_settings').select('*').limit(1).maybeSingle();
      if (sets) _settings = sets;

      // 6. Roles Load
      let loadedRoles = null;
      try {
        const { data: rls, error: rlsErr } = await supabase.from('brisk_roles').select('*').order('name');
        if (!rlsErr && rls && rls.length > 0) {
          loadedRoles = rls;
        }
      } catch (err) {
        // Table doesn't exist
      }

      if (!loadedRoles && systemRolesEmp && systemRolesEmp.availability && Array.isArray(systemRolesEmp.availability.roles)) {
        loadedRoles = systemRolesEmp.availability.roles;
      }

      if (loadedRoles) {
        _roles = loadedRoles;
      } else {
        const cachedRoles = localStorage.getItem('brisk_roles');
        if (cachedRoles) {
          _roles = JSON.parse(cachedRoles);
        } else {
          _roles = [...DEFAULT_ROLES];
          localStorage.setItem('brisk_roles', JSON.stringify(_roles));
        }
        createOrUpdateSystemRolesInDb(_roles).catch(console.error);
      }

      setupListeners();
      return true;
    } catch (err) {
      console.error('Failed to sync from server:', err);
      throw err;
    }
  }

  // Dummy function for compatibility
  async function syncToServer() {
    return true;
  }

  // Cloud API Call wrapper for Login using Supabase Auth Client SDK
  async function apiLogin(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      // Get user role document from brisk_users profile table
      const { data: userProfile, error: profErr } = await supabase
        .from('brisk_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (profErr || !userProfile) {
        throw new Error('User profile record not found in database.');
      }

      const session = {
        email: data.user.email,
        role: userProfile.role,
        employeeId: userProfile.employee_id || null,
        name: userProfile.name || 'Staff Member',
        token: data.session.access_token
      };

      setSession(session);
      setupListeners();
      return session;
    } catch (err) {
      return { error: err.message };
    }
  }

  // Registration uses Vercel Edge / Serverless API route
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
    } catch (err) {
      return { error: err.message };
    }
  }

  // Generate Invite
  async function apiGenerateInvite(email, role) {
    try {
      const session = getSession();
      const res = await fetch('/api/schedule/auth/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (session ? session.token : '')
        },
        body: JSON.stringify({ email, role })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate invitation.');
      return data;
    } catch (err) {
      return { error: err.message };
    }
  }

  // Send Roster Email
  async function apiSendRosterEmail(employeeId, weekStart, rosterText) {
    try {
      const session = getSession();
      const res = await fetch('/api/schedule/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (session ? session.token : '')
        },
        body: JSON.stringify({ employeeId, weekStart, rosterText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send roster email.');
      return data;
    } catch (err) {
      return { error: err.message };
    }
  }

  // Lazy-load historical data
  async function fetchHistoricalWeek(weekStartStr, weekEndStr) {
    const rangeKey = `${weekStartStr}_${weekEndStr}`;
    if (_activeFetches[rangeKey]) {
      await _activeFetches[rangeKey];
      return;
    }
    
    if (_fetchedHistoricalRanges.has(rangeKey)) {
      window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'historical' } }));
      return;
    }

    _activeFetches[rangeKey] = (async () => {
      _historicalShifts = [];
      _historicalTimecards = [];
      _historicalLeaveRequests = [];

      try {
        const { data: sfs } = await supabase.from('brisk_shifts').select('*').gte('date', weekStartStr).lte('date', weekEndStr);
        _historicalShifts = (sfs || []).map(mapShiftFromDb);

        const { data: tcs } = await supabase.from('brisk_timecards').select('*').gte('date', weekStartStr).lte('date', weekEndStr);
        _historicalTimecards = (tcs || []).map(mapTimecardFromDb);

        const { data: lrs } = await supabase.from('brisk_leave_requests').select('*').gte('end_date', weekStartStr).lte('start_date', weekEndStr);
        _historicalLeaveRequests = (lrs || []).map(mapLeaveRequestFromDb);

        _fetchedHistoricalRanges.clear();
        _fetchedHistoricalRanges.add(rangeKey);
      } catch (err) {
        console.error('Failed to fetch historical week:', err);
      } finally {
        delete _activeFetches[rangeKey];
        window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'historical' } }));
      }
    })();

    await _activeFetches[rangeKey];
  }

  return {
    getSession,
    setSession,
    syncFromServer,
    fetchHistoricalWeek,
    syncToServer,
    apiLogin,
    apiRegister,
    apiGenerateInvite,
    apiSendRosterEmail,

    getEmployees: () => _employees,
    getShifts: () => [..._shifts, ..._historicalShifts],
    getTimecards: () => [..._timecards, ..._historicalTimecards],
    getLeaveRequests: () => [..._leaveRequests, ..._historicalLeaveRequests],
    getSettings: () => _settings,
    getRoles: () => _roles.length > 0 ? _roles : DEFAULT_ROLES,
    addRole: async function(role) {
      const newRole = { id: 'role_' + Date.now(), ...role };
      _roles.push(newRole);
      _roles.sort((a,b) => a.name.localeCompare(b.name));
      
      localStorage.setItem('brisk_roles', JSON.stringify(_roles));
      createOrUpdateSystemRolesInDb(_roles).catch(console.error);

      try {
        await supabase.from('brisk_roles').insert(role);
      } catch (err) {
        // Table doesn't exist, ignore
      }
      return newRole;
    },
    updateRole: async function(updated) {
      const idx = _roles.findIndex(r => r.id === updated.id);
      if (idx !== -1) {
        _roles[idx] = { ..._roles[idx], ...updated };
        _roles.sort((a,b) => a.name.localeCompare(b.name));
      }
      
      localStorage.setItem('brisk_roles', JSON.stringify(_roles));
      createOrUpdateSystemRolesInDb(_roles).catch(console.error);

      try {
        await supabase.from('brisk_roles').update({ name: updated.name, color: updated.color }).eq('id', updated.id);
      } catch (err) {
        // Table doesn't exist, ignore
      }
    },
    deleteRole: async function(id) {
      _roles = _roles.filter(r => r.id !== id);
      localStorage.setItem('brisk_roles', JSON.stringify(_roles));
      createOrUpdateSystemRolesInDb(_roles).catch(console.error);

      try {
        await supabase.from('brisk_roles').delete().eq('id', id);
      } catch (err) {
        // Table doesn't exist, ignore
      }
    },

    addEmployee: async function(emp) {
      const newEmp = { ...emp, active: true };
      const { data, error } = await supabase.from('brisk_employees').insert(mapEmployeeToDb(newEmp)).select().single();
      if (error) throw error;
      return mapEmployeeFromDb(data);
    },
    updateEmployee: async function(updated) {
      const { error } = await supabase.from('brisk_employees').update(mapEmployeeToDb(updated)).eq('id', updated.id);
      if (error) throw error;
    },
    deleteEmployee: async function(id) {
      const { error } = await supabase.from('brisk_employees').update({ active: false }).eq('id', id);
      if (error) throw error;
    },

    addShift: async function(shift) {
      const { error } = await supabase.from('brisk_shifts').insert(mapShiftToDb(shift));
      if (error) throw error;
    },
    updateShift: async function(updated) {
      const { error } = await supabase.from('brisk_shifts').update(mapShiftToDb(updated)).eq('id', updated.id);
      if (error) throw error;
    },
    deleteShift: async function(id) {
      const { error } = await supabase.from('brisk_shifts').delete().eq('id', id);
      if (error) throw error;
    },
    batchUpdateShifts: async function(shiftsArray) {
      if (!shiftsArray || shiftsArray.length === 0) return;
      const mappedShifts = shiftsArray.map(mapShiftToDb);
      const { error } = await supabase.from('brisk_shifts').upsert(mappedShifts);
      if (error) throw error;
    },

    addTimecard: async function(tc) {
      const { data, error } = await supabase.from('brisk_timecards').insert(mapTimecardToDb(tc)).select().single();
      if (error) throw error;
      const mapped = mapTimecardFromDb(data);
      const existing = _timecards.findIndex(t => t.id === mapped.id);
      if (existing === -1) _timecards.push(mapped);
      return mapped;
    },
    updateTimecard: async function(updated) {
      const { error } = await supabase.from('brisk_timecards').update(mapTimecardToDb(updated)).eq('id', updated.id);
      if (error) throw error;
      const idx = _timecards.findIndex(t => t.id === updated.id);
      if (idx !== -1) _timecards[idx] = { ..._timecards[idx], ...updated };
      else _timecards.push(updated);
    },

    addLeaveRequest: async function(lr) {
      const newLr = { ...lr, status: 'Pending' };
      const { error } = await supabase.from('brisk_leave_requests').insert(mapLeaveRequestToDb(newLr));
      if (error) throw error;
    },
    updateLeaveRequest: async function(updated) {
      const { error } = await supabase.from('brisk_leave_requests').update(mapLeaveRequestToDb(updated)).eq('id', updated.id);
      if (error) throw error;
    },

    saveSettings: async function(settings) {
      _settings = settings;
      const { error } = await supabase.from('brisk_settings').upsert({
        id: 'global_settings', // single row settings
        company_name: settings.companyName
      });
      if (error) console.error('Failed to save settings to Supabase:', error);
    },

    apiResetPasswordForEmail: async function(email) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname
        });
        if (error) throw error;
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    },

    apiUpdatePassword: async function(newPassword) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    },

    exportData: function() {
      return JSON.stringify({
        employees: _employees,
        shifts: _shifts,
        timecards: _timecards,
        leaveRequests: _leaveRequests,
        exportedAt: new Date().toISOString()
      }, null, 2);
    }
  };
})();

window.BriskDB = BriskDB;
export default BriskDB;
