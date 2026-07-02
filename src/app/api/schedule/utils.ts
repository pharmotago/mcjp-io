import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../firebase-admin';

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

// Authentication Check Helper - extracts and verifies Firebase ID Token from Authorization header
export async function getRequestUser(req: NextRequest) {
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
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Fetch the user role document from Firestore to get their role and employeeId
    const userDoc = await adminDb
      .collection('organizations')
      .doc('amcal_woywoy')
      .collection('users')
      .doc(decodedToken.uid)
      .get();
      
    if (!userDoc.exists) {
      return {
        role: '',
        employeeId: '',
        email: decodedToken.email || '',
        isAuthenticated: false
      };
    }
    
    const userData = userDoc.data() || {};
    return {
      role: userData.role || '',
      employeeId: userData.employeeId || '',
      email: decodedToken.email || '',
      isAuthenticated: true
    };
  } catch (err) {
    return {
      role: '',
      employeeId: '',
      email: '',
      isAuthenticated: false
    };
  }
}
