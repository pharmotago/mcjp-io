import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
// Normalize escaped newlines in private key
const formattedPrivateKey = privateKey ? privateKey.replace(/\\n/g, '\n') : undefined;

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: formattedPrivateKey,
      }),
    });
  } catch (err: any) {
    console.error('Firebase admin initialization failed:', err.message);
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
