import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBkk4Ew7Ut26T1kSInh36026lWsMhESoKg",
  authDomain: "kowri-9eb1b.firebaseapp.com",
  projectId: "kowri-9eb1b",
  storageBucket: "kowri-9eb1b.firebasestorage.app",
  messagingSenderId: "193664075845",
  appId: "1:193664075845:web:df4efd56e7df4c5018fb2c",
  measurementId: "G-K2L6ZXRRCG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db };
