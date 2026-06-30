import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const SALT = 'brisk_salt_key_2026';
const JWT_SECRET = process.env.JWT_SECRET || 'amcal-super-secret-key-2026';

// Upgrade PBKDF2 password hashing to 100,000 iterations for secure password protection
export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 100000, 64, 'sha512').toString('hex');
}

// Generate a cryptographically signed stateless JWT token (HMAC-SHA256) valid for 7 days
export function signToken(payload: { email: string; role: string; employeeId: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days expiry
  })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  return `${header}.${body}.${signature}`;
}

// Verify a stateless JWT token and return its payload, or null if invalid/expired
export function verifyToken(token: string): { email: string; role: string; employeeId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null; // expired
    
    return payload;
  } catch {
    return null;
  }
}

// Simple Helper to return JSON Response with CORS Headers
export function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Authentication Check Helper - extracts and cryptographically verifies token from Authorization header
export function getRequestUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      role: '',
      employeeId: '',
      email: '',
      isAuthenticated: false
    };
  }
  
  const token = authHeader.substring(7); // strip "Bearer "
  const payload = verifyToken(token);
  
  if (!payload) {
    return {
      role: '',
      employeeId: '',
      email: '',
      isAuthenticated: false
    };
  }
  
  return {
    role: payload.role, // 'owner', 'manager', 'employee'
    employeeId: payload.employeeId,
    email: payload.email,
    isAuthenticated: true
  };
}
