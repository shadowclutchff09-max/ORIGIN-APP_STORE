// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const CONFIG = {
  ZEROAI_API_KEY: "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",
  AI_API_ENDPOINT: "https://openrouter.ai/api/v1/chat/completions",
  AI_MODEL: "openai/gpt-3.5-turbo"
};

// Firebase Configuration for Origin Store
const firebaseConfig = {
  apiKey: "AIzaSyCBtTYqKdiCZSJLVtHAFritU2HtmTAU-ro",
  authDomain: "origin-store-1ffe5.firebaseapp.com",
  projectId: "origin-store-1ffe5",
  storageBucket: "origin-store-1ffe5.firebasestorage.app",
  messagingSenderId: "223017508881",
  appId: "1:223017508881:web:f0131fcb32795c83e8d1b0",
  measurementId: "G-NEV31V37LE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global Access for script.js
window.CONFIG = CONFIG;
window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.doc = doc;
window.getDoc = getDoc;