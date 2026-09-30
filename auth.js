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
  return `https://mc-heads.net/avatar/${clean}/64`;
}

// --- 2. AUTH STATE LISTENER (Desktop Navbar + Mobile Sidebar Sync) ---
onAuthStateChanged(auth, async (user) => {
  const loggedOutView = document.getElementById("loggedOutView");
  const loggedInView = document.getElementById("loggedInView");
  const mobileSlot = document.getElementById("mobileAuthSlot");

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
    const coins = currentUserProfile.coins ?? 0;
    const avatarUrl = getPlayerAvatar(ign);

    // 1. Sync Desktop Navbar Head & Balances
    const navAvatar = document.getElementById("userNavAvatar");
    const ignDisplay = document.getElementById("userIgnDisplay");
    const balanceDisplay = document.getElementById("userBalanceDisplay");

    if (navAvatar) navAvatar.src = avatarUrl;
    if (ignDisplay) ignDisplay.innerText = ign;
    if (balanceDisplay) balanceDisplay.innerText = coins;

    if (loggedOutView) loggedOutView.style.display = "none";
    if (loggedInView) loggedInView.style.display = "flex";

    // 2. Sync Mobile Sidebar Account Drawer
    if (mobileSlot) {
      mobileSlot.innerHTML = `
        <div class="mobile-user-card">
          <img src="${avatarUrl}" class="mobile-player-face" alt="${ign}">
          <div class="mobile-user-details">
            <span class="mobile-player-ign">${ign}</span>
            <span class="mobile-player-wallet"><i class="fa-solid fa-coins text-gold"></i> ${coins} Coins</span>
          </div>
          <button class="logout-btn" onclick="logoutAccount()" title="Logout"><i class="fa-solid fa-power-off"></i></button>
        </div>
      `;
    }

    // Auto-fill checkout fields if user is on payment.html
    const ignField = document.getElementById("ignInput");
    const emailField = document.getElementById("emailInput");
    if (ignField && !ignField.value) ignField.value = ign;
    if (emailField) emailField.value = user.email || '';

  } else {
    currentUserProfile = null;
    if (loggedOutView) loggedOutView.style.display = "flex";
    if (loggedInView) loggedInView.style.display = "none";

    // Show Sign In inside the Mobile Sidebar drawer when logged out
    if (mobileSlot) {
      mobileSlot.innerHTML = `
        <button class="btn btn-primary full-width" onclick="openAuthModal('login')">
          <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In / Register
        </button>
      `;
    }
  }
});

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
  signOut(auth);
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
