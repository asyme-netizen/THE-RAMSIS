
import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const nameEl = document.querySelector("#accountName");
const emailEl = document.querySelector("#accountEmail");
const statusEl = document.querySelector("#accountStatus");
const logoutBtn = document.querySelector("#logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "signin.html";
    return;
  }

  if (nameEl) nameEl.textContent = user.displayName || "Ramsis Reader";
  if (emailEl) emailEl.textContent = user.email || "No email available";
  if (statusEl) {
    statusEl.textContent = user.emailVerified
      ? "Email verified"
      : "Email not verified yet";
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Signing out...";
    await signOut(auth);
    window.location.href = "signin.html";
  });
}
