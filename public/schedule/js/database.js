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
    { id: 'role_floor', name: 'Floor', color: '#3b82f6' },
    { id: 'role_stock_receive', name: 'Stock Receive & Orders', color: '#06b6d4' },
    { id: 'role_stock_control', name: 'Stock Control & Gap Scan', color: '#8b5cf6' },
    { id: 'role_till_banking', name: 'Till Up & Banking', color: '#d97706' },
    { id: 'role_brand_strategy', name: 'Brand Strategy', color: '#ec4899' },
    { id: 'role_promotions', name: 'Promotions & Catalogue', color: '#f97316' },
    { id: 'role_displays', name: 'Promotional Ends & Displays', color: '#14b8a6' },
    { id: 'role_merchandising', name: 'Counter & Merchandising', color: '#6366f1' }
  ];

  let _positions = [];
  const DEFAULT_POSITIONS = [
    { id: 'pos_owner', name: 'Owner' },
    { id: 'pos_pm', name: 'Pharmacist Manager' },
    { id: 'pos_pharmacist', name: 'Pharmacist' },
    { id: 'pos_rm', name: 'Retail Manager' },
    { id: 'pos_dt', name: 'Dispense Technician' },
    { id: 'pos_pa', name: 'Pharmacy Assistant' },
    { id: 'pos_ra', name: 'Retail Associate' }
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
    try {
      const val = localStorage.getItem(STORAGE_KEYS.SESSION);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      console.warn('[DB] Stored session parsing failed:', e);
      return null;
    }
  }

  // Helper to get a valid token (refreshes via Supabase Client SDK if expired)
  async function getValidToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.access_token) {
        const localSession = getSession();
        if (localSession) {
          localSession.token = session.access_token;
          localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(localSession));
        }
        return session.access_token;
      }
    } catch (e) {
      console.warn('Failed to retrieve fresh session token:', e);
    }
    const localSession = getSession();
    return localSession ? localSession.token : '';
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
    if (emp.awardLevel) obj.award_level = emp.awardLevel;
    if (emp.employmentType) obj.employment_type = emp.employmentType;
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
      hourlyRate: parseFloat(emp.hourly_rate || 0) || 0,
      maxHours: parseInt(emp.max_hours || 38) || 38,
      awardLevel: emp.award_level || emp.awardLevel || 'custom',
      employmentType: emp.employment_type || emp.employmentType || 'permanent',
      availability: emp.availability,
      active: (emp.active !== undefined && emp.active !== null) ? !!emp.active : true
    };
  }

  function mapShiftToDb(shift) {
    const obj = {
      employee_id: shift.employeeId,
      date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      role: shift.role,
      notes: shift.notes
    };
    if (shift.status && shift.status !== 'draft') obj.status = shift.status;
    if (shift.unpaidMealMins !== undefined) obj.unpaid_meal_mins = shift.unpaidMealMins;
    if (shift.color) obj.color = shift.color;
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
      unpaidMealMins: shift.unpaid_meal_mins,
      color: shift.color,
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
      totalHours: (tc.total_hours != null && !isNaN(parseFloat(tc.total_hours))) ? parseFloat(tc.total_hours) : 0,
      approved: !!tc.approved,
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
    const payload = {
      id: 'global_settings',
      company_name: settings.companyName,
      trading_hours: settings.tradingHours
    };
    if (Array.isArray(settings.employeeOrder)) {
      payload.employee_order = settings.employeeOrder;
    }
    return payload;
  }

  function mapSettingsFromDb(settings) {
    if (!settings) return null;
    let order = settings.employee_order || [];
    if (!Array.isArray(order) || order.length === 0) {
      try {
        order = JSON.parse(localStorage.getItem('amcal_employee_order') || '[]');
      } catch (e) { order = []; }
    }
    return {
      companyName: settings.company_name,
      tradingHours: settings.trading_hours || DEFAULT_TRADING_HOURS,
      employeeOrder: order
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

  let _isProcessingQueue = false;
  async function processOfflineQueue() {
    if (_offlineQueue.length === 0 || _isProcessingQueue) return;
    
    const session = getSession();
    if (!session) return;
    
    _isProcessingQueue = true;
    try {
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
    } finally {
      _isProcessingQueue = false;
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
          try {
            _roles = JSON.parse(cachedRoles);
          } catch (e) {
            console.warn('[DB] Failed to parse cached roles:', e);
            _roles = [...DEFAULT_ROLES];
          }
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
          try {
            _positions = JSON.parse(cachedPositions);
          } catch (e) {
            console.warn('[DB] Failed to parse cached positions:', e);
            _positions = [...DEFAULT_POSITIONS];
          }
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

  // Registration — tries Vercel API route first, then direct Supabase client fallback
  async function apiRegister(email, password, name, inviteCode) {
    const targetEmail = (email || '').toLowerCase().trim();
    const code = (inviteCode || '').toUpperCase().trim();

    if (!targetEmail || !password || !name) {
      return { error: 'Email, password, and name are required.' };
    }
    if (!code) {
      return { error: 'An invitation code is required to register.' };
    }

    // ═══════════════════════════════════════════════════════
    // 1. Try serverless API route if available
    // ═══════════════════════════════════════════════════════
    try {
      const res = await fetch('/api/schedule/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password, name, inviteCode: code })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        // If API returned a valid JSON response (success or specific error), return it directly.
        // Do NOT throw to client fallback if the API gave us a valid business response!
        return data;
      }
      // If not JSON (HTML 404/502 fallback page returned), fall through to client fallback
    } catch (apiErr) {
      console.warn('API route unavailable for registration, using direct Supabase client fallback:', apiErr.message);
    }

    // ═══════════════════════════════════════════════════════
    // 2. Direct Supabase Client Fallback (100% reliable)
    //    Uses supabase.auth.signUp() with anon key
    // ═══════════════════════════════════════════════════════
    try {
      // 2a. Validate invite code FIRST (before creating Auth user)
      //     This prevents orphaned Auth users if the code is invalid.
      const { data: invite, error: inviteFindErr } = await supabase
        .from('brisk_invitations')
        .select('*')
        .eq('code', code)
        .eq('used', false)
        .maybeSingle();

      if (inviteFindErr || !invite) {
        return { error: 'Invalid or expired invitation code.' };
      }

      // Check email match if invite specifies one
      if (invite.email && invite.email.toLowerCase().trim() !== targetEmail) {
        return { error: 'This invitation code is registered for a different email address.' };
      }

      const targetRole = invite.role; // 'manager' or 'employee'

      // 2b. Now it's safe to create the Auth user
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: targetEmail,
        password: password,
        options: {
          data: { name: name },
          emailRedirectTo: 'https://woywoyamcalroster.vercel.app'
        }
      });

      if (signUpErr) {
        return { error: 'Failed to create account: ' + signUpErr.message };
      }

      if (!signUpData.user) {
        return { error: 'Failed to create account. Please try again.' };
      }

      const uid = signUpData.user.id;

      // 2c. Create Employee Profile
      const employeeData = {
        name: name,
        email: targetEmail,
        role: targetRole === 'manager' ? 'Pharmacist Manager' : 'Pharmacy Staff',
        hourly_rate: targetRole === 'manager' ? 85.00 : 25.00,
        max_hours: 38,
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
      };

      const { data: employee, error: empErr } = await supabase
        .from('brisk_employees')
        .insert(employeeData)
        .select()
        .maybeSingle();

      if (empErr || !employee) {
        console.error('Employee creation failed:', empErr);
        return { error: 'Failed to create employee profile: ' + (empErr ? empErr.message : 'Unknown error') };
      }

      // 2c. Create User Role mapping
      const { error: roleErr } = await supabase
        .from('brisk_users')
        .insert({
          id: uid,
          email: targetEmail,
          password_hash: 'SUPABASE_AUTH_MANAGED',
          role: targetRole,
          employee_id: employee.id,
          name: name
        });

      if (roleErr) {
        console.error('User role mapping failed:', roleErr);
        return { error: 'Failed to set up user permissions: ' + roleErr.message };
      }

      // 2d. Mark invitation as used
      await supabase
        .from('brisk_invitations')
        .update({ used: true })
        .eq('code', code);

      return { success: true, message: 'Account registered successfully.' };
    } catch (fallbackErr) {
      return { error: 'Registration failed: ' + fallbackErr.message };
    }
  }

  // Generate Invite
  async function apiGenerateInvite(email, role) {
    try {
      const normalizedEmail = (email || '').toLowerCase().trim();
      const requestedRole = role || 'employee';
      // Normalize role for brisk_invitations table check constraint ('manager' or 'employee')
      const dbRole = (requestedRole === 'owner' || requestedRole === 'manager') ? 'manager' : 'employee';

      // 1. Try serverless API route if available
      try {
        const token = await getValidToken();
        const res = await fetch('/api/schedule/auth/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ email: normalizedEmail, role: dbRole })
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          return data;
        }
      } catch (apiErr) {
        console.warn('API route unavailable, using direct Supabase client for invite:', apiErr.message);
      }

      // 2. Direct Supabase Client Fallback (100% reliable)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { error: dbErr } = await supabase
        .from('brisk_invitations')
        .insert({
          code,
          email: normalizedEmail,
          role: dbRole,
          used: false,
          created_at: new Date().toISOString()
        });

      let origin = window.location.origin || 'https://woywoyamcalroster.vercel.app';
      if (origin.includes('mcjp.io')) {
        origin = 'https://woywoyamcalroster.vercel.app';
      }
      return {
        success: true,
        code,
        inviteUrl: `${origin}/?invite=${code}`
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  // Send Roster Email
  async function apiSendRosterEmail(employeeId, weekStart, rosterText) {
    try {
      const token = await getValidToken();
      const res = await fetch('/api/schedule/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ employeeId, weekStart, rosterText })
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text || 'Non-JSON server response' };
      }
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
        const [sfsRes, tcsRes, lrsRes] = await Promise.all([
          supabase.from('brisk_shifts').select('*').gte('date', weekStartStr).lte('date', weekEndStr),
          supabase.from('brisk_timecards').select('*').gte('date', weekStartStr).lte('date', weekEndStr),
          supabase.from('brisk_leave_requests').select('*').gte('end_date', weekStartStr).lte('start_date', weekEndStr)
        ]);

        _historicalShifts = (sfsRes.data || []).map(mapShiftFromDb);
        _historicalTimecards = (tcsRes.data || []).map(mapTimecardFromDb);
        _historicalLeaveRequests = (lrsRes.data || []).map(mapLeaveRequestFromDb);

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
      const dbObj = mapEmployeeToDb(newEmp);
      let { data, error } = await supabase.from('brisk_employees').insert(dbObj).select().maybeSingle();
      if (error && error.message && (error.message.includes('award_level') || error.message.includes('employment_type'))) {
        delete dbObj.award_level;
        delete dbObj.employment_type;
        const retry = await supabase.from('brisk_employees').insert(dbObj).select().maybeSingle();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      return mapEmployeeFromDb(data);
    },
    updateEmployee: async function(updated) {
      const dbObj = mapEmployeeToDb(updated);
      let { error } = await supabase.from('brisk_employees').update(dbObj).eq('id', updated.id);
      if (error && error.message && (error.message.includes('award_level') || error.message.includes('employment_type'))) {
        delete dbObj.award_level;
        delete dbObj.employment_type;
        const retry = await supabase.from('brisk_employees').update(dbObj).eq('id', updated.id);
        error = retry.error;
      }
      if (error) throw error;
    },
    deleteEmployee: async function(id) {
      const { error } = await supabase.from('brisk_employees').update({ active: false }).eq('id', id);
      if (error) throw error;
    },

    addShift: async function(shift) {
      if (!shift.id) {
        shift.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'shift-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      }
      const dbObj = mapShiftToDb(shift);
      let { data, error } = await supabase.from('brisk_shifts').insert(dbObj).select().maybeSingle();
      if (error && error.message && error.message.includes('status')) {
        delete dbObj.status;
        const retry = await supabase.from('brisk_shifts').insert(dbObj).select().maybeSingle();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      const mapped = mapShiftFromDb(data || shift);
      const existing = _shifts.findIndex(s => s.id === mapped.id);
      if (existing !== -1) _shifts[existing] = mapped;
      else _shifts.push(mapped);
      return mapped;
    },
    updateShift: async function(updated) {
      const dbObj = mapShiftToDb(updated);
      let { error } = await supabase.from('brisk_shifts').update(dbObj).eq('id', updated.id);
      if (error && error.message && error.message.includes('status')) {
        delete dbObj.status;
        const retry = await supabase.from('brisk_shifts').update(dbObj).eq('id', updated.id);
        error = retry.error;
      }
      if (error) throw error;
      const idx = _shifts.findIndex(s => s.id === updated.id);
      if (idx !== -1) _shifts[idx] = { ..._shifts[idx], ...updated };
      return updated;
    },
    deleteShift: async function(id) {
      const { error } = await supabase.from('brisk_shifts').delete().eq('id', id);
      if (error) throw error;
      _shifts = _shifts.filter(s => s.id !== id);
    },
    batchUpdateShifts: async function(shiftsArray) {
      if (!shiftsArray || shiftsArray.length === 0) return;
      const mappedShifts = shiftsArray.map(mapShiftToDb);
      let { error } = await supabase.from('brisk_shifts').upsert(mappedShifts);
      if (error && error.message && error.message.includes('status')) {
        mappedShifts.forEach(s => delete s.status);
        const retry = await supabase.from('brisk_shifts').upsert(mappedShifts);
        error = retry.error;
      }
      if (error) throw error;

      // Optimistic in-memory update
      shiftsArray.forEach(updated => {
        const mapped = mapShiftFromDb(mapShiftToDb(updated));
        const idx = _shifts.findIndex(s => s.id === updated.id);
        if (idx !== -1) _shifts[idx] = { ..._shifts[idx], ...mapped };
        else _shifts.push(mapped);
      });
    },

    addTimecard: async function(tc) {
      if (!tc.id) {
        tc.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      }
      try {
        const { data, error } = await supabase.from('brisk_timecards').insert(mapTimecardToDb(tc)).select().maybeSingle();
        if (error) throw error;
        const mapped = mapTimecardFromDb(data || tc);
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
      if (!newLr.id) {
        newLr.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'lr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      }
      const { data, error } = await supabase.from('brisk_leave_requests').insert(mapLeaveRequestToDb(newLr)).select().maybeSingle();
      if (error) throw error;
      const mapped = mapLeaveRequestFromDb(data || newLr);
      const existing = _leaveRequests.findIndex(r => r.id === mapped.id);
      if (existing !== -1) _leaveRequests[existing] = mapped;
      else _leaveRequests.push(mapped);
      return mapped;
    },
    updateLeaveRequest: async function(updated) {
      const { error } = await supabase.from('brisk_leave_requests').update(mapLeaveRequestToDb(updated)).eq('id', updated.id);
      if (error) throw error;
      const idx = _leaveRequests.findIndex(r => r.id === updated.id);
      if (idx !== -1) _leaveRequests[idx] = { ..._leaveRequests[idx], ...updated };
    },

    saveSettings: async function(settings) {
      _settings = { ..._settings, ...settings };
      const { error } = await supabase.from('brisk_settings').upsert(mapSettingsToDb(_settings));
      if (error) console.error('Failed to save settings to Supabase:', error);
    },

    apiResetPasswordForEmail: async function(email) {
      try {
        const targetEmail = (email || '').toLowerCase().trim();
        if (!targetEmail) return { error: 'Email address is required.' };

        const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: 'https://woywoyamcalroster.vercel.app'
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
