/**
 * BriskSchedules Cloud Database & Sync Layer — Firebase Firestore Real-time implementation
 */
import { auth, db, ORG_ID, signInWithEmailAndPassword, signOut, onAuthStateChanged,
         collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
         onSnapshot, query, where, serverTimestamp } from './firebase.js';

const BriskDB = (function() {
  const STORAGE_KEYS = {
    SESSION: 'brisk_session'
  };

  let _employees = [];
  let _shifts = [];
  let _timecards = [];
  let _leaveRequests = [];
  let _settings = { companyName: 'Amcal Pharmacy Woywoy Rosters' };

  let _listeners = [];
  let _initialLoadCompleted = {
    employees: false,
    shifts: false,
    timecards: false,
    leaveRequests: false
  };
  let _resolveInitialLoad = null;
  const _initialLoadPromise = new Promise((resolve) => {
    _resolveInitialLoad = resolve;
  });

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
      // Detach all listeners
      _listeners.forEach(unsub => unsub());
      _listeners = [];
      signOut(auth).catch(err => console.warn('Firebase signOut failed:', err));
    }
  }

  function checkInitialLoadCompletion() {
    if (_initialLoadCompleted.employees &&
        _initialLoadCompleted.shifts &&
        _initialLoadCompleted.timecards &&
        _initialLoadCompleted.leaveRequests) {
      if (_resolveInitialLoad) {
        _resolveInitialLoad(true);
      }
    }
  }

  // Set up real-time onSnapshot listeners
  function setupListeners() {
    const session = getSession();
    if (!session) return;

    // Clear previous listeners
    _listeners.forEach(unsub => unsub());
    _listeners = [];

    const employeesCol = collection(db, 'organizations', ORG_ID, 'employees');
    const shiftsCol = collection(db, 'organizations', ORG_ID, 'shifts');
    const timecardsCol = collection(db, 'organizations', ORG_ID, 'timecards');
    const leaveRequestsCol = collection(db, 'organizations', ORG_ID, 'leave_requests');

    // 1. Employees Listener
    const unsubEmployees = onSnapshot(employeesCol, (snapshot) => {
      _employees = [];
      snapshot.forEach(doc => {
        _employees.push({ ...doc.data(), id: doc.id });
      });
      _initialLoadCompleted.employees = true;
      checkInitialLoadCompletion();
      window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'employees' } }));
    }, (err) => console.error('Employees listener error:', err));
    _listeners.push(unsubEmployees);

    // 2. Shifts Listener
    const unsubShifts = onSnapshot(shiftsCol, (snapshot) => {
      _shifts = [];
      snapshot.forEach(doc => {
        _shifts.push({ ...doc.data(), id: doc.id });
      });
      _initialLoadCompleted.shifts = true;
      checkInitialLoadCompletion();
      window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'shifts' } }));
    }, (err) => console.error('Shifts listener error:', err));
    _listeners.push(unsubShifts);

    // 3. Timecards Listener
    const unsubTimecards = onSnapshot(timecardsCol, (snapshot) => {
      _timecards = [];
      snapshot.forEach(doc => {
        _timecards.push({ ...doc.data(), id: doc.id });
      });
      _initialLoadCompleted.timecards = true;
      checkInitialLoadCompletion();
      window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'timecards' } }));
    }, (err) => console.error('Timecards listener error:', err));
    _listeners.push(unsubTimecards);

    // 4. Leave Requests Listener
    const unsubLeave = onSnapshot(leaveRequestsCol, (snapshot) => {
      _leaveRequests = [];
      snapshot.forEach(doc => {
        _leaveRequests.push({ ...doc.data(), id: doc.id });
      });
      _initialLoadCompleted.leaveRequests = true;
      checkInitialLoadCompletion();
      window.dispatchEvent(new CustomEvent('brisk-db-updated', { detail: { type: 'leave_requests' } }));
    }, (err) => console.error('Leave requests listener error:', err));
    _listeners.push(unsubLeave);
  }

  // Triggered on app load
  async function syncFromServer() {
    const session = getSession();
    if (!session) return false;

    setupListeners();

    // Await either initial snapshot trigger or max 2 seconds fallback
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(true), 2000));
    await Promise.race([_initialLoadPromise, timeoutPromise]);
    return true;
  }

  // Dummy function for compatibility
  async function syncToServer() {
    return true;
  }

  // Cloud API Call wrapper for Login using Client SDK
  async function apiLogin(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      // Get user role document from Firestore
      const userDocRef = doc(db, 'organizations', ORG_ID, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error('User profile record not found in database.');
      }

      const userData = userDoc.data();
      const session = {
        email: user.email,
        role: userData.role,
        employeeId: userData.employeeId || null,
        name: userData.name || 'Staff Member',
        token: idToken
      };

      setSession(session);
      setupListeners();
      return session;
    } catch (err) {
      return { error: err.message };
    }
  }

  // Registration uses Next.js API route
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

  // Auto setup listeners on script load if session exists
  if (getSession()) {
    setupListeners();
  }

  return {
    getSession,
    setSession,
    syncFromServer,
    syncToServer,
    apiLogin,
    apiRegister,
    apiGenerateInvite,
    apiSendRosterEmail,

    getEmployees: () => _employees,
    getShifts: () => _shifts,
    getTimecards: () => _timecards,
    getLeaveRequests: () => _leaveRequests,
    getSettings: () => _settings,

    addEmployee: async function(emp) {
      const colRef = collection(db, 'organizations', ORG_ID, 'employees');
      const docRef = doc(colRef);
      const newEmp = { ...emp, id: docRef.id, active: true };
      await setDoc(docRef, newEmp);
    },
    updateEmployee: async function(updated) {
      const docRef = doc(db, 'organizations', ORG_ID, 'employees', updated.id);
      await updateDoc(docRef, updated);
    },
    deleteEmployee: async function(id) {
      const docRef = doc(db, 'organizations', ORG_ID, 'employees', id);
      await deleteDoc(docRef);
    },

    addShift: async function(shift) {
      const colRef = collection(db, 'organizations', ORG_ID, 'shifts');
      const docRef = doc(colRef);
      const newShift = { ...shift, id: docRef.id };
      await setDoc(docRef, newShift);
    },
    updateShift: async function(updated) {
      const docRef = doc(db, 'organizations', ORG_ID, 'shifts', updated.id);
      await updateDoc(docRef, updated);
    },
    deleteShift: async function(id) {
      const docRef = doc(db, 'organizations', ORG_ID, 'shifts', id);
      await deleteDoc(docRef);
    },

    addTimecard: async function(tc) {
      const colRef = collection(db, 'organizations', ORG_ID, 'timecards');
      const docRef = doc(colRef);
      const newTc = { ...tc, id: docRef.id };
      await setDoc(docRef, newTc);
    },
    updateTimecard: async function(updated) {
      const docRef = doc(db, 'organizations', ORG_ID, 'timecards', updated.id);
      await updateDoc(docRef, updated);
    },

    addLeaveRequest: async function(lr) {
      const colRef = collection(db, 'organizations', ORG_ID, 'leave_requests');
      const docRef = doc(colRef);
      const newLr = { ...lr, id: docRef.id, status: 'Pending' };
      await setDoc(docRef, newLr);
    },
    updateLeaveRequest: async function(updated) {
      const docRef = doc(db, 'organizations', ORG_ID, 'leave_requests', updated.id);
      await updateDoc(docRef, updated);
    },

    saveSettings: function(settings) {
      _settings = settings;
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
