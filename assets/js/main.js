import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
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

  const isPagesDir = window.location.pathname.includes("/pages/");
  const profileHref = isPagesDir ? "./profile.html" : "pages/profile.html";
  const profileStorageKey = "ramsisProfileStore";

  function readProfileStore() {
    try {
      return JSON.parse(localStorage.getItem(profileStorageKey) || "{}");
    } catch {
      return {};
    }
  }

  function writeProfileStore(store) {
    localStorage.setItem(profileStorageKey, JSON.stringify(store));
  }

  function getStoredProfile(uid) {
    if (!uid) return {};
    const store = readProfileStore();
    return store[uid] || {};
  }

  function saveStoredProfile(uid, payload) {
    if (!uid) return;
    const store = readProfileStore();
    store[uid] = { ...(store[uid] || {}), ...payload };
    writeProfileStore(store);
  }

  function userDisplayName(user) {
    if (!user) return "Reader";
    const stored = getStoredProfile(user.uid);
    if (stored.name) return stored.name;
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    return "Reader";
  }

  function userAvatar(user) {
    if (!user) return "";
    const stored = getStoredProfile(user.uid);
    if (stored.photoURL) return stored.photoURL;
    if (user.photoURL) return user.photoURL;
    return "";
  }

  function userInitials(user) {
    const name = userDisplayName(user).trim();
    if (!name) return "R";
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "R";
  }

  function mapAuthError(error) {
    const code = error?.code || "";
    if (code === "auth/email-already-in-use") return "This email is already registered";
    if (code === "auth/invalid-email") return "Invalid email format";
    if (code === "auth/weak-password") return "Password must be at least 6 characters";
    if (code === "auth/user-not-found") return "No account found with this email";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Incorrect email or password";
    if (code === "auth/popup-closed-by-user") return "The sign-in popup was closed before completing login";
    if (code === "auth/popup-blocked") return "Your browser blocked the sign-in popup";
    return error?.message || "Something went wrong";
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

  function closeAccountMenus() {
    document.querySelectorAll("[data-account-menu].open").forEach((menu) => {
      menu.classList.remove("open");
      const trigger = menu.querySelector("[data-account-menu-trigger]");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function bindAccountMenus() {
    document.querySelectorAll("[data-account-menu-trigger]").forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const menu = button.closest("[data-account-menu]");
        const willOpen = !menu.classList.contains("open");
        closeAccountMenus();
        menu.classList.toggle("open", willOpen);
        button.setAttribute("aria-expanded", willOpen ? "true" : "false");
      };
    });

    document.querySelectorAll("[data-account-switcher]").forEach((button) => {
      button.onclick = async (event) => {
        event.preventDefault();
        closeAccountMenus();
        if (auth) {
          try { await signOut(auth); } catch {}
        }
        openAuth("signin");
        setMessage("signin", "Choose another account to continue.", "info");
      };
    });

    document.querySelectorAll("[data-auth-logout]").forEach((button) => {
      button.onclick = async (event) => {
        event.preventDefault();
        closeAccountMenus();
        if (!auth) {
          updateAuthUI(null);
          return;
        }
        await signOut(auth);
      };
    });
  }

  function renderAccountPills(user = null) {
    accountPills.forEach((pill) => {
      if (!user?.email) {
        pill.style.display = "none";
        pill.innerHTML = "";
        return;
      }

      const avatar = userAvatar(user);
      const initials = userInitials(user);
      const name = userDisplayName(user);
      pill.style.display = "inline-flex";
      pill.innerHTML = `
        <div class="account-menu" data-account-menu>
          <button class="account-menu-trigger" type="button" data-account-menu-trigger aria-haspopup="menu" aria-expanded="false">
            <span class="account-avatar-badge">
              ${avatar
                ? `<img class="account-avatar-image" src="${avatar}" alt="${name}">`
                : `<span class="account-avatar-fallback">${initials}</span>`}
            </span>
            <span class="account-menu-name">${name}</span>
            <span class="account-menu-caret">▾</span>
          </button>

          <div class="account-dropdown" data-account-dropdown role="menu">
            <a class="account-dropdown-item account-dropdown-profile" href="${profileHref}">
              <span class="account-dropdown-avatar">
                ${avatar
                  ? `<img class="account-avatar-image" src="${avatar}" alt="${name}">`
                  : `<span class="account-avatar-fallback">${initials}</span>`}
              </span>
              <span class="account-dropdown-meta">
                <strong>${name}</strong>
                <small>${user.email || ""}</small>
              </span>
            </a>
            <button class="account-dropdown-item" type="button" data-account-switcher>Account switcher</button>
            <a class="account-dropdown-item" href="${profileHref}">Profile</a>
            <a class="account-dropdown-item" href="${profileHref}#settings">Settings</a>
            <a class="account-dropdown-item" href="${profileHref}#subscriptions">My subscriptions</a>
            <a class="account-dropdown-item" href="${profileHref}#help">Help</a>
            <button class="account-dropdown-item danger" type="button" data-auth-logout>Sign out</button>
          </div>
        </div>
      `;
    });

    bindAccountMenus();
  }

  function updateAuthUI(user = null) {
    const isLoggedIn = Boolean(user && user.email);

    authTriggers.forEach((trigger) => {
      trigger.style.display = isLoggedIn ? "none" : "inline-flex";
    });

    renderAccountPills(user);

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

    hydrateProfilePage(user);
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
  document.addEventListener("click", () => {
    closeAccountMenus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("open")) closeAuth();
    if (event.key === "Escape") closeAccountMenus();
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
      const activeTab = document.querySelector('.auth-form.active')?.dataset.authForm || "signin";
      if (!(await ensureFirebase(activeTab))) return;
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
        closeAuth();
      } catch (error) {
        setMessage(activeTab, mapAuthError(error), "error");
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
      setMessage("signin", mapAuthError(error), "error");
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
      const created = await createUserWithEmailAndPassword(auth, email, password);
      const fullName = `${firstName} ${lastName}`.trim();
      if (created.user) {
        await updateProfile(created.user, { displayName: fullName });
        saveStoredProfile(created.user.uid, { name: fullName });
        await signOut(auth);
      }

      const signInEmail = document.getElementById("ramsisSignInEmail");
      const signInPassword = document.getElementById("ramsisSignInPassword");
      if (signInEmail) signInEmail.value = email;
      if (signInPassword) signInPassword.value = password;

      activateTab("signin");
      setMessage("signin", "Account created. Signing you in now...", "success");

      await signInWithEmailAndPassword(auth, email, password);
      signUpForm.reset();
      closeAuth();
    } catch (error) {
      setMessage("signup", mapAuthError(error), "error");
    }
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

  function hydrateProfilePage(user = null) {
    const profileShell = document.querySelector("[data-profile-shell]");
    if (!profileShell) return;

    const gate = document.querySelector("[data-profile-gate]");
    const content = document.querySelector("[data-profile-content]");
    const nameHeading = document.querySelector("[data-profile-heading-name]");
    const pageName = document.querySelector("[data-profile-page-name]");
    const quickName = document.querySelector("[data-profile-quick-name]");
    const quickEmail = document.querySelector("[data-profile-quick-email]");
    const previewImage = document.querySelector("[data-profile-preview-image]");
    const previewFallback = document.querySelector("[data-profile-preview-fallback]");
    const form = document.querySelector("[data-profile-form]");
    const emailInput = document.querySelector("[data-profile-email]");
    const displayNameInput = document.querySelector("[data-profile-name]");
    const statusNode = document.querySelector("[data-profile-status]");
    const fileInput = document.querySelector("[data-profile-photo-input]");
    const removeBtn = document.querySelector("[data-profile-remove-photo]");

    if (!gate || !content || !form) return;

    if (!user?.email) {
      gate.hidden = false;
      content.hidden = true;
      if (pageName) pageName.textContent = "Profile";
      return;
    }

    gate.hidden = true;
    content.hidden = false;

    const displayName = userDisplayName(user);
    const avatar = userAvatar(user);
    const initials = userInitials(user);

    if (nameHeading) nameHeading.textContent = displayName;
    if (pageName) pageName.textContent = displayName;
    if (quickName) quickName.textContent = displayName;
    if (quickEmail) quickEmail.textContent = user.email || "";
    if (emailInput) emailInput.value = user.email || "";
    if (displayNameInput) displayNameInput.value = displayName;
    if (previewFallback) previewFallback.textContent = initials;

    if (avatar && previewImage) {
      previewImage.src = avatar;
      previewImage.hidden = false;
      if (previewFallback) previewFallback.hidden = true;
    } else {
      if (previewImage) {
        previewImage.src = "";
        previewImage.hidden = true;
      }
      if (previewFallback) previewFallback.hidden = false;
    }

    if (!form.dataset.bound) {
      form.dataset.bound = "true";

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!auth?.currentUser) return;

        const nextName = String(displayNameInput?.value || "").trim() || "Reader";
        const currentStored = getStoredProfile(auth.currentUser.uid);
        const payload = { ...currentStored, name: nextName };

        try {
          await updateProfile(auth.currentUser, { displayName: nextName });
          saveStoredProfile(auth.currentUser.uid, payload);
          if (statusNode) {
            statusNode.textContent = "Your profile has been updated.";
            statusNode.dataset.mode = "success";
          }
          updateAuthUI(auth.currentUser);
        } catch (error) {
          if (statusNode) {
            statusNode.textContent = mapAuthError(error);
            statusNode.dataset.mode = "error";
          }
        }
      });

      fileInput?.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!file || !auth?.currentUser) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          saveStoredProfile(auth.currentUser.uid, {
            ...getStoredProfile(auth.currentUser.uid),
            photoURL: dataUrl,
            name: String(displayNameInput?.value || auth.currentUser.displayName || "").trim() || userDisplayName(auth.currentUser)
          });
          if (statusNode) {
            statusNode.textContent = "Profile image updated.";
            statusNode.dataset.mode = "success";
          }
          updateAuthUI(auth.currentUser);
        };
        reader.readAsDataURL(file);
      });

      removeBtn?.addEventListener("click", () => {
        if (!auth?.currentUser) return;
        const currentStored = getStoredProfile(auth.currentUser.uid);
        delete currentStored.photoURL;
        saveStoredProfile(auth.currentUser.uid, currentStored);
        if (fileInput) fileInput.value = "";
        if (statusNode) {
          statusNode.textContent = "Profile image removed.";
          statusNode.dataset.mode = "success";
        }
        updateAuthUI(auth.currentUser);
      });
    }
  }

  if (auth) {
    onAuthStateChanged(auth, (user) => {
      updateAuthUI(user || null);
    });
  } else {
    updateAuthUI(null);
  }
});
