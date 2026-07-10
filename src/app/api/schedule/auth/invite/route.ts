import { NextRequest } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../../../supabase-admin';
import { getRequestUser, jsonResponse } from '../../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const requester = await getRequestUser(req);

    // Permission check: Only managers or owners can create invitations
    if (!requester.isAuthenticated || (requester.role !== 'owner' && requester.role !== 'manager')) {
      return jsonResponse({ error: 'Access denied. Managers or owners only.' }, 403);
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return jsonResponse({ error: 'Email and role are required.' }, 400);
    }

    if (role !== 'manager' && role !== 'employee') {
      return jsonResponse({ error: 'Invalid role. Choose manager or employee.' }, 400);
    }

    // Generate unique 6 character code
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Store in Supabase brisk_invitations table
    const { error } = await supabaseAdmin
      .from('brisk_invitations')
      .insert({
        code,
        email: email.toLowerCase().trim(),
        role,
        used: false
      });

    if (error) throw error;

    const inviteUrl = `https://schedule.mcjp.io/?invite=${code}`;

    // Send invitation email if SMTP is configured
    if (process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_USER || 'welcome@mcjp.io',
            pass: process.env.SMTP_PASS
          }
        });

        const mailOptions = {
          from: `"BriskSchedules" <${process.env.SMTP_USER || 'welcome@mcjp.io'}>`,
          to: email.toLowerCase().trim(),
          subject: `✉️ Invitation to join Amcal Pharmacy Woywoy Rosters`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #e67e22; border-bottom: 2px solid #e67e22; padding-bottom: 10px; margin-top: 0;">Welcome to Amcal Pharmacy!</h2>
              <p>You have been invited by your manager to join the <strong>Amcal Pharmacy Woywoy Rosters</strong> scheduling system as a <strong>${role}</strong>.</p>
              <p>Please click the button below to accept your invitation and register your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #e67e22; color: white; padding: 14px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Accept Invitation</a>
              </div>
              <p style="font-size: 14px; color: #555;">If the button above does not work, copy and paste this link into your browser:</p>
              <p style="font-family: monospace; font-size: 13px; background-color: #f9f9f9; padding: 10px; border-radius: 4px; word-break: break-all;"><a href="${inviteUrl}">${inviteUrl}</a></p>
              <p style="font-size: 14px; color: #555;">Or use this invitation code during registration: <strong>${code}</strong></p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #888; font-size: 12px; margin: 0;">This is an automated invitation from BriskSchedules.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error('Failed to send invitation email:', mailErr);
        // We do not fail the request if only the email sending failed to prevent blocking code generation
      }
    }

    return jsonResponse({
      success: true,
      code,
      inviteUrl: `https://schedule.mcjp.io/?invite=${code}`
    }, 200);

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
}
