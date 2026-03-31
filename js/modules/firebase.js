import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBPlbSOTo232wTTZclZEBWKYr938Q8GzBM",
  authDomain: "maople-dev.firebaseapp.com",
  projectId: "maople-dev",
  storageBucket: "maople-dev.firebasestorage.app",
  messagingSenderId: "808417208428",
  appId: "1:808417208428:web:4255b6f0cc582f1eac9049"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);