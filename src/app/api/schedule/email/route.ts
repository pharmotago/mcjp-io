import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../../supabase-admin';
import { getRequestUser, jsonResponse } from '../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);

    // Permission check: Only managers or owners can send roster emails
    if (!user.isAuthenticated || (user.role !== 'owner' && user.role !== 'manager')) {
      return jsonResponse({ error: 'Access denied. Managers or owners only.' }, 403);
    }

    const { employeeId, weekStart, rosterText } = await req.json();

    if (!employeeId || !rosterText) {
      return jsonResponse({ error: 'employeeId and rosterText are required.' }, 400);
    }

    // Fetch employee details from Supabase brisk_employees
    const { data: employee, error: empErr } = await supabaseAdmin
      .from('brisk_employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle();

    if (empErr || !employee) {
      return jsonResponse({ error: 'Employee not found.' }, 404);
    }

    if (!employee.email) {
      return jsonResponse({ error: 'Employee profile has no email address.' }, 400);
    }

    if (!process.env.SMTP_PASS) {
      return jsonResponse({ error: 'SMTP not configured' }, 500);
    }

    // Configure Hostinger SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true, // true for port 465
      auth: {
        user: process.env.SMTP_USER || 'welcome@mcjp.io',
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"BriskSchedules" <${process.env.SMTP_USER || 'welcome@mcjp.io'}>`,
      to: employee.email,
      subject: `📅 Your Work Schedule Briefing — Week of ${weekStart}`,
      text: rosterText,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #e67e22;">Hello, ${employee.name}!</h2>
          <p>Your work schedule for the week of <strong>${weekStart}</strong> is ready.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e67e22;">
            <pre style="font-family: monospace; font-size: 14px; margin: 0; white-space: pre-wrap;">${rosterText}</pre>
          </div>
          <p>Please log in to your dashboard if you need to request any time off.</p>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">This is an automated message from BriskSchedules.</p>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return jsonResponse({
      success: true,
      message: `Roster email successfully sent to ${employee.name} (${employee.email}).`
    }, 200);

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return jsonResponse({ error: message }, 500);
  }
}
