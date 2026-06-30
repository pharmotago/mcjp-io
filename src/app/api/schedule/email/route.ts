import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '../../supabase';
import { getRequestUser, jsonResponse } from '../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);

    // Permission check: Only managers or owners can send roster emails
    if (!user.isAuthenticated || (user.role !== 'owner' && user.role !== 'manager')) {
      return jsonResponse({ error: 'Access denied. Managers or owners only.' }, 403);
    }

    const { employeeId, weekStart, rosterText } = await req.json();

    if (!employeeId || !rosterText) {
      return jsonResponse({ error: 'employeeId and rosterText are required.' }, 400);
    }

    // Fetch employee details
    const { data: employee, error: empError } = await supabase
      .from('brisk_employees')
      .select('name, email')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return jsonResponse({ error: `Employee not found: ${empError?.message}` }, 404);
    }

    if (!employee.email) {
      return jsonResponse({ error: 'Employee profile has no email address.' }, 400);
    }

    // Configure Hostinger SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true, // true for port 465
      auth: {
        user: 'welcome@mcjp.io',
        pass: 'Lynden5620968.'
      }
    });

    const mailOptions = {
      from: '"BriskSchedules" <welcome@mcjp.io>',
      to: employee.email,
      subject: `📅 Your Work Schedule Briefing — Week of ${weekStart}`,
      text: rosterText,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #e67e22;">Hello, ${employee.name}!</h2>
          <p>Here is your work schedule briefing for the week starting on <strong>${weekStart}</strong>:</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <pre style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; font-size: 14px;">${rosterText}</pre>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">Please log into the <a href="https://schedule.mcjp.io" style="color: #e67e22; text-decoration: none; font-weight: bold;">BriskSchedules portal</a> to review and submit leave requests or clock in/out.</p>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return jsonResponse({
      success: true,
      message: `Roster email successfully sent to ${employee.name} (${employee.email}).`
    }, 200);

  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
}
