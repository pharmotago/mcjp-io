/**
 * BriskSchedules — Firebase Client SDK Initialization
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBRtY7_zvbJqlTwDuq7eUb84S1Z5hCtWPw",
  authDomain: "schedule-amcalwoywoy.firebaseapp.com",
  projectId: "schedule-amcalwoywoy",
  storageBucket: "schedule-amcalwoywoy.firebasestorage.app",
  messagingSenderId: "85548987538",
  appId: "1:85548987538:web:7fd79810f0fe9caacf624b",
  measurementId: "G-Q3SNNN9PH3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
export const ORG_ID = 'amcal_woywoy';

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
         collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
         onSnapshot, query, where, serverTimestamp, writeBatch };
