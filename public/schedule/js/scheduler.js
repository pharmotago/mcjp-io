/**
 * BriskSchedules Auto-Scheduling Algorithm
 */
const BriskScheduler = (function() {
  
  // Helper: check if two time ranges overlap
  // timeStr: "HH:MM"
  function isOverlapping(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
  }

  // Helper: Parse HH:MM to decimal hours
  function timeToDecimal(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  }

  // Helper: Calculate shift duration in hours
  function getShiftDuration(start, end) {
    return timeToDecimal(end) - timeToDecimal(start);
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
  function runAutoSchedule(shifts, employees, leaveRequests, targetWeekStartStr) {
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
    employees.forEach(emp => {
      scheduledHours[emp.id] = 0;
    });

    // Unassign all shifts that are NOT locked (we assume all are unlocked for this auto-scheduler, or can be cleared)
    weekShifts.forEach(s => {
      s.employeeId = null;
    });

    // Sort shifts: prioritize roles with fewer available employees, or longer shifts first (Most Constrained Variable heuristic)
    // For simplicity, sort by duration descending (longer shifts are harder to place)
    const sortedShifts = [...weekShifts].sort((a, b) => {
      const durA = getShiftDuration(a.startTime, a.endTime);
      const durB = getShiftDuration(b.startTime, b.endTime);
      return durB - durA;
    });

    let assignedCount = 0;
    const logs = [];

    // 2. Loop and Assign
    sortedShifts.forEach(shift => {
      const shiftDuration = getShiftDuration(shift.startTime, shift.endTime);
      const dayIdx = getDayOfWeekIndex(shift.date);
      
      // Find candidate employees
      const candidates = employees.filter(emp => {
        if (!emp.active) return false;

        // Constraint A: Role match (does employee roles include the shift role)
        // Match either exact or if employee role contains the shift role words
        const employeeRole = emp.role.toLowerCase();
        const shiftRole = shift.role.toLowerCase();
        const roleMatch = employeeRole.includes(shiftRole) || shiftRole.includes(employeeRole);
        if (!roleMatch) return false;

        // Constraint B: Availability for that day of the week
        const dayAvail = emp.availability[dayIdx];
        if (!dayAvail) return false; // Unavailable on this weekday

        const empStartDec = timeToDecimal(dayAvail.start);
        const empEndDec = timeToDecimal(dayAvail.end);
        const shiftStartDec = timeToDecimal(shift.startTime);
        const shiftEndDec = timeToDecimal(shift.endTime);

        if (shiftStartDec < empStartDec || shiftEndDec > empEndDec) return false; // Shift falls outside employee hours

        // Constraint C: Approved Time Off (Leave)
        if (isEmployeeOnLeave(emp.id, shift.date, leaveRequests)) return false;

        // Constraint D: Max Weekly Hours Limit
        if (scheduledHours[emp.id] + shiftDuration > emp.maxHours) return false;

        // Constraint E: Overlapping shifts on the same day
        const hasOverlap = weekShifts.some(otherShift => {
          return otherShift.employeeId === emp.id && 
                 otherShift.date === shift.date &&
                 isOverlapping(shift.startTime, shift.endTime, otherShift.startTime, otherShift.endTime);
        });
        if (hasOverlap) return false;

        return true;
      });

      // Select the best candidate (the one with the fewest hours scheduled so far)
      if (candidates.length > 0) {
        // Sort candidates by hours scheduled ascending
        candidates.sort((a, b) => scheduledHours[a.id] - scheduledHours[b.id]);
        const chosen = candidates[0];
        
        // Make the assignment
        shift.employeeId = chosen.id;
        scheduledHours[chosen.id] += shiftDuration;
        assignedCount++;
        logs.push(`Assigned ${chosen.name} to ${shift.role} on ${shift.date} (${shift.startTime}-${shift.endTime})`);
      } else {
        logs.push(`Could not find suitable employee for ${shift.role} on ${shift.date} (${shift.startTime}-${shift.endTime})`);
      }
    });

    // 3. Apply changes back to the original shifts array
    shifts.forEach(origShift => {
      const matched = weekShifts.find(s => s.id === origShift.id);
      if (matched) {
        origShift.employeeId = matched.employeeId;
      }
    });

    return {
      success: true,
      assignedCount: assignedCount,
      unassignedCount: weekShifts.length - assignedCount,
      logs: logs,
      shifts: shifts
    };
  }

  return {
    run: runAutoSchedule,
    getShiftDuration: getShiftDuration
  };
})();
