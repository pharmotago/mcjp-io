import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '../../firebase-admin';
import { getRequestUser, jsonResponse } from '../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req);

    // Issue 4: Separate 401 (expired/missing token) from 403 (wrong role)
    if (!user.isAuthenticated) {
      return jsonResponse({ error: 'Session expired or invalid. Please log in again.' }, 401);
    }

    if (user.role !== 'owner' && user.role !== 'manager') {
      return jsonResponse({ error: 'Access denied. Managers or owners only.' }, 403);
    }

    // Issue 3: Pre-flight check for SMTP credentials
    if (!process.env.SMTP_PASS) {
      return jsonResponse({ error: 'Email service is not configured. SMTP credentials are missing on the server.' }, 503);
    }

    const { employeeId, weekStart, rosterText } = await req.json();

    if (!employeeId || !rosterText) {
      return jsonResponse({ error: 'employeeId and rosterText are required.' }, 400);
    }

    // Fetch employee details from Firestore
    const employeeDoc = await adminDb
      .collection('organizations')
      .doc('amcal_woywoy')
      .collection('employees')
      .doc(employeeId)
      .get();

    if (!employeeDoc.exists) {
      return jsonResponse({ error: 'Employee not found.' }, 404);
    }

    const employee = employeeDoc.data();
    if (!employee || !employee.email) {
      return jsonResponse({ error: 'Employee profile has no email address.' }, 400);
    }

    // Configure Hostinger SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true, // true for port 465
      auth: {
        user: process.env.SMTP_USER || 'welcome@mcjp.io',
        pass: process.env.SMTP_PASS || ''
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

  } catch (err: unknown) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
