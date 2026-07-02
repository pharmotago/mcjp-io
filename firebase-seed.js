require('dotenv').config({ path: '../.env' }); // Load root .env
const { initializeApp, cert } = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const email = process.env.ADMIN_EMAIL || 'pharmotago@gmail.com';
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("❌ Error: ADMIN_PASSWORD environment variable is not set!");
  process.exit(1);
}

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const formattedPrivateKey = privateKey ? privateKey.replace(/\\n/g, '\n') : undefined;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: formattedPrivateKey,
  }),
});

const auth = getAuth();
const db = getFirestore();
const ORG_ID = 'amcal_woywoy';

async function seed() {
  console.log("🚀 Seeding Firebase Auth & Firestore with Peter Kim's owner account...");
  
  try {
    // 1. Create Organization Document
    const orgRef = db.collection('organizations').doc(ORG_ID);
    await orgRef.set({
      name: 'Amcal Pharmacy Woywoy',
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log("✅ Organization document created.");

    // 2. Check if user already exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`ℹ️ User ${email} already exists in Firebase Auth (UID: ${userRecord.uid}).`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: email,
          password: password,
          displayName: 'Peter Kim',
          emailVerified: true
        });
        console.log(`✅ Created new Auth User: ${email} (UID: ${userRecord.uid})`);
      } else {
        throw err;
      }
    }

    // 3. Create Employee Profile: /organizations/amcal_woywoy/employees/emp_peter_kim
    const empRef = orgRef.collection('employees').doc('emp_peter_kim');
    await empRef.set({
      id: 'emp_peter_kim',
      name: 'Peter Kim',
      email: email,
      role: 'Pharmacist Manager',
      hourlyRate: 85.00,
      maxHours: 45,
      availability: {
        0: null, // Sunday
        1: { start: '08:30', end: '17:30' },
        2: { start: '08:30', end: '17:30' },
        3: { start: '08:30', end: '17:30' },
        4: { start: '08:30', end: '17:30' },
        5: { start: '08:30', end: '17:30' },
        6: { start: '09:00', end: '13:00' }  // Saturday
      },
      active: true,
      uid: userRecord.uid
    }, { merge: true });
    console.log("✅ Employee profile document created.");

    // 4. Create User Role doc: /organizations/amcal_woywoy/users/{uid}
    const userRoleRef = orgRef.collection('users').doc(userRecord.uid);
    await userRoleRef.set({
      role: 'owner',
      employeeId: 'emp_peter_kim',
      name: 'Peter Kim',
      email: email,
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log("✅ User role document created (role: owner).");

    console.log("\n🎉 Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  }
}

seed();
