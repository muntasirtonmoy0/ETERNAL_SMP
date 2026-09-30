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

// Explicitly configure permanent session persistence across browser reloads
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Firebase persistence error:", err);
});

let currentMode = 'login';
export let currentUserProfile = null;

// Dynamic Minecraft Avatar Generator
function getPlayerAvatar(ign) {
  const clean = ign && ign.trim().length > 0 ? ign.trim() : 'Steve';
  return `https://mc-heads.net/avatar/${encodeURIComponent(clean)}/64`;
}

function getPlayerBodyUrl(ign) {
  const clean = ign && ign.trim().length > 0 ? ign.trim() : 'Steve';
  return `https://mc-heads.net/body/${encodeURIComponent(clean)}/right`;
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

  // Sync In-Game Stats from Leaderboard API or fallback
  try {
    const res = await fetch(`https://api.eternal-smp.pro/player/${encodeURIComponent(ign)}`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      const pt = document.getElementById("statPlaytime");
      const kl = document.getElementById("statKills");
      const dt = document.getElementById("statDeaths");
      const mn = document.getElementById("statMoney");
      const kd = document.getElementById("statKd");
      const rk = document.getElementById("profileRankBadge");

      if (pt) pt.innerText = data.playtime || "0h";
      if (kl) kl.innerText = data.kills || "0";
      if (dt) dt.innerText = data.deaths || "0";
      if (mn) mn.innerText = `$${(data.money || 0).toLocaleString()}`;
      if (kd) kd.innerText = data.deaths > 0 ? (data.kills / data.deaths).toFixed(2) : (data.kills || "0.00");
      if (rk && data.rank) rk.innerText = data.rank.toUpperCase();
    } else {
      const pt = document.getElementById("statPlaytime");
      const kl = document.getElementById("statKills");
      const dt = document.getElementById("statDeaths");
      const mn = document.getElementById("statMoney");
      const kd = document.getElementById("statKd");

      if (pt) pt.innerText = "1.0h";
      if (kl) kl.innerText = "0";
      if (dt) dt.innerText = "0";
      if (mn) mn.innerText = "$0";
      if (kd) kd.innerText = "0.00";
    }
  } catch {
    // Graceful fallback
  }
}

// --- 2. AUTH STATE LISTENER (Sidebar Nav & Profile Page Sync) ---
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
      // Setup profile for first-time Google sign-in
      let defaultIgn = prompt("Welcome to Eternal SMP! Please enter your Minecraft In-Game Name (IGN):") || user.displayName || "Player";
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

    // Update Sidebar Navigation item
    if (authNavText) authNavText.innerText = ign;
    if (authNavTab) authNavTab.href = "profile.html";
    if (authNavAvatar) {
      authNavAvatar.src = avatarUrl;
      authNavAvatar.style.display = "inline-block";
    }

    // Auto-fill checkout fields if user is on payment.html
    const ignField = document.getElementById("ignInput");
    const emailField = document.getElementById("emailInput");
    if (ignField && !ignField.value) ignField.value = ign;
    if (emailField) emailField.value = user.email || '';

    renderProfilePage(user, currentUserProfile);
  } else {
    currentUserProfile = null;
    if (authNavText) authNavText.innerText = "Sign In / Account";
    if (authNavTab) authNavTab.href = "profile.html";
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
    alert("Please sign in or create an account to buy with coins!");
    openAuthModal('login');
    return;
  }

  const cost = Number(coinCost);
  const currentBalance = Number(currentUserProfile?.coins || 0);

  if (currentBalance < cost) {
    const needed = cost - currentBalance;
    alert(`Insufficient balance! You have ${currentBalance} coins. You need ${needed} more coins.`);
    window.location.href = "coins.html";
    return;
  }

  const confirmBuy = confirm(`Confirm purchase of "${itemName}" for ${cost} Coins?`);
  if (!confirmBuy) return;

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, {
      coins: increment(-cost)
    });

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

// --- 7. ADMIN UTILITY: GRANT EVENT COINS VIA IGN OR UID ---
window.grantCoinsToUser = async function (identifier, amount) {
  try {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return alert("Please enter a valid numeric coin amount.");

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("ign", "==", identifier.trim()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, "users", userDoc.id), {
        coins: increment(numAmount)
      });
      alert(`Success: Added ${numAmount} coins to IGN: ${identifier}!`);
      return;
    }

    const directDocRef = doc(db, "users", identifier.trim());
    const directSnap = await getDoc(directDocRef);

    if (directSnap.exists()) {
      await updateDoc(directDocRef, {
        coins: increment(numAmount)
      });
      alert(`Success: Added ${numAmount} coins to UID: ${identifier}!`);
      return;
    }

    alert(`Player "${identifier}" not found. Make sure the user has logged in at least once.`);
  } catch (error) {
    console.error("Error granting coins:", error);
    alert("Error granting coins: " + error.message);
  }
};
