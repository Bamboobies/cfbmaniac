import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDn6R7TMb2MgDuj9LIwDsbdg-n9D9jIEjE",
  authDomain: "cfb-maniac.firebaseapp.com",
  projectId: "cfb-maniac",
  storageBucket: "cfb-maniac.firebasestorage.app",
  messagingSenderId: "376069774189",
  appId: "1:376069774189:web:8c5cef4daecc138e981864",
  measurementId: "G-SH48X5PZPM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs };
