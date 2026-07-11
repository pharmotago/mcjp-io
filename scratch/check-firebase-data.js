const admin = require('firebase-admin');
const fs = require('fs');

// Parse .env
const envText = fs.readFileSync('.env', 'utf8');
const lines = envText.split('\n');
const env = {};
lines.forEach(l => {
  const idx = l.indexOf('=');
  if (idx !== -1) {
    env[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
  }
});

const projectId = env['FIREBASE_ADMIN_PROJECT_ID'];
const clientEmail = env['FIREBASE_ADMIN_CLIENT_EMAIL'];
const privateKey = env['FIREBASE_ADMIN_PRIVATE_KEY'];

if (!projectId || !clientEmail || !privateKey) {
  console.log('Firebase credentials not found in env');
  process.exit(1);
}

const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey
  })
});

const db = admin.firestore();
const ORG_ID = 'amcal_woywoy';

async function check() {
  try {
    const orgRef = db.collection('organizations').doc(ORG_ID);
    
    console.log('=== FIREBASE EMPLOYEES ===');
    const empsSnap = await orgRef.collection('employees').get();
    console.log(`Found ${empsSnap.size} employees:`);
    empsSnap.forEach(doc => {
      console.log(`  - ${doc.id}: ${JSON.stringify(doc.data())}`);
    });

    console.log('\n=== FIREBASE SHIFTS ===');
    const shiftsSnap = await orgRef.collection('shifts').get();
    console.log(`Found ${shiftsSnap.size} shifts`);
    shiftsSnap.forEach(doc => {
      console.log(`  - ${doc.id}: ${JSON.stringify(doc.data())}`);
    });
  } catch (e) {
    console.error('Firebase query failed:', e.message);
  }
}

check();
