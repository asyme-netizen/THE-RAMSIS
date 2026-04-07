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
import { firebaseConfig, marketDataConfig, siteMonetizationConfig } from "./firebase-config.js";

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
  const businessHref = isPagesDir ? "./business.html" : "pages/business.html";
  const businessArticleHref = isPagesDir ? "./business-article.html" : "pages/business-article.html";
  const profileStorageKey = "ramsisProfileStore";
  const accountHistoryKey = "ramsisKnownAccounts";

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

  function readKnownAccounts() {
    try {
      return JSON.parse(localStorage.getItem(accountHistoryKey) || "[]");
    } catch {
      return [];
    }
  }

  function writeKnownAccounts(accounts) {
    localStorage.setItem(accountHistoryKey, JSON.stringify(accounts));
  }

  function rememberKnownAccount(user) {
    if (!user?.email) return;
    const stored = getStoredProfile(user.uid);
    const next = {
      uid: user.uid || user.email,
      email: user.email,
      name: stored.name || user.displayName || user.email.split("@")[0],
      photoURL: stored.photoURL || user.photoURL || "",
      lastUsedAt: Date.now()
    };

    const current = readKnownAccounts().filter((item) => item.email !== next.email);
    current.unshift(next);
    writeKnownAccounts(current.slice(0, 6));
  }

  function knownAccountItems(activeUser) {
    const activeEmail = activeUser?.email || "";
    return readKnownAccounts()
      .filter((item) => item && item.email && item.email !== activeEmail)
      .slice(0, 4);
  }

  function avatarMarkup(name, avatar, fallbackClass = "account-avatar-fallback") {
    const safeName = name || "Reader";
    const initials = (safeName.trim().split(/\s+/).filter(Boolean).slice(0,2).map((part) => part.charAt(0).toUpperCase()).join("") || "R");
    return avatar
      ? `<img class="account-avatar-image" src="${avatar}" alt="${safeName}">`
      : `<span class="${fallbackClass}">${initials}</span>`;
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
      menu.classList.remove("open", "switcher-open");
      const trigger = menu.querySelector("[data-account-menu-trigger]");
      const switcher = menu.querySelector("[data-account-switcher]");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (switcher) switcher.setAttribute("aria-expanded", "false");
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
        menu.classList.remove("switcher-open");
        button.setAttribute("aria-expanded", willOpen ? "true" : "false");
        const switcher = menu.querySelector("[data-account-switcher]");
        if (switcher) switcher.setAttribute("aria-expanded", "false");
      };
    });

    document.querySelectorAll("[data-account-switcher]").forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const menu = button.closest("[data-account-menu]");
        const willOpen = !menu.classList.contains("switcher-open");
        menu.classList.toggle("switcher-open", willOpen);
        button.setAttribute("aria-expanded", willOpen ? "true" : "false");
      };
    });

    document.querySelectorAll("[data-account-switch-item]").forEach((button) => {
      button.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const email = button.dataset.accountEmail || "";
        closeAccountMenus();
        if (auth) {
          try { await signOut(auth); } catch {}
        }
        openAuth("signin");
        const signInEmail = document.getElementById("ramsisSignInEmail");
        const signInPassword = document.getElementById("ramsisSignInPassword");
        if (signInEmail) signInEmail.value = email;
        if (signInPassword) signInPassword.value = "";
        setMessage("signin", `Continue as ${email}`, "info");
      };
    });

    document.querySelectorAll("[data-account-add]").forEach((button) => {
      button.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeAccountMenus();
        if (auth) {
          try { await signOut(auth); } catch {}
        }
        openAuth("signin");
        setMessage("signin", "Add another account to continue.", "info");
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
      const currentAvatar = avatarMarkup(name, avatar);
      const knownItems = knownAccountItems(user).map((item) => `
        <button class="account-switcher-item" type="button" data-account-switch-item data-account-email="${item.email}">
          <span class="account-switcher-avatar">${avatarMarkup(item.name || item.email, item.photoURL || "", "account-switcher-fallback")}</span>
          <span class="account-switcher-text">${item.name || item.email.split("@")[0]}</span>
        </button>
      `).join("");

      pill.style.display = "inline-flex";
      pill.innerHTML = `
        <div class="account-menu" data-account-menu>
          <button class="account-menu-trigger" type="button" data-account-menu-trigger aria-haspopup="menu" aria-expanded="false">
            <span class="account-avatar-badge">${currentAvatar}</span>
            <span class="account-menu-name">${name}</span>
            <span class="account-menu-caret">▾</span>
          </button>

          <div class="account-dropdown" data-account-dropdown role="menu">
            <a class="account-dropdown-item account-dropdown-profile" href="${profileHref}">
              <span class="account-dropdown-avatar">${currentAvatar}</span>
              <span class="account-dropdown-meta">
                <strong>${name}</strong>
                <small>${user.email || ""}</small>
              </span>
            </a>
            <button class="account-dropdown-item account-dropdown-switch-row" type="button" data-account-switcher aria-expanded="false">
              <span>Account switcher</span>
              <span class="account-switch-arrow">→</span>
            </button>
            <a class="account-dropdown-item" href="${profileHref}">Profile</a>
            <a class="account-dropdown-item" href="${profileHref}#settings">Settings</a>
            <a class="account-dropdown-item" href="${profileHref}#subscriptions">My subscriptions</a>
            <a class="account-dropdown-item" href="${profileHref}#help">Help</a>
            <button class="account-dropdown-item danger" type="button" data-auth-logout>Sign out</button>
          </div>

          <div class="account-switcher-panel" data-account-switcher-panel>
            <div class="account-switcher-header">
              <span class="account-dropdown-avatar">${currentAvatar}</span>
              <span class="account-switcher-meta">
                <strong>${name}</strong>
                <small>${user.email || ""}</small>
              </span>
              <button class="account-switcher-back" type="button" data-account-switcher aria-expanded="true">←</button>
            </div>
            <div class="account-switcher-label">Switch account</div>
            <div class="account-switcher-list">
              ${knownItems || '<div class="account-switcher-empty">No other saved accounts yet</div>'}
            </div>
            <button class="account-switcher-item account-switcher-add" type="button" data-account-add>
              <span class="account-switcher-add-icon">＋</span>
              <span class="account-switcher-text">Add account</span>
            </button>
            <button class="account-switcher-item account-switcher-signout" type="button" data-auth-logout>
              <span class="account-switcher-add-icon">⇥</span>
              <span class="account-switcher-text">Sign out...</span>
            </button>
          </div>
        </div>
      `;
    });

    bindAccountMenus();
  }

  function updateAuthUI(user = null) {
    if (user?.email) rememberKnownAccount(user);
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
}

  const themeKey = "ramsis-theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(themeKey);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeKey, theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    });
    renderTradingViewWidgets();
  }

  function bindThemeToggle() {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
      });
    });
  }

  function bindMobileNav() {
    document.querySelectorAll("[data-mobile-nav-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const nav = document.querySelector("[data-site-nav]");
        if (!nav) return;
        const willOpen = !nav.classList.contains("open");
        nav.classList.toggle("open", willOpen);
        button.setAttribute("aria-expanded", String(willOpen));
      });
    });

    document.querySelectorAll("[data-site-nav] a").forEach((link) => {
      link.addEventListener("click", () => {
        const nav = document.querySelector("[data-site-nav]");
        const button = document.querySelector("[data-mobile-nav-toggle]");
        nav?.classList.remove("open");
        button?.setAttribute("aria-expanded", "false");
      });
    });
  }


  function marketClass(value) {
    if (value > 0) return "market-up";
    if (value < 0) return "market-down";
    return "market-flat";
  }

  function safeNumber(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatPublishedTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "Live now";
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function setLiveTimestamp() {
    document.querySelectorAll("[data-live-time]").forEach((node) => {
      node.textContent = formatPublishedTime(new Date().toISOString());
    });
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function businessFallbackData() {
    return [
      { label: "S&P 500", symbol: "^GSPC", price: 5241.53, change: -6.2, changesPercentage: -0.12 },
      { label: "Dow Jones", symbol: "^DJI", price: 39475.90, change: 178.5, changesPercentage: 0.45 },
      { label: "Nasdaq", symbol: "^IXIC", price: 16392.14, change: 92.5, changesPercentage: 0.56 },
      { label: "Gold", symbol: "GCUSD", price: 2384.10, change: 34.2, changesPercentage: 1.45 },
      { label: "USD/EGP", symbol: "USDEGP", price: 48.25, change: -0.03, changesPercentage: -0.05 },
      { label: "USD/EUR", symbol: "USDEUR", price: 0.92, change: 0.01, changesPercentage: 0.12 },
      { label: "EGX 30", symbol: "EGX30", price: 31245.12, change: 402.15, changesPercentage: 1.24 }
    ];
  }

  function renderMarketTape(target, items) {
    if (!target) return;
    target.innerHTML = items.map((item) => {
      const cls = marketClass(Number(item.changesPercentage || item.change || 0));
      const pct = Number(item.changesPercentage || 0);
      return `
        <article class="market-tape-item">
          <div class="market-tape-label">${item.label}</div>
          <span class="market-tape-price">${safeNumber(item.price)}</span>
          <span class="market-percent ${cls}">${pct > 0 ? "+" : ""}${safeNumber(pct)}%</span>
        </article>
      `;
    }).join("");
  }

  function renderMarketGrid(target, items) {
    if (!target) return;
    target.innerHTML = items.slice(0, 6).map((item) => {
      const cls = marketClass(Number(item.changesPercentage || item.change || 0));
      const pct = Number(item.changesPercentage || 0);
      return `
        <article class="terminal-item">
          <small>${item.label}</small>
          <strong>${safeNumber(item.price)}</strong>
          <span class="market-change ${cls}">${pct > 0 ? "+" : ""}${safeNumber(pct)}%</span>
        </article>
      `;
    }).join("");
  }

  function updateMarketSnapshots(items) {
    const lookup = {
      "^GSPC": "sp500",
      "^DJI": "dow",
      "^IXIC": "nasdaq",
      "GCUSD": "gold",
      "USDEGP": "usdegp",
      "USDEUR": "usdeur"
    };
    items.forEach((item) => {
      const key = lookup[item.symbol];
      if (!key) return;
      document.querySelectorAll(`[data-snapshot="${key}"]`).forEach((node) => {
        node.textContent = safeNumber(item.price);
      });
    });
  }

  async function loadBusinessMarkets() {
    const tapeNodes = [...document.querySelectorAll("[data-market-tape]")];
    const gridNodes = [...document.querySelectorAll("[data-market-grid]")];
    if (!tapeNodes.length && !gridNodes.length) return;

    const fallback = businessFallbackData();
    const marketKey = marketDataConfig?.apiKey || "";
    let merged = fallback;

    try {
      if (marketKey && !marketKey.includes("PASTE_YOUR_")) {
        const [indices, commodities, forex] = await Promise.all([
          fetchJson(`https://financialmodelingprep.com/stable/quote?symbol=%5EGSPC,%5EDJI,%5EIXIC&apikey=${marketKey}`),
          fetchJson(`https://financialmodelingprep.com/stable/quote?symbol=GCUSD&apikey=${marketKey}`),
          fetchJson(`https://financialmodelingprep.com/stable/batch-forex-quotes?apikey=${marketKey}`)
        ]);

        const lookup = new Map();
        [...(indices || []), ...(commodities || []), ...(forex || [])].forEach((item) => {
          if (item?.symbol) lookup.set(item.symbol, item);
        });

        const usdEgp = lookup.get("USDEGP") || lookup.get("USD/EGP") || {};
        const usdEur = lookup.get("USDEUR") || lookup.get("USD/EUR") || {};
        const spx = lookup.get("^GSPC") || {};
        const dji = lookup.get("^DJI") || {};
        const ixic = lookup.get("^IXIC") || {};
        const gold = lookup.get("GCUSD") || {};

        merged = [
          { label: "S&P 500", symbol: "^GSPC", price: spx.price, change: spx.change, changesPercentage: spx.changesPercentage },
          { label: "Dow Jones", symbol: "^DJI", price: dji.price, change: dji.change, changesPercentage: dji.changesPercentage },
          { label: "Nasdaq", symbol: "^IXIC", price: ixic.price, change: ixic.change, changesPercentage: ixic.changesPercentage },
          { label: "Gold", symbol: "GCUSD", price: gold.price, change: gold.change, changesPercentage: gold.changesPercentage },
          { label: "USD/EGP", symbol: "USDEGP", price: usdEgp.price, change: usdEgp.change, changesPercentage: usdEgp.changesPercentage },
          { label: "USD/EUR", symbol: "USDEUR", price: usdEur.price, change: usdEur.change, changesPercentage: usdEur.changesPercentage },
          fallback[6]
        ].map((item, idx) => ({ ...fallback[idx], ...Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined && v !== null && v !== "")) }));
      }
    } catch (error) {
      console.warn("Business market data fallback active", error);
    }

    tapeNodes.forEach((node) => renderMarketTape(node, merged));
    gridNodes.forEach((node) => renderMarketGrid(node, merged));
    updateMarketSnapshots(merged);
    setLiveTimestamp();
  }

  function businessFallbackNews() {
    return [
      {
        title: "Treasury yields, gold, and the dollar reset the week’s macro conversation",
        text: "A tighter global liquidity backdrop is forcing investors to reprice safe-haven demand, currency pressure, and the durability of equity leadership.",
        site: "THE RAMSIS Desk",
        url: businessArticleHref,
        publishedDate: new Date().toISOString()
      },
      {
        title: "Egypt market focus sharpens as global risk appetite turns selective",
        text: "Emerging-market allocation remains highly sensitive to dollar conditions and commodity pricing.",
        site: "THE RAMSIS Desk",
        url: businessArticleHref,
        publishedDate: new Date().toISOString()
      },
      {
        title: "Mega-cap concentration keeps benchmark strength elevated",
        text: "Index resilience still masks narrower breadth beneath the surface of global equities.",
        site: "THE RAMSIS Desk",
        url: businessArticleHref,
        publishedDate: new Date().toISOString()
      },
      {
        title: "FX traders watch USD/EGP and USD/EUR as policy timing diverges",
        text: "Cross-market desks are increasingly using currency moves to frame wider macro conviction.",
        site: "THE RAMSIS Desk",
        url: businessArticleHref,
        publishedDate: new Date().toISOString()
      }
    ];
  }

  function normalizeNewsItems(items = []) {
    return items
      .map((item) => ({
        title: item.title || item.headline || "Untitled market update",
        text: item.text || item.content || item.snippet || item.description || "Open the story for more coverage.",
        site: item.site || item.source || item.publisher || "Market Desk",
        url: item.url || item.link || businessArticleHref,
        publishedDate: item.publishedDate || item.publishedAt || item.date || new Date().toISOString(),
        image: item.image || item.imageUrl || item.image_url || ""
      }))
      .filter((item) => item.title);
  }

  function storyUrl(item) {
    try {
      if (!item.url || item.url === businessArticleHref) {
        return businessArticleHref;
      }
      const params = new URLSearchParams({
        title: item.title,
        text: item.text,
        source: item.site,
        when: item.publishedDate,
        external: item.url
      });
      return `${businessArticleHref}?${params.toString()}`;
    } catch {
      return businessArticleHref;
    }
  }

  function renderLeadNews(node, item) {
    if (!node || !item) return;
    node.innerHTML = `
      <div class="headline-card-kicker">Top story</div>
      <h3><a href="${storyUrl(item)}">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.text)}</p>
      <div class="headline-meta">
        <span>${escapeHtml(item.site)}</span>
        <span>${escapeHtml(formatPublishedTime(item.publishedDate))}</span>
      </div>
      <a class="text-link-accent" href="${storyUrl(item)}">Open coverage</a>
    `;
  }

  function renderNewsFeed(node, items) {
    if (!node) return;
    node.innerHTML = items.map((item) => `
      <article class="headline-feed-item">
        <div class="headline-card-kicker">${escapeHtml(item.site)}</div>
        <h3><a href="${storyUrl(item)}">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.text)}</p>
        <div class="headline-meta">
          <span>${escapeHtml(formatPublishedTime(item.publishedDate))}</span>
          <a class="text-link-accent" href="${storyUrl(item)}">Read</a>
        </div>
      </article>
    `).join("");
  }

  function renderRailNews(node, items) {
    if (!node) return;
    node.innerHTML = items.slice(0, 5).map((item) => `
      <article class="rail-news-item">
        <h4><a href="${storyUrl(item)}">${escapeHtml(item.title)}</a></h4>
        <div class="headline-meta">
          <span>${escapeHtml(item.site)}</span>
          <span>${escapeHtml(formatPublishedTime(item.publishedDate))}</span>
        </div>
      </article>
    `).join("");
  }

  function setNewsStatus(text) {
    document.querySelectorAll("[data-news-status]").forEach((node) => {
      node.textContent = text;
    });
  }

  async function loadBusinessNews() {
    const leadNodes = [...document.querySelectorAll("[data-lead-news]")];
    const feedNodes = [...document.querySelectorAll("[data-news-feed]")];
    const railNodes = [...document.querySelectorAll("[data-rail-news]")];
    if (!leadNodes.length && !feedNodes.length && !railNodes.length) return;

    const marketKey = marketDataConfig?.apiKey || "";
    let items = businessFallbackNews();

    try {
      if (marketKey && !marketKey.includes("PASTE_YOUR_")) {
        const [stockNews, forexNews, generalNews] = await Promise.all([
          fetchJson(`https://financialmodelingprep.com/stable/news/stock-latest?page=0&limit=6&apikey=${marketKey}`),
          fetchJson(`https://financialmodelingprep.com/stable/news/forex-latest?page=0&limit=6&apikey=${marketKey}`),
          fetchJson(`https://financialmodelingprep.com/stable/news/general-latest?page=0&limit=6&apikey=${marketKey}`)
        ]);
        items = normalizeNewsItems([...(stockNews || []), ...(forexNews || []), ...(generalNews || [])]).slice(0, 8);
        if (!items.length) items = businessFallbackNews();
      }
      setNewsStatus(`Last updated ${formatPublishedTime(new Date().toISOString())}`);
    } catch (error) {
      console.warn("Business news fallback active", error);
      items = businessFallbackNews();
      setNewsStatus("Live desk using fallback headlines");
    }

    const [lead, ...rest] = items;
    leadNodes.forEach((node) => renderLeadNews(node, lead));
    feedNodes.forEach((node, idx) => renderNewsFeed(node, idx === 0 ? rest.slice(0, 4) : items.slice(0, 4)));
    railNodes.forEach((node) => renderRailNews(node, items));
  }

  function hydrateBusinessArticleFromQuery() {
    if (!document.querySelector("[data-business-article-page]")) return;
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title");
    const text = params.get("text");
    const source = params.get("source");
    const when = params.get("when");
    const external = params.get("external");

    if (title) {
      const h1 = document.querySelector(".article-title-business");
      if (h1) h1.textContent = title;
      document.title = `${title} — THE RAMSIS`;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", `${title} — THE RAMSIS`);
    }
    if (text) {
      const deck = document.querySelector(".business-article-deck");
      if (deck) deck.textContent = text;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", text);
    }
    if (source) {
      document.querySelectorAll(".author-name").forEach((node) => {
        node.textContent = source;
      });
    }
    if (when) {
      document.querySelectorAll("[data-live-time]").forEach((node) => {
        node.textContent = formatPublishedTime(when);
      });
    }

    if (external) {
      const tags = document.querySelector(".business-article-body .tags");
      if (tags && !tags.querySelector("[data-external-story]")) {
        const a = document.createElement("a");
        a.href = external;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.dataset.externalStory = "true";
        a.textContent = "Open source";
        tags.appendChild(a);
      }
    }
  }

  function renderTradingViewWidgets() {
    const widgets = [...document.querySelectorAll(".tv-widget")];
    if (!widgets.length) return;
    const dark = document.documentElement.dataset.theme === "dark";
    widgets.forEach((node) => {
      const symbol = node.dataset.tvSymbol;
      const isWide = node.classList.contains("wide");
      const mode = node.dataset.tvWidget || "mini";
      node.innerHTML = "";
      const container = document.createElement("div");
      container.className = "tradingview-widget-container";
      const widgetTarget = document.createElement("div");
      widgetTarget.className = "tradingview-widget-container__widget";
      container.appendChild(widgetTarget);
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
      script.async = true;
      script.type = "text/javascript";
      script.text = JSON.stringify({
        symbols: [[symbol + "|1D"]],
        chartOnly: false,
        width: "100%",
        height: isWide ? 420 : 320,
        locale: "en",
        colorTheme: dark ? "dark" : "light",
        autosize: true,
        showVolume: false,
        showMA: false,
        hideDateRanges: false,
        hideMarketStatus: false,
        hideSymbolLogo: false,
        scalePosition: "right",
        scaleMode: "Normal",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "10",
        noTimeScale: false,
        valuesTracking: "1",
        changeMode: "price-and-percent",
        chartType: "area",
        maLineColor: "#2962FF",
        maLineWidth: 1,
        lineWidth: 2,
        lineType: 0,
        dateRanges: ["1D|1", "1M|30", "3M|60", "12M|1D", "60M|1W", "all|1M"]
      });
      container.appendChild(script);
      node.appendChild(container);
    });
  }

  function initAdsensePlacements() {
    const config = siteMonetizationConfig || {};
    const adNodes = [...document.querySelectorAll("[data-ad-slot]")];
    if (!adNodes.length) return;

    if (!config.adsenseEnabled || !config.adsenseClient || config.adsenseClient.includes("XXXXXXXX")) {
      adNodes.forEach((node) => {
        node.classList.add("ad-placeholder-mode");
      });
      return;
    }

    if (!document.querySelector('script[data-ramsis-adsense-script]')) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.ramsisAdsenseScript = "true";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsenseClient}`;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    adNodes.forEach((node) => {
      if (node.dataset.adReady === "true") return;
      const key = node.dataset.adKey || "leaderboard";
      const slotId = config.adSlots?.[key];
      if (!slotId) {
        node.classList.add("ad-placeholder-mode");
        return;
      }
      node.innerHTML = "";
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.dataset.adClient = config.adsenseClient;
      ins.dataset.adSlot = slotId;
      ins.dataset.adFormat = node.dataset.adFormat === "rectangle" ? "rectangle" : "auto";
      ins.dataset.fullWidthResponsive = "true";
      node.appendChild(ins);
      node.dataset.adReady = "true";
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.warn("AdSense push failed", error);
      }
    });
  }

  bindThemeToggle();
  bindMobileNav();
  applyTheme(getPreferredTheme());
  hydrateBusinessArticleFromQuery();
  setLiveTimestamp();
  loadBusinessMarkets();
  loadBusinessNews();
  initAdsensePlacements();
  setInterval(() => {
    loadBusinessMarkets();
    loadBusinessNews();
  }, (marketDataConfig?.refreshMs || 60000));

});
