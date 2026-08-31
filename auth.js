import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 1. FIREBASE CONFIGURATION (Linked with Eternal SMP) ---
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

let currentMode = 'login';
export let currentUserProfile = null;

// --- 2. AUTH STATE LISTENER (Updates Navbar & Live Balance) ---
onAuthStateChanged(auth, async (user) => {
  const loggedOutView = document.getElementById("loggedOutView");
  const loggedInView = document.getElementById("loggedInView");

  if (user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      currentUserProfile = snap.data();
      
      const ignDisplay = document.getElementById("userIgnDisplay");
      const balanceDisplay = document.getElementById("userBalanceDisplay");
      
      if (ignDisplay) ignDisplay.innerHTML = `<i class="fa-solid fa-user"></i> ${currentUserProfile.ign || 'Player'}`;
      if (balanceDisplay) balanceDisplay.innerText = currentUserProfile.coins ?? 0;
      
      // Auto-fill checkout fields if on payment.html
      const ignField = document.getElementById("ignInput");
      const emailField = document.getElementById("emailInput");
      if (ignField) ignField.value = currentUserProfile.ign || '';
      if (emailField) emailField.value = user.email || '';
    }

    if (loggedOutView) loggedOutView.style.display = "none";
    if (loggedInView) loggedInView.style.display = "flex";
  } else {
    currentUserProfile = null;
    if (loggedOutView) loggedOutView.style.display = "flex";
    if (loggedInView) loggedInView.style.display = "none";
  }
});

// --- 3. LOGIN & SIGNUP SUBMIT HANDLER ---
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
      
      // Store new player in Firestore with 0 starter coins
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

// --- 4. MODAL CONTROLS ---
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

// --- 5. ADMIN UTILITY: GRANT EVENT COINS / TOP-UPS ---
window.grantCoinsToUser = async function (userUid, amount) {
  try {
    const userRef = doc(db, "users", userUid);
    await updateDoc(userRef, {
      coins: increment(amount)
    });
    console.log(`Successfully added ${amount} coins to ${userUid}`);
    alert(`Success: Added ${amount} coins to UID: ${userUid}`);
  } catch (error) {
    console.error("Failed to grant coins:", error);
    alert("Error granting coins: " + error.message);
  }
};
