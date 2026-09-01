import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged 
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

let currentMode = 'login';
export let currentUserProfile = null;

// --- 2. AUTH STATE LISTENER (Navbar, User Pill & Wallet Balance Sync) ---
onAuthStateChanged(auth, async (user) => {
  const loggedOutView = document.getElementById("loggedOutView");
  const loggedInView = document.getElementById("loggedInView");

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

    const ignDisplay = document.getElementById("userIgnDisplay");
    const balanceDisplay = document.getElementById("userBalanceDisplay");
    
    if (ignDisplay) ignDisplay.innerHTML = `<i class="fa-solid fa-user"></i> ${currentUserProfile.ign || 'Player'}`;
    if (balanceDisplay) balanceDisplay.innerText = currentUserProfile.coins ?? 0;
    
    // Auto-fill checkout fields if user is on payment.html
    const ignField = document.getElementById("ignInput");
    const emailField = document.getElementById("emailInput");
    if (ignField && !ignField.value) ignField.value = currentUserProfile.ign || '';
    if (emailField) emailField.value = user.email || '';

    if (loggedOutView) loggedOutView.style.display = "none";
    if (loggedInView) loggedInView.style.display = "flex";
  } else {
    currentUserProfile = null;
    if (loggedOutView) loggedOutView.style.display = "flex";
    if (loggedInView) loggedInView.style.display = "none";
  }
});

// --- 3. GOOGLE POPUP LOGIN ---
window.handleGoogleSignIn = async function () {
  try {
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
  const ign = document.getElementById("authIgn").value.trim();
  const btn = document.getElementById("authSubmitBtn");

  btn.disabled = true;
  btn.innerText = "Processing...";

  try {
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
    // 1. Deduct coins directly from the user's Firestore document
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, {
      coins: increment(-cost)
    });

    // 2. Dispatch order notification to Discord webhook via /api/order
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

    // 1. Check if user exists by Minecraft IGN
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

    // 2. Fallback: Check if identifier is direct Firebase UID
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
