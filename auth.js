
import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const $ = (selector) => document.querySelector(selector);

const showStatus = (message, type = "error") => {
  const status = $("#authStatus");
  if (!status) return;
  status.textContent = message;
  status.className = `auth-status${type === "success" ? " success" : ""}`;
};

const readableError = (error) => {
  const map = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/missing-password": "Please enter your password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Try again in a moment.",
    "auth/network-request-failed": "Network error. Check your internet connection."
  };
  return map[error.code] || "Something went wrong. Check your Firebase config and try again.";
};

const signInForm = $("#signinForm");
if (signInForm) {
  signInForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const remember = $("#rememberMe")?.checked;
    const button = signInForm.querySelector("button[type='submit']");

    showStatus("");
    button.disabled = true;
    button.textContent = "Signing in...";

    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      showStatus("Signed in successfully. Redirecting...", "success");
      window.location.href = "account.html";
    } catch (error) {
      showStatus(readableError(error));
    } finally {
      button.disabled = false;
      button.textContent = "Sign In";
    }
  });

  const forgotButton = $("#forgotPassword");
  if (forgotButton) {
    forgotButton.addEventListener("click", async (event) => {
      event.preventDefault();
      const email = $("#email").value.trim();
      if (!email) {
        showStatus("Enter your email first, then press Forgot password.");
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        showStatus("Password reset email sent successfully.", "success");
      } catch (error) {
        showStatus(readableError(error));
      }
    });
  }
}

const signUpForm = $("#signupForm");
if (signUpForm) {
  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const firstName = $("#firstName").value.trim();
    const lastName = $("#lastName").value.trim();
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const confirmPassword = $("#confirmPassword").value;
    const button = signUpForm.querySelector("button[type='submit']");

    if (!firstName || !lastName) {
      showStatus("Please enter your first and last name.");
      return;
    }

    if (password !== confirmPassword) {
      showStatus("Passwords do not match.");
      return;
    }

    showStatus("");
    button.disabled = true;
    button.textContent = "Creating account...";

    try {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, {
        displayName: `${firstName} ${lastName}`.trim()
      });
      showStatus("Account created successfully. Redirecting...", "success");
      window.location.href = "account.html";
    } catch (error) {
      showStatus(readableError(error));
    } finally {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  });
}

onAuthStateChanged(auth, (user) => {
  const signedInOnly = document.body.dataset.authPage === "guest-only";
  if (signedInOnly && user) {
    window.location.href = "account.html";
  }
});
