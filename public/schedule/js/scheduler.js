/**
 * BriskSchedules Auto-Scheduling Algorithm
 */
const BriskScheduler = (function() {
  
  // Helper: Convert shift to absolute start and end dates
  function shiftToDateRanges(dateStr, startStr, endStr) {
    const start = new Date(`${dateStr}T${startStr}:00`);
    const end = new Date(`${dateStr}T${endStr}:00`);
    if (end <= start) {
      end.setDate(end.getDate() + 1); // Overnight shift
    }
    return { start, end };
  }

  // Helper: check if two time ranges overlap
  function isOverlapping(date1, start1, end1, date2, start2, end2) {
    const r1 = shiftToDateRanges(date1, start1, end1);
    const r2 = shiftToDateRanges(date2, start2, end2);
    return r1.start < r2.end && r2.start < r1.end;
  }

  // Helper: Parse HH:MM to decimal hours
  function timeToDecimal(timeStr) {
    if (typeof timeStr !== 'string' || !timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
  }

  // Helper: Calculate shift duration in hours
  function getShiftDuration(start, end) {
    let diff = timeToDecimal(end) - timeToDecimal(start);
    if (diff < 0) diff += 24; // Handle overnight shifts
    return diff;
  }

  // Helper: Check if date falls in a leave range
  function isEmployeeOnLeave(employeeId, dateStr, leaveRequests) {
    const date = new Date(dateStr);
    return leaveRequests.some(req => {
      if (req.employeeId !== employeeId || req.status !== 'Approved') return false;
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      // Set hours to zero for clean comparison
      date.setHours(0,0,0,0);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      return date >= start && date <= end;
    });
  }

  // Helper: Get day of week index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  function getDayOfWeekIndex(dateStr) {
    // Treat dateStr "YYYY-MM-DD" local time properly
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.getDay();
  }

  // Heuristic Solver for Employee Shift Assignment
  function runAutoSchedule(shifts, employees, leaveRequests, targetWeekStartStr, timecards = [], clearFuture = true) {
    // 1. Filter shifts for the target week
    const targetWeekStart = new Date(targetWeekStartStr);
    const targetWeekEnd = new Date(targetWeekStart);
    targetWeekEnd.setDate(targetWeekStart.getDate() + 6);
    
    // Set boundaries
    targetWeekStart.setHours(0,0,0,0);
    targetWeekEnd.setHours(23,59,59,999);

    const weekShifts = shifts.filter(s => {
      const sDate = new Date(s.date);
      sDate.setHours(0,0,0,0);
      return sDate >= targetWeekStart && sDate <= targetWeekEnd;
    });

    if (weekShifts.length === 0) {
      return { success: false, message: 'No shifts found for this week to schedule. Please add empty shifts first.' };
    }

    // Keep track of employee hours scheduled so far this week
    const scheduledHours = {};
    const employeeLeaves = new Set();
    
    // Precompute Leaves for O(1) lookup
    leaveRequests.forEach(req => {
      if (req.status !== 'Approved') return;
      let d = new Date(req.startDate);
      const end = new Date(req.endDate);
      d.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      while(d <= end) {
        const localDateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        employeeLeaves.add(`${req.employeeId}_${localDateStr}`);
        d.setDate(d.getDate() + 1);
      }
    });

    const employeeSchedules = {}; // { empId_date: [shift, shift] }

    const today = new Date();
    today.setHours(0,0,0,0);

    employees.forEach(emp => {
      let pastHours = 0;
      // Actual hours from approved timecards (for past days)
      const empTimecards = timecards.filter(tc => {
        if (tc.employeeId !== emp.id || !tc.approved) return false;
        const tcDate = new Date(tc.date);
        tcDate.setHours(0,0,0,0);
        return tcDate >= targetWeekStart && tcDate <= targetWeekEnd && tcDate < today;
      });
      empTimecards.forEach(tc => {
        pastHours += tc.totalHours;
      });

      // Also add hours for past shifts this week if they haven't been clocked (fallback)
      const pastShifts = weekShifts.filter(s => {
        if (s.employeeId !== emp.id) return false;
        const sDate = new Date(s.date);
        sDate.setHours(0,0,0,0);
        return sDate < today;
      });
      pastShifts.forEach(s => {
        // If there's no approved timecard for this date, count the scheduled shift
        const hasTimecard = empTimecards.some(tc => tc.date === s.date);
        if (!hasTimecard) {
          pastHours += getShiftDuration(s.startTime, s.endTime);
        }
        
        // Add past shifts to schedules to prevent overlapping bugs if checked later
        const scheduleKey = `${emp.id}_${s.date}`;
        if (!employeeSchedules[scheduleKey]) employeeSchedules[scheduleKey] = [];
        employeeSchedules[scheduleKey].push(s);
      });

      scheduledHours[emp.id] = pastHours;
    });

    // Unassign shifts that are in the future/today (if clearFuture is true)
    weekShifts.forEach(s => {
      const sDate = new Date(s.date);
      sDate.setHours(0,0,0,0);
      
      if (clearFuture && sDate >= today) {
        s.employeeId = null;
      }
      
      // If a future shift is ALREADY assigned (e.g. clearFuture=false), track its hours and schedule!
      if (s.employeeId !== null && sDate >= today) {
        scheduledHours[s.employeeId] += getShiftDuration(s.startTime, s.endTime);
        const scheduleKey = `${s.employeeId}_${s.date}`;
        if (!employeeSchedules[scheduleKey]) employeeSchedules[scheduleKey] = [];
        employeeSchedules[scheduleKey].push(s);
      }
    });

    // We only want to automatically assign shifts that have no employee
    const shiftsToAssign = weekShifts.filter(s => s.employeeId === null);

    // Sort shifts: prioritize roles with fewer available employees, or longer shifts first (Most Constrained Variable heuristic)
    // For simplicity, sort by duration descending (longer shifts are harder to place)
    const sortedShifts = [...shiftsToAssign].sort((a, b) => {
      const durA = getShiftDuration(a.startTime, a.endTime);
      const durB = getShiftDuration(b.startTime, b.endTime);
      return durB - durA;
    });

    let assignedCount = 0;
    const logs = [];
    const modifiedShifts = [];

    // 2. Loop and Assign
    sortedShifts.forEach(shift => {
      try {
        const shiftDuration = getShiftDuration(shift.startTime, shift.endTime);
        const dayIdx = getDayOfWeekIndex(shift.date);
        
        // Find candidate employees
        const candidates = employees.filter(emp => {
          if (!emp.active) return false;

          // Constraint A: Role match (strict array inclusion)
          const employeeRoles = Array.isArray(emp.role) 
            ? emp.role.map(r => r.toLowerCase()) 
            : (emp.role || '').split(',').map(r => r.trim().toLowerCase());
          const shiftRole = shift.role ? shift.role.toLowerCase() : '';
          if (!employeeRoles.includes(shiftRole)) return false;

          // Constraint B: Availability for that day of the week
          const dayAvail = emp.availability[dayIdx];
          if (!dayAvail) return false; // Unavailable on this weekday

          let empStartDec = timeToDecimal(dayAvail.start);
          let empEndDec = timeToDecimal(dayAvail.end);
          let shiftStartDec = timeToDecimal(shift.startTime);
          let shiftEndDec = timeToDecimal(shift.endTime);
          
          if (empStartDec === empEndDec) empEndDec = 24; // Handle open availability

          if (shiftEndDec < shiftStartDec) shiftEndDec += 24;
          let availEndDec = empEndDec;
          if (availEndDec < empStartDec) availEndDec += 24;
          
          if (shiftStartDec < empStartDec && availEndDec > 24) { 
            shiftStartDec += 24; 
            shiftEndDec += 24; 
          }

          if (shiftStartDec < empStartDec || shiftEndDec > availEndDec) return false; // Shift falls outside employee hours

          // Constraint C: Approved Time Off (Leave)
          if (employeeLeaves.has(`${emp.id}_${shift.date}`)) return false;

          // Constraint D: Max Hours Limit
          if (scheduledHours[emp.id] + shiftDuration > emp.maxHours) return false;

          // Constraint E: Overlapping Shifts for this employee on this day
          const adjShifts = employeeSchedules[`${emp.id}_${shift.date}`] || [];
          if (adjShifts.some(otherShift => isOverlapping(shift.date, shift.startTime, shift.endTime, otherShift.date, otherShift.startTime, otherShift.endTime))) {
            return false;
          }

          return true;
        });

        // Sort candidates by least scheduled hours (load balancing)
        candidates.sort((a, b) => scheduledHours[a.id] - scheduledHours[b.id]);

        if (candidates.length > 0) {
          const chosen = candidates[0];
          shift.employeeId = chosen.id;
          scheduledHours[chosen.id] += shiftDuration;
          
          const scheduleKey = `${chosen.id}_${shift.date}`;
          if (!employeeSchedules[scheduleKey]) employeeSchedules[scheduleKey] = [];
          employeeSchedules[scheduleKey].push(shift);

          assignedCount++;
        } else {
          logs.push(`Could not find suitable employee for ${shift.role} on ${shift.date} (${shift.startTime}-${shift.endTime})`);
        }
      } catch (e) {
        logs.push(`Failed to process shift on ${shift.date}: ${e.message}`);
      }
    });

    // 3. Apply changes back to the original shifts array and track modified
    shifts.forEach(origShift => {
      const matched = weekShifts.find(s => s.id === origShift.id);
      if (matched && origShift.employeeId !== matched.employeeId) {
        origShift.employeeId = matched.employeeId;
        modifiedShifts.push(origShift);
      }
    });

    return {
      success: true,
      assignedCount: assignedCount,
      shifts: modifiedShifts,
      logs: logs
    };
  }

  return {
    run: runAutoSchedule,
    getShiftDuration: getShiftDuration,
    isOverlapping: isOverlapping
  };
})();

export default BriskScheduler;
