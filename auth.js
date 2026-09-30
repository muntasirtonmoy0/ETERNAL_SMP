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

// --- AUTOMATIC STATS SYNC ENGINE ---
async function fetchLiveLeaderboardStats(ign) {
  try {
    // 1. Check if app.js already loaded it into global window
    let players = window.leaderboardData || window.playersData || null;

    // 2. If not loaded on this page, fetch the exact same data source app.js uses
    if (!players || !Array.isArray(players) || players.length === 0) {
      const endpoints = ['leaderboard-data.json', 'stats.json', 'data.json'];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint);
          if (res.ok) {
            players = await res.json();
            break;
          }
        } catch (e) {}
      }
    }

    if (players && Array.isArray(players)) {
      return players.find(p => 
        (p.name && p.name.toLowerCase() === ign.toLowerCase()) || 
        (p.ign && p.ign.toLowerCase() === ign.toLowerCase())
      );
    }
  } catch (err) {
    console.warn("Could not auto-fetch leaderboard stats:", err);
  }
  return null;
}

// --- POPULATE PROFILE PAGE DATA ---
async function renderProfilePage(user, profile) {
  const loggedOutBox = document.getElementById("profileLoggedOut");
  const loggedInBox = document.getElementById("profileLoggedIn");

  if (!loggedOutBox || !loggedInBox) return; // Not on profile.html

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

  // AUTOMATICALLY PULL EXACT LEADERBOARD STATS
  const stats = await fetchLiveLeaderboardStats(ign);

  const ptEl = document.getElementById("statPlaytime");
  const klEl = document.getElementById("statKills");
  const dtEl = document.getElementById("statDeaths");
  const mnEl = document.getElementById("statMoney");
  const kdEl = document.getElementById("statKd");
  const rkEl = document.getElementById("profileRankBadge");

  if (stats) {
    // Format playtime dynamically
    let playtimeDisplay = stats.playtime || stats.time || stats.hours || "0.0h";
    if (typeof playtimeDisplay === 'number') {
      playtimeDisplay = (playtimeDisplay > 100 ? (playtimeDisplay / 3600).toFixed(1) : playtimeDisplay.toFixed(1)) + 'h';
    }

    const kills = Number(stats.kills || 0);
    const deaths = Number(stats.deaths || 0);
    const money = Number(stats.balance || stats.money || 0);
    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : (kills > 0 ? kills.toFixed(2) : "0.00");

    if (ptEl) ptEl.innerText = playtimeDisplay;
    if (klEl) klEl.innerText = kills;
    if (dtEl) dtEl.innerText = deaths;
    if (mnEl) mnEl.innerText = `$${money.toLocaleString()}`;
    if (kdEl) kdEl.innerText = kd;
    if (rkEl && stats.rank) rkEl.innerText = stats.rank.toUpperCase();
  } else {
    // Fallback if player hasn't joined or data hasn't refreshed yet
    if (ptEl) ptEl.innerText = "0.0h";
    if (klEl) klEl.innerText = "0";
    if (dtEl) dtEl.innerText = "0";
    if (mnEl) mnEl.innerText = "$0";
    if (kdEl) kdEl.innerText = "0.00";
  }
}

// --- 2. AUTH STATE LISTENER (Sidebar Nav & Profile Page Sync) ---
onAuthStateChanged(auth, async (user) => {
  const authNavText = document.getElementById("authNavText");
  const authNavTab = document.getElementById("authNavTab");
  const authNavAvatar = document.getElementById("authNavAvatar");
  const defaultUserIcon = document.getElementById("defaultUserIcon");

  if (user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      currentUserProfile = snap.data();
    } else {
      let defaultIgn = prompt("Welcome to Eternal SMP! Enter your Minecraft IGN:") || user.displayName || "Player";
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

    // Update Sidebar Navigation Item
    if (authNavText) authNavText.innerText = ign;
    if (authNavTab) {
      authNavTab.href = "profile.html";
      authNavTab.onclick = null;
    }
    if (authNavAvatar) {
      authNavAvatar.src = avatarUrl;
      authNavAvatar.style.display = "inline-block";
    }
    if (defaultUserIcon) defaultUserIcon.style.display = "none";

    renderProfilePage(user, currentUserProfile);
  } else {
    currentUserProfile = null;
    if (authNavText) authNavText.innerText = "Sign In / Register";
    if (authNavTab) {
      authNavTab.href = "profile.html";
    }
    if (authNavAvatar) authNavAvatar.style.display = "none";
    if (defaultUserIcon) defaultUserIcon.style.display = "inline-block";

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

// --- 3. GOOGLE POPUP LOGIN ---
window.handleGoogleSignIn = async function () {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
    closeAuthModal();
  } catch (error) {
    alert("Google Sign-In Error: " + error.message);
  }
};

// --- 4. EMAIL & PASSWORD SUBMIT HANDLER ---
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

      alert("Account created successfully!");
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

// --- 5. MODAL CONTROLS ---
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

window.logoutAccount = function () {
  signOut(auth).then(() => {
    window.location.reload();
  });
};

// --- 6. INSTANT COIN PURCHASE ENGINE ---
window.buyWithCoins = async function(itemName, coinCost) {
  if (!auth.currentUser) {
    alert("Please sign in to buy with coins!");
    openAuthModal('login');
    return;
  }

  const cost = Number(coinCost);
  const currentBalance = Number(currentUserProfile?.coins || 0);

  if (currentBalance < cost) {
    alert(`Insufficient balance! You have ${currentBalance} coins.`);
    window.location.href = "coins.html";
    return;
  }

  if (!confirm(`Confirm purchase of "${itemName}" for ${cost} Coins?`)) return;

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, { coins: increment(-cost) });

    await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: `${itemName} (Coin Purchase)`,
        price: `${cost} Coins`,
        ign: currentUserProfile.ign || "Unknown",
        realName: "Coin Wallet Checkout",
        email: auth.currentUser.email,
        contact: "N/A",
        senderNum: "COIN_WALLET",
        trxId: `COIN-${Date.now().toString().slice(-6)}`,
        userId: auth.currentUser.uid
      })
    });

    alert(`🎉 Purchase successful! Claim your ${itemName} in-game.`);
    window.location.reload();
  } catch (err) {
    alert("Purchase failed: " + err.message);
  }
};
