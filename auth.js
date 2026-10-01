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
  increment 
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

// Persistent login across all browser reloads & tab closes
setPersistence(auth, browserLocalPersistence).catch(console.error);

let currentMode = 'login';
export let currentUserProfile = null;

// Custom Ranks Matching app.js & leaderboard.html
const PLAYER_RANKS = {
  "REAL_TWILIGHT0_0": "Owner",
  "RealVenox": "Admin",
  "Kitsuroo": "Admin",
  "D4XTROO": "Moderator",
  "LGalewfqUwU": "Manager",
  "HopeUltimate": "Manager",
  "HaRaM_BoY_": "Manager"
};

function getPlayerRole(name) {
  if (!name) return "Member";
  const key = Object.keys(PLAYER_RANKS).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? PLAYER_RANKS[key] : "Member";
}

// Global 3D Viewer Instance on profile.html
let profileSkinViewer = null;

window.setProfileAnim = function(type) {
  document.querySelectorAll(".profile-hero-left .btn-anim").forEach(b => b.classList.remove("active"));
  if (window.event && window.event.target) window.event.target.classList.add("active");

  if (!profileSkinViewer) return;
  if (type === 'walking') {
    profileSkinViewer.animation = new skinview3d.WalkingAnimation();
    profileSkinViewer.animation.speed = 0.8;
  } else if (type === 'running') {
    profileSkinViewer.animation = new skinview3d.RunningAnimation();
    profileSkinViewer.animation.speed = 0.9;
  } else {
    profileSkinViewer.animation = new skinview3d.IdleAnimation();
  }
};

function getPlayerAvatar(ign) {
  const clean = ign && ign.trim().length > 0 ? ign.trim() : 'Steve';
  return `https://mc-heads.net/avatar/${encodeURIComponent(clean)}/64`;
}

// --- 2. LIVE STATS FETCH FROM /api/leaderboard ---
async function fetchPlayerStatsFromAPI(ign) {
  const role = getPlayerRole(ign);
  const stats = {
    kills: 0,
    deaths: 0,
    playtimeSeconds: 0,
    balance: 0,
    rank: role
  };

  try {
    const [balRes, playRes, killRes, deathRes] = await Promise.all([
      fetch(`/api/leaderboard?type=balance&_=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/leaderboard?type=playtime&_=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/leaderboard?type=kills&_=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/leaderboard?type=deaths&_=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    const target = ign.toLowerCase();

    const balEntry = Array.isArray(balRes) ? balRes.find(p => p.name?.toLowerCase() === target) : null;
    const playEntry = Array.isArray(playRes) ? playRes.find(p => p.name?.toLowerCase() === target) : null;
    const killEntry = Array.isArray(killRes) ? killRes.find(p => p.name?.toLowerCase() === target) : null;
    const deathEntry = Array.isArray(deathRes) ? deathRes.find(p => p.name?.toLowerCase() === target) : null;

    if (balEntry) stats.balance = Number(balEntry.value) || 0;
    if (playEntry) stats.playtimeSeconds = Number(playEntry.value) || 0;
    if (killEntry) stats.kills = Number(killEntry.value) || 0;
    if (deathEntry) stats.deaths = Number(deathEntry.value) || 0;

  } catch (err) {
    console.warn("Failed fetching live player stats:", err);
  }

  return stats;
}

// --- 3. POPULATE DEDICATED PROFILE PAGE (profile.html) ---
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
  const rankBadgeEl = document.getElementById("profileRankBadge");

  if (ignEl) ignEl.innerText = ign;
  if (emailEl) emailEl.innerText = user.email || "";
  if (coinEl) coinEl.innerText = profile?.coins ?? 0;

  // Initialize and load 3D skin model on profile.html
  const profileCanvas = document.getElementById("profile_skin_container");
  if (profileCanvas && typeof skinview3d !== 'undefined') {
    if (!profileSkinViewer) {
      profileSkinViewer = new skinview3d.SkinViewer({
        canvas: profileCanvas,
        width: 220,
        height: 290,
        skin: `https://minotar.net/skin/${encodeURIComponent(ign)}`
      });
      profileSkinViewer.controls.enableRotate = true;
      profileSkinViewer.controls.enableZoom = true;
      profileSkinViewer.controls.enablePan = false;
      profileSkinViewer.camera.position.z = 65;
      profileSkinViewer.fov = 40;
      profileSkinViewer.animation = new skinview3d.WalkingAnimation();
      profileSkinViewer.animation.speed = 0.8;
    } else {
      profileSkinViewer.loadSkin(`https://minotar.net/skin/${encodeURIComponent(ign)}`);
    }
  }

  // Fetch real data live from the server via /api/leaderboard
  const liveStats = await fetchPlayerStatsFromAPI(ign);

  const ptEl = document.getElementById("statPlaytime");
  const klEl = document.getElementById("statKills");
  const dtEl = document.getElementById("statDeaths");
  const mnEl = document.getElementById("statMoney");
  const kdEl = document.getElementById("statKd");

  // Format Playtime
  const totalSecs = liveStats.playtimeSeconds;
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  let ptString = "0.0h";
  if (hours > 0) {
    ptString = `${hours}h ${mins}m`;
  } else if (mins > 0) {
    ptString = `${mins}m`;
  } else if (totalSecs > 0) {
    ptString = `${totalSecs}s`;
  }

  // Calculate K/D Ratio
  const kd = liveStats.deaths > 0 
    ? (liveStats.kills / liveStats.deaths).toFixed(2) 
    : (liveStats.kills > 0 ? liveStats.kills.toFixed(2) : "0.00");

  if (ptEl) ptEl.innerText = ptString;
  if (klEl) klEl.innerText = liveStats.kills;
  if (dtEl) dtEl.innerText = liveStats.deaths;
  if (mnEl) mnEl.innerText = `$${liveStats.balance.toLocaleString()}`;
  if (kdEl) kdEl.innerText = kd;
  if (rankBadgeEl) {
    rankBadgeEl.innerText = liveStats.rank.toUpperCase();
    rankBadgeEl.setAttribute("data-rank", liveStats.rank);
  }
}

// --- 4. AUTH STATE LISTENER (Sidebar Nav & Profile Page Sync) ---
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

    // Sidebar navigation update
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

// --- 5. CHANGE BOUND IGN HANDLER ---
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

// --- 6. AUTH MODAL CONTROLS & LOGINS ---
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

window.logoutAccount = function () {
  signOut(auth).then(() => {
    window.location.reload();
  });
};

// --- 7. COIN PURCHASES ---
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
