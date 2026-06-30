import { NextRequest } from 'next/server';
import { supabase } from '../../supabase';
import { getRequestUser, jsonResponse } from '../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

// 1. GET - Fetch data based on user role
export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);

    if (!user.isAuthenticated) {
      return jsonResponse({ error: 'Unauthorized.' }, 401);
    }

    if (user.role === 'owner' || user.role === 'manager') {
      // MANAGER/OWNER ACCESS: Fetch all details
      const [empRes, shiftRes, cardRes, leaveRes] = await Promise.all([
        supabase.from('brisk_employees').select('*').order('name'),
        supabase.from('brisk_shifts').select('*'),
        supabase.from('brisk_timecards').select('*'),
        supabase.from('brisk_leave_requests').select('*')
      ]);

      return jsonResponse({
        employees: empRes.data || [],
        shifts: shiftRes.data || [],
        timecards: cardRes.data || [],
        leaveRequests: leaveRes.data || []
      }, 200);

    } else {
      // EMPLOYEE ACCESS: Restricted details (no hourly rates, only own timecards/leaves)
      const [empRes, shiftRes, cardRes, leaveRes] = await Promise.all([
        supabase.from('brisk_employees').select('id, name, email, role, availability, active').order('name'),
        supabase.from('brisk_shifts').select('*'), // Employees can see the general team roster
        supabase.from('brisk_timecards').select('*').eq('employee_id', user.employeeId),
        supabase.from('brisk_leave_requests').select('*').eq('employee_id', user.employeeId)
      ]);

      return jsonResponse({
        employees: empRes.data || [],
        shifts: shiftRes.data || [],
        timecards: cardRes.data || [],
        leaveRequests: leaveRes.data || []
      }, 200);
    }

  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 2. POST - Sync/Save changes based on user role
export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);

    if (!user.isAuthenticated) {
      return jsonResponse({ error: 'Unauthorized.' }, 401);
    }

    const body = await req.json();

    if (user.role === 'owner' || user.role === 'manager') {
      // MANAGER/OWNER SYNC: Full database upsert
      const { employees, shifts, timecards, leaveRequests, deletedShifts, deletedEmployees } = body;

      // Handle Deleted items first
      if (deletedShifts && deletedShifts.length > 0) {
        await supabase.from('brisk_shifts').delete().in('id', deletedShifts);
      }
      if (deletedEmployees && deletedEmployees.length > 0) {
        await supabase.from('brisk_employees').delete().in('id', deletedEmployees);
      }

      // Sync Employees
      if (employees && employees.length > 0) {
        const formattedEmps = employees.map((e: any) => ({
          id: e.id.startsWith('emp_') ? undefined : e.id, // let postgres generate UUID if it's a temp client ID
          name: e.name,
          email: e.email.toLowerCase(),
          role: e.role,
          hourly_rate: parseFloat(e.hourlyRate),
          max_hours: parseInt(e.maxHours),
          availability: e.availability,
          active: e.active
        }));
        await supabase.from('brisk_employees').upsert(formattedEmps);
      }

      // Sync Shifts
      if (shifts && shifts.length > 0) {
        const formattedShifts = shifts.map((s: any) => ({
          id: s.id.startsWith('shift_') ? undefined : s.id,
          employee_id: s.employeeId && s.employeeId.startsWith('emp_') ? null : s.employeeId,
          date: s.date,
          start_time: s.startTime,
          end_time: s.endTime,
          role: s.role,
          notes: s.notes
        }));
        await supabase.from('brisk_shifts').upsert(formattedShifts);
      }

      // Sync Timecards
      if (timecards && timecards.length > 0) {
        const formattedCards = timecards.map((tc: any) => ({
          id: tc.id.startsWith('tc_') ? undefined : tc.id,
          employee_id: tc.employeeId,
          date: tc.date,
          clock_in: tc.clockIn,
          clock_out: tc.clockOut,
          breaks: tc.breaks,
          total_hours: parseFloat(tc.totalHours),
          approved: tc.approved,
          approved_by: tc.approvedBy
        }));
        await supabase.from('brisk_timecards').upsert(formattedCards);
      }

      // Sync Leave Requests
      if (leaveRequests && leaveRequests.length > 0) {
        const formattedLeaves = leaveRequests.map((lr: any) => ({
          id: lr.id.startsWith('leave_') ? undefined : lr.id,
          employee_id: lr.employeeId,
          start_date: lr.startDate,
          end_date: lr.endDate,
          reason: lr.reason,
          status: lr.status
        }));
        await supabase.from('brisk_leave_requests').upsert(formattedLeaves);
      }

      return jsonResponse({ success: true, message: 'All data synchronized successfully.' }, 200);

    } else {
      // EMPLOYEE SYNC: Only allow editing own timecards and creating own leave requests
      const { type, data } = body;

      if (type === 'timecard') {
        // Enforce employee id matches session
        if (data.employeeId !== user.employeeId) {
          return jsonResponse({ error: 'Permission denied. Cannot modify other employee timecard.' }, 403);
        }

        const formattedCard = {
          id: data.id && data.id.startsWith('tc_') ? undefined : data.id,
          employee_id: user.employeeId,
          date: data.date,
          clock_in: data.clockIn,
          clock_out: data.clockOut,
          breaks: data.breaks,
          total_hours: parseFloat(data.totalHours),
          approved: false, // Employees cannot self-approve
          approved_by: null
        };

        const { error } = await supabase.from('brisk_timecards').upsert(formattedCard);
        if (error) return jsonResponse({ error: error.message }, 500);

        return jsonResponse({ success: true, message: 'Timecard saved.' }, 200);

      } else if (type === 'leave_request') {
        if (data.employeeId !== user.employeeId) {
          return jsonResponse({ error: 'Permission denied. Cannot modify other employee leave request.' }, 403);
        }

        const formattedLeave = {
          id: data.id && data.id.startsWith('leave_') ? undefined : data.id,
          employee_id: user.employeeId,
          start_date: data.startDate,
          end_date: data.endDate,
          reason: data.reason,
          status: 'Pending' // Always starts as Pending
        };

        const { error } = await supabase.from('brisk_leave_requests').upsert(formattedLeave);
        if (error) return jsonResponse({ error: error.message }, 500);

        return jsonResponse({ success: true, message: 'Leave request submitted.' }, 200);

      } else {
        return jsonResponse({ error: 'Action not allowed for employee role.' }, 403);
      }
    }

  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
}
