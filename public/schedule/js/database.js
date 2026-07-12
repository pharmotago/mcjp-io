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
  const DEFAULT_TRADING_HOURS = {
    "1": { "open": "08:30", "close": "17:30", "closed": false },
    "2": { "open": "08:30", "close": "17:30", "closed": false },
    "3": { "open": "08:30", "close": "17:30", "closed": false },
    "4": { "open": "08:30", "close": "17:30", "closed": false },
    "5": { "open": "08:30", "close": "17:30", "closed": false },
    "6": { "open": "09:00", "close": "13:00", "closed": false },
    "0": { "open": "00:00", "close": "00:00", "closed": true }
  };
  let _settings = { companyName: 'Amcal Pharmacy Woywoy Rosters', tradingHours: DEFAULT_TRADING_HOURS };
  
  let _roles = [];
  const DEFAULT_ROLES = [
    { id: 'role_dispensary', name: 'Dispensary', color: '#10b981' },
    { id: 'role_tills', name: 'Tills', color: '#f59e0b' },
    { id: 'role_webster', name: 'Webster', color: '#a855f7' },
    { id: 'role_floor', name: 'Floor', color: '#3b82f6' }
  ];

  let _positions = [];
  const DEFAULT_POSITIONS = [
    { id: 'pos_owner', name: 'Owner' },
    { id: 'pos_pm', name: 'Pharmacist Manager' },
    { id: 'pos_pharmacist', name: 'Pharmacist' },
    { id: 'pos_dt', name: 'Dispense Technician' },
    { id: 'pos_pa', name: 'Pharmacy Assistant' }
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
    const obj = {
      name: emp.name,
      email: emp.email,
      role: emp.role,
      phone: emp.phone || null,
      hourly_rate: (emp.hourlyRate != null && !isNaN(emp.hourlyRate)) ? emp.hourlyRate : 0,
      max_hours: (emp.maxHours != null && !isNaN(emp.maxHours)) ? emp.maxHours : 38,
      availability: emp.availability,
      active: emp.active
    };
    if (emp.id) obj.id = emp.id;
    return obj;
  }

  function mapEmployeeFromDb(emp) {
    if (!emp) return null;
    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      phone: emp.phone,
      hourlyRate: parseFloat(emp.hourly_rate),
      maxHours: parseInt(emp.max_hours),
      availability: emp.availability,
      active: emp.active
    };
  }

  function mapShiftToDb(shift) {
    const obj = {
      employee_id: shift.employeeId,
      date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      role: shift.role,
      status: shift.status || 'draft',
      notes: shift.notes
    };
    if (shift.id) obj.id = shift.id;
    return obj;
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
      status: shift.status || 'draft',
      notes: shift.notes
    };
  }

  function mapTimecardToDb(tc) {
    const obj = {
      employee_id: tc.employeeId,
      date: tc.date,
      clock_in: tc.clockIn,
      clock_out: tc.clockOut,
      breaks: tc.breaks,
      total_hours: tc.totalHours,
      approved: tc.approved,
      approved_by: tc.approvedBy
    };
    if (tc.id) obj.id = tc.id;
    return obj;
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
    const obj = {
      employee_id: lr.employeeId,
      start_date: lr.startDate,
      end_date: lr.endDate,
      reason: lr.reason,
      status: lr.status
    };
    if (lr.id) obj.id = lr.id;
    return obj;
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

  function mapSettingsToDb(settings) {
    return {
      id: 'global_settings',
      company_name: settings.companyName,
      trading_hours: settings.tradingHours
    };
  }

  function mapSettingsFromDb(settings) {
    if (!settings) return null;
    return {
      companyName: settings.company_name,
      tradingHours: settings.trading_hours || DEFAULT_TRADING_HOURS
    };
  }

  // Offline Sync Queue Management
  let _offlineQueue = [];
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('brisk_offline_queue');
      if (saved) _offlineQueue = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load offline queue:', e);
  }

  function saveOfflineQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('brisk_offline_queue', JSON.stringify(_offlineQueue));
      }
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
  }

  function enqueueOfflineOperation(type, timecard) {
    const existingIdx = _offlineQueue.findIndex(op => op.timecard.id === timecard.id);
    if (existingIdx !== -1) {
      const existingOp = _offlineQueue[existingIdx];
      if (existingOp.type === 'add') {
        _offlineQueue[existingIdx] = { type: 'add', timecard: { ...existingOp.timecard, ...timecard } };
      } else {
        _offlineQueue[existingIdx] = { type, timecard: { ...existingOp.timecard, ...timecard } };
      }
    } else {
      _offlineQueue.push({ type, timecard });
    }
    saveOfflineQueue();
    
    // Dispatch event to notify UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('brisk-sync-status', { detail: { pending: _offlineQueue.length } }));
    }
  }

  async function processOfflineQueue() {
    if (_offlineQueue.length === 0) return;
    
    const session = getSession();
    if (!session) return;
    
    console.log(`[BriskDB] Processing ${_offlineQueue.length} offline operations...`);
    const queueToProcess = [..._offlineQueue];
    
    for (const op of queueToProcess) {
      try {
        if (op.type === 'add') {
          const { error } = await supabase.from('brisk_timecards').insert(mapTimecardToDb(op.timecard));
          if (error) throw error;
        } else if (op.type === 'update') {
          const { error } = await supabase.from('brisk_timecards').update(mapTimecardToDb(op.timecard)).eq('id', op.timecard.id);
          if (error) throw error;
        }
        
        // Remove successfully processed operation
        _offlineQueue = _offlineQueue.filter(item => item.timecard.id !== op.timecard.id);
        saveOfflineQueue();
      } catch (err) {
        console.error('[BriskDB] Failed to sync offline operation:', err);
        break; // retry on next interval
      }
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('brisk-sync-status', { detail: { pending: _offlineQueue.length } }));
    }
  }

  // Setup background sync workers
  if (typeof window !== 'undefined') {
    setInterval(processOfflineQueue, 15000); // Check every 15 seconds
    window.addEventListener('online', processOfflineQueue);
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
        const { eventType, new: newRec, old: oldRec } = payload;
        
        // Handle virtual roles employee update
        if (newRec && newRec.email === 'system_roles@brisk.internal') {
          if (newRec.availability) {
            if (Array.isArray(newRec.availability.roles)) {
              _roles = newRec.availability.roles;
              localStorage.setItem('brisk_roles', JSON.stringify(_roles));
            }
            if (Array.isArray(newRec.availability.positions)) {
              _positions = newRec.availability.positions;
              localStorage.setItem('brisk_positions', JSON.stringify(_positions));
            }
            window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'roles' } }));
            window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'positions' } }));
          }
          return;
        }

        if (eventType === 'DELETE') {
          if (oldRec && oldRec.id) {
            _employees = _employees.filter(e => e.id !== oldRec.id);
            window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'employees' } }));
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
        if (eventType === 'DELETE') {
          if (oldRec && oldRec.id) {
            _shifts = _shifts.filter(s => s.id !== oldRec.id);
            window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'shifts' } }));
          }
          return;
        }
        const mappedNew = mapShiftFromDb(newRec);
        if (mappedNew) {
          if (eventType === 'INSERT') {
            if (!_shifts.some(s => s.id === mappedNew.id)) _shifts.push(mappedNew);
          } else if (eventType === 'UPDATE') {
            const idx = _shifts.findIndex(s => s.id === mappedNew.id);
            if (idx !== -1) _shifts[idx] = mappedNew;
            else _shifts.push(mappedNew);
          }
          window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'shifts' } }));
        }
      })
      .subscribe();
    _listeners.push(() => supabase.removeChannel(shiftChannel));

    // 3. Timecards Listener
    const tcChannel = supabase.channel('realtime:brisk_timecards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brisk_timecards' }, payload => {
        const { eventType, new: newRec, old: oldRec } = payload;
        if (eventType === 'DELETE') {
          if (oldRec && oldRec.id) {
            _timecards = _timecards.filter(t => t.id !== oldRec.id);
            window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'timecards' } }));
          }
          return;
        }
        const mappedNew = mapTimecardFromDb(newRec);
        if (mappedNew) {
          if (eventType === 'INSERT') {
            if (!_timecards.some(t => t.id === mappedNew.id)) _timecards.push(mappedNew);
          } else if (eventType === 'UPDATE') {
            const idx = _timecards.findIndex(t => t.id === mappedNew.id);
            if (idx !== -1) _timecards[idx] = mappedNew;
            else _timecards.push(mappedNew);
          }
          window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'timecards' } }));
        }
      })
      .subscribe();
    _listeners.push(() => supabase.removeChannel(tcChannel));

    // 4. Leave Requests Listener
    const leaveChannel = supabase.channel('realtime:brisk_leave_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brisk_leave_requests' }, payload => {
        const { eventType, new: newRec, old: oldRec } = payload;
        if (eventType === 'DELETE') {
          if (oldRec && oldRec.id) {
            _leaveRequests = _leaveRequests.filter(l => l.id !== oldRec.id);
            window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'leave_requests' } }));
          }
          return;
        }
        const mappedNew = mapLeaveRequestFromDb(newRec);
        if (mappedNew) {
          if (eventType === 'INSERT') {
            if (!_leaveRequests.some(l => l.id === mappedNew.id)) _leaveRequests.push(mappedNew);
          } else if (eventType === 'UPDATE') {
            const idx = _leaveRequests.findIndex(l => l.id === mappedNew.id);
            if (idx !== -1) _leaveRequests[idx] = mappedNew;
            else _leaveRequests.push(mappedNew);
          }
          window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'leave_requests' } }));
        }
      })
      .subscribe();
    _listeners.push(() => supabase.removeChannel(leaveChannel));
  }

  async function createOrUpdateSystemRolesInDb(rolesList, positionsList) {
    try {
      const { data: existing } = await supabase
        .from('brisk_employees')
        .select('*')
        .eq('email', 'system_roles@brisk.internal')
        .maybeSingle();

      const availabilityObj = {
        roles: rolesList || _roles,
        positions: positionsList || _positions
      };

      if (existing) {
        await supabase
          .from('brisk_employees')
          .update({
            availability: availabilityObj
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
            availability: availabilityObj,
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

    // Validate Supabase Auth session
    const { data: { session: sbSession }, error: sbSessionErr } = await supabase.auth.getSession();
    if (sbSessionErr || !sbSession) {
      console.warn('[BriskDB] Supabase session is invalid or expired. Clearing session.');
      setSession(null);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return false;
    }

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
      if (sets) {
        _settings = mapSettingsFromDb(sets);
      } else {
        _settings = { companyName: 'Amcal Pharmacy Woywoy Rosters', tradingHours: DEFAULT_TRADING_HOURS };
      }

      // 6. Roles & Positions Load
      let loadedRoles = null;
      let loadedPositions = null;

      if (systemRolesEmp && systemRolesEmp.availability) {
        if (Array.isArray(systemRolesEmp.availability.roles)) {
          loadedRoles = systemRolesEmp.availability.roles;
        }
        if (Array.isArray(systemRolesEmp.availability.positions)) {
          loadedPositions = systemRolesEmp.availability.positions;
        }
      }

      // Handle Roles
      if (loadedRoles) {
        _roles = loadedRoles;
        localStorage.setItem('brisk_roles', JSON.stringify(_roles));
      } else {
        const cachedRoles = localStorage.getItem('brisk_roles');
        if (cachedRoles) {
          _roles = JSON.parse(cachedRoles);
        } else {
          _roles = [...DEFAULT_ROLES];
          localStorage.setItem('brisk_roles', JSON.stringify(_roles));
        }
      }

      // Handle Positions
      if (loadedPositions) {
        _positions = loadedPositions;
        localStorage.setItem('brisk_positions', JSON.stringify(_positions));
      } else {
        const cachedPositions = localStorage.getItem('brisk_positions');
        if (cachedPositions) {
          _positions = JSON.parse(cachedPositions);
        } else {
          _positions = [...DEFAULT_POSITIONS];
          localStorage.setItem('brisk_positions', JSON.stringify(_positions));
        }
      }

      // Push back to database if missing from server roles record
      if (systemRolesEmp && (!systemRolesEmp.availability || !systemRolesEmp.availability.roles || !systemRolesEmp.availability.positions)) {
        createOrUpdateSystemRolesInDb(_roles, _positions).catch(console.error);
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

      let resolvedRole = userProfile.role;
      if (userProfile.employee_id) {
        const { data: empData } = await supabase
          .from('brisk_employees')
          .select('role')
          .eq('id', userProfile.employee_id)
          .maybeSingle();
        if (empData && empData.role && empData.role.toLowerCase().trim() === 'pharmacist manager') {
          resolvedRole = 'manager';
        }
      }

      const session = {
        email: data.user.email,
        role: resolvedRole,
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
    getPositions: () => _positions.length > 0 ? _positions : DEFAULT_POSITIONS,
    addPosition: async function(name) {
      const newPos = { id: 'pos_' + Date.now(), name };
      _positions.push(newPos);
      _positions.sort((a,b) => a.name.localeCompare(b.name));
      
      localStorage.setItem('brisk_positions', JSON.stringify(_positions));
      await createOrUpdateSystemRolesInDb(_roles, _positions);
      return newPos;
    },
    updatePosition: async function(updated) {
      const idx = _positions.findIndex(p => p.id === updated.id);
      if (idx !== -1) {
        _positions[idx] = { ..._positions[idx], ...updated };
        _positions.sort((a,b) => a.name.localeCompare(b.name));
      }
      
      localStorage.setItem('brisk_positions', JSON.stringify(_positions));
      await createOrUpdateSystemRolesInDb(_roles, _positions);
    },
    deletePosition: async function(id) {
      _positions = _positions.filter(p => p.id !== id);
      localStorage.setItem('brisk_positions', JSON.stringify(_positions));
      await createOrUpdateSystemRolesInDb(_roles, _positions);
    },
    addRole: async function(role) {
      const newRole = { id: 'role_' + Date.now(), ...role };
      _roles.push(newRole);
      _roles.sort((a,b) => a.name.localeCompare(b.name));
      
      localStorage.setItem('brisk_roles', JSON.stringify(_roles));
      await createOrUpdateSystemRolesInDb(_roles, _positions);
      return newRole;
    },
    updateRole: async function(updated) {
      const idx = _roles.findIndex(r => r.id === updated.id);
      if (idx !== -1) {
        _roles[idx] = { ..._roles[idx], ...updated };
        _roles.sort((a,b) => a.name.localeCompare(b.name));
      }
      
      localStorage.setItem('brisk_roles', JSON.stringify(_roles));
      await createOrUpdateSystemRolesInDb(_roles, _positions);
    },
    deleteRole: async function(id) {
      _roles = _roles.filter(r => r.id !== id);
      localStorage.setItem('brisk_roles', JSON.stringify(_roles));
      await createOrUpdateSystemRolesInDb(_roles, _positions);
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
      if (!tc.id) {
        tc.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      }
      try {
        const { data, error } = await supabase.from('brisk_timecards').insert(mapTimecardToDb(tc)).select().single();
        if (error) throw error;
        const mapped = mapTimecardFromDb(data);
        const existing = _timecards.findIndex(t => t.id === mapped.id);
        if (existing !== -1) _timecards[existing] = mapped;
        else _timecards.push(mapped);
        return mapped;
      } catch (err) {
        console.warn('[BriskDB] addTimecard offline fallback:', err);
        const existing = _timecards.findIndex(t => t.id === tc.id);
        if (existing !== -1) _timecards[existing] = tc;
        else _timecards.push(tc);
        enqueueOfflineOperation('add', tc);
        return tc;
      }
    },
    updateTimecard: async function(updated) {
      try {
        const { error } = await supabase.from('brisk_timecards').update(mapTimecardToDb(updated)).eq('id', updated.id);
        if (error) throw error;
        const idx = _timecards.findIndex(t => t.id === updated.id);
        if (idx !== -1) _timecards[idx] = { ..._timecards[idx], ...updated };
        else _timecards.push(updated);
      } catch (err) {
        console.warn('[BriskDB] updateTimecard offline fallback:', err);
        const idx = _timecards.findIndex(t => t.id === updated.id);
        if (idx !== -1) _timecards[idx] = { ..._timecards[idx], ...updated };
        else _timecards.push(updated);
        enqueueOfflineOperation('update', updated);
      }
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
      _settings = { ..._settings, ...settings };
      const { error } = await supabase.from('brisk_settings').upsert(mapSettingsToDb(_settings));
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
        shifts: [..._shifts, ..._historicalShifts],
        timecards: [..._timecards, ..._historicalTimecards],
        leaveRequests: [..._leaveRequests, ..._historicalLeaveRequests],
        settings: _settings,
        exportedAt: new Date().toISOString()
      }, null, 2);
    },

    getOfflineQueueLength: function() {
      return _offlineQueue.length;
    },

    syncOfflineQueue: async function() {
      await processOfflineQueue();
    }
  };
})();

window.BriskDB = BriskDB;
export default BriskDB;
