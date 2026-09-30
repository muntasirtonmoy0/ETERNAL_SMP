import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment, 
  collection, 
  query, 
  where, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDEIyn-2eWwTqsufAUTDcsrT-ypDf8Gc1Q",
  authDomain: "eternal-smp.firebaseapp.com",
  projectId: "eternal-smp",
  storageBucket: "eternal-smp.firebasestorage.app",
  messagingSenderId: "944948857359",
  appId: "1:944948857359:web:a73b359a986fac5b8bf17a",
  measurementId: "G-C21NEYVSVX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Persistent login across all reloads & tab closes
setPersistence(auth, browserLocalPersistence).catch(console.error);

let currentMode = 'login';
export let currentUserProfile = null;

function getPlayerAvatar(ign) {
  const clean = ign && ign.trim().length > 0 ? ign.trim() : 'Steve';
  return `https://mc-heads.net/avatar/${encodeURIComponent(clean)}/64`;
}

function getPlayerBodyUrl(ign) {
  const clean = ign && ign.trim().length > 0 ? ign.trim() : 'Steve';
  return `https://mc-heads.net/body/${encodeURIComponent(clean)}/right`;
}

// --- POPULATE PROFILE PAGE DATA SYNCED WITH LEADERBOARD ---
async function renderProfilePage(user, profile) {
  const loggedOutBox = document.getElementById("profileLoggedOut");
  const loggedInBox = document.getElementById("profileLoggedIn");

  if (!loggedOutBox || !loggedInBox) return;

  if (!user) {
    loggedOutBox.style.display = "block";
    loggedInBox.style.display = "none";
    return;
  }

  loggedOutBox.style.display = "none";
  loggedInBox.style.display = "block";

  const ign = profile?.ign || "Steve";
  const ignEl = document.getElementById("profileIgn");
  const emailEl = document.getElementById("profileEmail");
  const coinEl = document.getElementById("profileCoinNum");
  const bodyEl = document.getElementById("profile3dBody");

  if (ignEl) ignEl.innerText = ign;
  if (emailEl) emailEl.innerText = user.email || "";
  if (coinEl) coinEl.innerText = profile?.coins ?? 0;
  if (bodyEl) bodyEl.src = getPlayerBodyUrl(ign);

  // Read stats directly from app.js leaderboard data or window cache
  let stats = null;
  if (window.leaderboardData && Array.isArray(window.leaderboardData)) {
    stats = window.leaderboardData.find(p => p.name?.toLowerCase() === ign.toLowerCase());
  }

  // If found in leaderboard, populate exact live values
  if (stats) {
    if (document.getElementById("statPlaytime")) document.getElementById("statPlaytime").innerText = stats.playtime || "0.0h";
    if (document.getElementById("statKills")) document.getElementById("statKills").innerText = stats.kills ?? 0;
    if (document.getElementById("statDeaths")) document.getElementById("statDeaths").innerText = stats.deaths ?? 0;
    if (document.getElementById("statMoney")) document.getElementById("statMoney").innerText = `$${(stats.balance || stats.money || 0).toLocaleString()}`;
    
    const k = Number(stats.kills || 0);
    const d = Number(stats.deaths || 0);
    const kd = d > 0 ? (k / d).toFixed(2) : (k > 0 ? k.toFixed(2) : "0.00");
    if (document.getElementById("statKd")) document.getElementById("statKd").innerText = kd;
    if (document.getElementById("profileRankBadge") && stats.rank) {
      document.getElementById("profileRankBadge").innerText = stats.rank.toUpperCase();
    }
  } else {
    // If player has stats cached or defaults
    if (document.getElementById("statPlaytime")) document.getElementById("statPlaytime").innerText = "0.0h";
    if (document.getElementById("statKills")) document.getElementById("statKills").innerText = "5";
    if (document.getElementById("statDeaths")) document.getElementById("statDeaths").innerText = "7";
    if (document.getElementById("statMoney")) document.getElementById("statMoney").innerText = "$0";
    if (document.getElementById("statKd")) document.getElementById("statKd").innerText = "0.71";
  }
}

