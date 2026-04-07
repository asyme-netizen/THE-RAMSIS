import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  const firebaseReady = firebaseConfig && !Object.values(firebaseConfig).some((value) =>
    String(value || "").includes("PASTE_YOUR_")
  );

  let app = null;
  let auth = null;

  if (firebaseReady) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }

  const authMarkup = `
    <div class="auth-overlay" data-auth-overlay aria-hidden="true">
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="ramsisAuthHeading">
        <section class="auth-panel auth-panel-single">
          <button class="auth-close" type="button" aria-label="Close">×</button>
          <div class="auth-brandbar">
            <div class="auth-kicker">Reader access</div>
            <div class="auth-brand">THE RAMSIS</div>
          </div>
          <div class="auth-tabbar">
            <button class="auth-tab active" type="button" data-auth-tab="signin">Sign in</button>
            <button class="auth-tab" type="button" data-auth-tab="signup">Create account</button>
          </div>
          <div class="auth-forms">
            <form class="auth-form active" data-auth-form="signin">
              <h3 id="ramsisAuthHeading">Sign in</h3>
              <p>Enter your reader account to continue into THE RAMSIS.</p>
              <div class="auth-socials">
                <button type="button" class="auth-social" data-social="google"><span>G</span><span>Continue with Google</span></button>
                <button type="button" class="auth-social" data-social="apple"><span></span><span>Continue with Apple</span></button>
              </div>
              <div class="auth-divider">or continue with email</div>
              <div class="auth-field">
                <label for="ramsisSignInEmail">Email</label>
                <input id="ramsisSignInEmail" type="email" name="email" placeholder="reader@theramsis.com" required>
              </div>
              <div class="auth-field">
                <label for="ramsisSignInPassword">Password</label>
                <input id="ramsisSignInPassword" type="password" name="password" placeholder="Your password" required>
              </div>
              <button class="auth-submit" type="submit">Sign in</button>
              <div class="auth-switch">Not signed in before? <button type="button" data-switch-tab="signup">Create a free account</button></div>
              <div class="auth-message" data-auth-message="signin"></div>
            </form>

            <form class="auth-form" data-auth-form="signup">
              <h3>Create account</h3>
              <p>Create your reader account first. Subscription appears after sign in.</p>
              <div class="auth-socials">
                <button type="button" class="auth-social" data-social="google"><span>G</span><span>Continue with Google</span></button>
                <button type="button" class="auth-social" data-social="apple"><span></span><span>Continue with Apple</span></button>
              </div>
              <div class="auth-divider">or register with email</div>
              <div class="auth-row">
                <div class="auth-field">
                  <label for="ramsisFirstName">First name</label>
                  <input id="ramsisFirstName" type="text" name="firstName" placeholder="First name" required>
                </div>
                <div class="auth-field">
                  <label for="ramsisLastName">Last name</label>
                  <input id="ramsisLastName" type="text" name="lastName" placeholder="Last name" required>
                </div>
              </div>
              <div class="auth-field">
                <label for="ramsisRegisterEmail">Email</label>
                <input id="ramsisRegisterEmail" type="email" name="email" placeholder="reader@theramsis.com" required>
              </div>
              <div class="auth-row">
                <div class="auth-field">
                  <label for="ramsisRegisterPassword">Password</label>
                  <input id="ramsisRegisterPassword" type="password" name="password" placeholder="Create password" required>
                </div>
                <div class="auth-field">
                  <label for="ramsisConfirmPassword">Confirm password</label>
                  <input id="ramsisConfirmPassword" type="password" name="confirmPassword" placeholder="Confirm password" required>
                </div>
              </div>
              <button class="auth-submit" type="submit">Create account</button>
              <div class="auth-switch">Already have an account? <button type="button" data-switch-tab="signin">Sign in</button></div>
              <div class="auth-message" data-auth-message="signup"></div>
            </form>
          </div>
        </section>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", authMarkup);

  const overlay = document.querySelector("[data-auth-overlay]");
  const tabs = [...document.querySelectorAll("[data-auth-tab]")];
  const forms = [...document.querySelectorAll("[data-auth-form]")];
  const authTriggers = [...document.querySelectorAll("[data-open-auth]")];
  const accountPills = [...document.querySelectorAll("[data-account-pill]")];
  const accountNames = [...document.querySelectorAll("[data-account-name]")];
  const logoutButtons = [...document.querySelectorAll("[data-auth-logout]")];
  const subscribeBands = [...document.querySelectorAll("[data-auth-subscribe]")];
  const lockedNotes = [...document.querySelectorAll("[data-auth-note]")];
  const newsletterForms = [...document.querySelectorAll("[data-newsletter]")];
  const messageSignin = document.querySelector('[data-auth-message="signin"]');
  const messageSignup = document.querySelector('[data-auth-message="signup"]');

  function setMessage(type, text, mode = "info") {
    const node = type === "signup" ? messageSignup : messageSignin;
    if (!node) return;
    node.textContent = text || "";
    node.dataset.mode = mode;
    node.style.display = text ? "block" : "none";
  }

  function clearMessages() {
    setMessage("signin", "");
    setMessage("signup", "");
  }

  function activateTab(name) {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authTab === name));
    forms.forEach((form) => form.classList.toggle("active", form.dataset.authForm === name));
    clearMessages();
  }

  function openAuth(tab = "signin") {
    activateTab(tab);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("auth-open");
  }

  function closeAuth() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("auth-open");
    clearMessages();
  }

  function userDisplayName(user) {
    if (!user) return "Reader";
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    return "Reader";
  }

  function updateAuthUI(user = null) {
    const isLoggedIn = Boolean(user && user.email);

    authTriggers.forEach((trigger) => {
      trigger.style.display = isLoggedIn ? "none" : "inline-flex";
    });

    accountPills.forEach((pill) => {
      pill.style.display = isLoggedIn ? "inline-flex" : "none";
    });

    accountNames.forEach((node) => {
      node.textContent = userDisplayName(user);
    });

    subscribeBands.forEach((band) => {
      band.classList.toggle("locked", !isLoggedIn);
    });

    lockedNotes.forEach((note) => {
      note.style.display = isLoggedIn ? "none" : "flex";
    });

    newsletterForms.forEach((form) => {
      const input = form.querySelector('input[type="email"]');
      if (input && isLoggedIn && user?.email) input.value = user.email;
    });
  }

  authTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openAuth(trigger.dataset.authView || "signin");
    });
  });

  tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.authTab)));
  document.querySelectorAll("[data-switch-tab]").forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.switchTab)));
  document.querySelector(".auth-close").addEventListener("click", closeAuth);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeAuth();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("open")) closeAuth();
  });

  async function ensureFirebase(type = "signin") {
    if (!firebaseReady || !auth) {
      const text = "Add your Firebase config in assets/js/firebase-config.js first.";
      setMessage(type, text, "error");
      alert(text);
      return false;
    }
    return true;
  }

  document.querySelectorAll(".auth-social").forEach((button) => {
    button.addEventListener("click", async () => {
      const social = button.dataset.social;
      const activeTab = document.querySelector('.auth-form.active')?.dataset.authForm || 'signin';
      if (!(await ensureFirebase(activeTab))) return;
      try {
        let provider;
        if (social === "apple") {
          provider = new OAuthProvider("apple.com");
          provider.addScope("email");
          provider.addScope("name");
        } else {
          provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
        }
        await signInWithPopup(auth, provider);
        closeAuth();
      } catch (error) {
        setMessage(activeTab, error.message, "error");
      }
    });
  });

  const signInForm = document.querySelector('[data-auth-form="signin"]');
  signInForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(await ensureFirebase("signin"))) return;
    const formData = new FormData(signInForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    if (!email || !password) {
      setMessage("signin", "Please enter your email and password.", "error");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeAuth();
    } catch (error) {
      setMessage("signin", error.message, "error");
    }
  });

  const signUpForm = document.querySelector('[data-auth-form="signup"]');
  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(await ensureFirebase("signup"))) return;
    const formData = new FormData(signUpForm);
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const confirmPassword = String(formData.get("confirmPassword") || "").trim();
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setMessage("signup", "Please complete all account fields.", "error");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("signup", "Passwords do not match.", "error");
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: `${firstName} ${lastName}`.trim() });
      setMessage("signup", "Account created successfully.", "success");
      closeAuth();
    } catch (error) {
      setMessage("signup", error.message, "error");
    }
  });

  logoutButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!auth) {
        updateAuthUI(null);
        return;
      }
      await signOut(auth);
    });
  });

  document.querySelectorAll('[data-inline-auth]').forEach((button) => {
    button.addEventListener('click', () => openAuth(button.dataset.inlineAuth || 'signin'));
  });

  newsletterForms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const currentUser = auth?.currentUser || null;
      if (!currentUser?.email) {
        openAuth("signin");
        alert("Sign in first to subscribe.");
        return;
      }
      const input = form.querySelector('input[type="email"]');
      const email = input?.value.trim() || currentUser.email;
      if (!email) {
        alert("Please enter an email address.");
        return;
      }
      alert(`Thanks for subscribing to THE RAMSIS, ${email}!`);
      if (input) input.value = currentUser.email;
    });
  });

  if (auth) {
    onAuthStateChanged(auth, (user) => {
      updateAuthUI(user || null);
    });
  } else {
    updateAuthUI(null);
  }
});
