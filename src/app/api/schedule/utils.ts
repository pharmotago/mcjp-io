import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const SALT = 'brisk_salt_key_2026';

// PBKDF2 Password Hashing
export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 1000, 64, 'sha512').toString('hex');
}

// Simple Helper to return JSON Response with CORS Headers
export function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-role, x-employee-id, x-user-email'
    }
  });
}

// Authentication Check Helper
export function getRequestUser(req: NextRequest) {
  const role = req.headers.get('x-user-role') || '';
  const employeeId = req.headers.get('x-employee-id') || '';
  const email = req.headers.get('x-user-email') || '';

  return {
    role, // 'owner', 'manager', 'employee' or empty
    employeeId,
    email,
    isAuthenticated: email !== '' && role !== ''
  };
}