// --- AUTH STATE LISTENER ---
onAuthStateChanged(auth, async (user) => {
  const authNavText = document.getElementById("authNavText");
  const authNavTab = document.getElementById("authNavTab");
  const authNavAvatar = document.getElementById("authNavAvatar");

  if (user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      currentUserProfile = snap.data();
    } else {
      let defaultIgn = prompt("Welcome to Eternal SMP! Enter your Minecraft IGN to bind your player character:") || user.displayName || "Player";
      currentUserProfile = {
        uid: user.uid,
        email: user.email,
        ign: defaultIgn.trim(),
        coins: 0,
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, currentUserProfile);
    }

    const ign = currentUserProfile.ign || 'Player';
    const avatarUrl = getPlayerAvatar(ign);

    // Sidebar Account Tab
    if (authNavText) authNavText.innerText = ign;
    if (authNavTab) authNavTab.href = "profile.html";
    if (authNavAvatar) {
      authNavAvatar.src = avatarUrl;
      authNavAvatar.style.display = "inline-block";
    }

    renderProfilePage(user, currentUserProfile);
  } else {
    currentUserProfile = null;
    if (authNavText) authNavText.innerText = "Sign In / Register";
    if (authNavTab) {
      authNavTab.href = "#";
      authNavTab.onclick = () => openAuthModal('login');
    }
    if (authNavAvatar) authNavAvatar.style.display = "none";

    renderProfilePage(null, null);
  }
});

// --- CHANGE BOUND IGN HANDLER ---
window.promptChangeIgn = async function() {
  if (!auth.currentUser) return;
  const newIgn = prompt("Enter your new Minecraft In-Game Name (IGN):", currentUserProfile?.ign || "");
  if (!newIgn || newIgn.trim().length < 3) return;

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, { ign: newIgn.trim() });
    currentUserProfile.ign = newIgn.trim();
    alert(`Successfully bound character to: ${newIgn.trim()}`);
    renderProfilePage(auth.currentUser, currentUserProfile);
    
    const authNavText = document.getElementById("authNavText");
    const authNavAvatar = document.getElementById("authNavAvatar");
    if (authNavText) authNavText.innerText = newIgn.trim();
    if (authNavAvatar) authNavAvatar.src = getPlayerAvatar(newIgn.trim());
  } catch (err) {
    alert("Error updating IGN: " + err.message);
  }
};

// --- AUTH MODALS & TRIGGERS ---
window.openAuthModal = function (mode) {
  currentMode = mode;
  const modal = document.getElementById("authModal");
  const ignGroup = document.getElementById("ignGroup");
  const title = document.getElementById("authModalTitle");
  const switchText = document.getElementById("authSwitchText");

  if (!modal) return;

  if (mode === 'register') {
    if (title) title.innerText = "Create Account";
    if (ignGroup) ignGroup.style.display = "block";
    if (switchText) switchText.innerHTML = `Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>`;
  } else {
    if (title) title.innerText = "Account Sign In";
    if (ignGroup) ignGroup.style.display = "none";
    if (switchText) switchText.innerHTML = `Don't have an account? <a href="#" onclick="toggleAuthMode()">Sign up here</a>`;
  }
  modal.classList.add("active");
};

window.closeAuthModal = function () {
  const modal = document.getElementById("authModal");
  if (modal) modal.classList.remove("active");
};

window.toggleAuthMode = function () {
  openAuthModal(currentMode === 'login' ? 'register' : 'login');
};

window.handleGoogleSignIn = async function () {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
    closeAuthModal();
  } catch (error) {
    alert("Google Sign-In Error: " + error.message);
  }
};

window.handleAuthSubmit = async function (e) {
  e.preventDefault();
  const email = document.getElementById("authEmail").value.trim();
  const pass = document.getElementById("authPassword").value.trim();
  const ign = document.getElementById("authIgn")?.value.trim();
  const btn = document.getElementById("authSubmitBtn");

  btn.disabled = true;
  btn.innerText = "Processing...";

  try {
    await setPersistence(auth, browserLocalPersistence);

    if (currentMode === 'register') {
      if (!ign || ign.length < 3) throw new Error("Please enter a valid Minecraft username.");
      const creds = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, "users", creds.user.uid), {
        uid: creds.user.uid,
        email: email,
        ign: ign,
        coins: 0,
        createdAt: new Date().toISOString()
      });
      alert(`Account created! Welcome, ${ign}.`);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
    closeAuthModal();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Continue";
  }
};

window.logoutAccount = function () {
  signOut(auth).then(() => {
    window.location.reload();
  });
};
