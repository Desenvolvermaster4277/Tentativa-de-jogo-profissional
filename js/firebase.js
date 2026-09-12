// Click Play — Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getStorage
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHd14_x0pDB5nkFrDKJ0o9X2dyQVpJEU",
  authDomain: "click-play-16060.firebaseapp.com",
  projectId: "click-play-16060",
  storageBucket: "click-play-16060.firebasestorage.app",
  messagingSenderId: "642019144495",
  appId: "1:642019144495:web:e520ac14be6b9b0f23e7da",
  measurementId: "G-49HT4G1GTY"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  onAuthStateChanged
};
