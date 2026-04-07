import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { firebaseConfig, marketDataConfig, siteMonetizationConfig, newsDataConfig, siteConfig } from "./firebase-config.js";

const THEME_KEY = "ramsis-theme";
const PROFILE_STORE_KEY = "ramsisProfileStore";
const KNOWN_ACCOUNTS_KEY = "ramsisKnownAccounts";
const BUSINESS_CACHE_KEY = "ramsis-business-cache-v2";
const BREAKING_CACHE_KEY = "ramsis-breaking-cache-v2";

const MARKET_SYMBOLS = [
  { key: "sp500", label: "S&P 500", symbol: "^GSPC", tv: "SP:SPX" },
  { key: "dow", label: "Dow Jones", symbol: "^DJI", tv: "DJI" },
  { key: "nasdaq", label: "Nasdaq", symbol: "^IXIC", tv: "NASDAQ:IXIC" },
  { key: "egx30", label: "EGX 30", symbol: "EGX30", tv: "EGX:EGX30" },
  { key: "gold", label: "Gold", symbol: "GCUSD", tv: "OANDA:XAUUSD" },
  { key: "usdegp", label: "USD/EGP", symbol: "USDEGP", tv: "FX_IDC:USDEGP" },
  { key: "usdeur", label: "USD/EUR", symbol: "USDEUR", tv: "FX_IDC:USDEUR" }
];

const FALLBACK_MARKETS = [
  { key: "sp500", label: "S&P 500", symbol: "^GSPC", price: 5241.53, change: -6.2, changesPercentage: -0.12 },
  { key: "dow", label: "Dow Jones", symbol: "^DJI", price: 39475.90, change: 178.5, changesPercentage: 0.45 },
  { key: "nasdaq", label: "Nasdaq", symbol: "^IXIC", price: 16392.14, change: 92.5, changesPercentage: 0.56 },
  { key: "egx30", label: "EGX 30", symbol: "EGX30", price: 31245.12, change: 402.15, changesPercentage: 1.24 },
  { key: "gold", label: "Gold", symbol: "GCUSD", price: 2384.10, change: 34.2, changesPercentage: 1.45 },
  { key: "usdegp", label: "USD/EGP", symbol: "USDEGP", price: 48.25, change: -0.03, changesPercentage: -0.05 },
  { key: "usdeur", label: "USD/EUR", symbol: "USDEUR", price: 0.92, change: 0.01, changesPercentage: 0.12 }
];

const FALLBACK_NEWS = [
  {
    category: "business",
    title: "Treasury yields, gold, and the dollar reset the week’s macro conversation",
    text: "A tighter global liquidity backdrop is forcing investors to reprice safe-haven demand, currency pressure, and the durability of equity leadership.",
    site: "THE RAMSIS Desk",
    publishedDate: new Date().toISOString(),
    url: ""
  },
  {
    category: "politics",
    title: "Political risk premiums are back in cross-border portfolio strategy",
    text: "Election cycles, industrial policy, and sanctions risk are moving from headlines into allocation models.",
    site: "THE RAMSIS Politics",
    publishedDate: new Date().toISOString(),
    url: ""
  },
  {
    category: "ai",
    title: "AI infrastructure spending remains a boardroom issue, not just a product story",
    text: "Semiconductors, model hosting, regulation, and energy demand are all now part of the same capital expenditure debate.",
    site: "THE RAMSIS Tech",
    publishedDate: new Date().toISOString(),
    url: ""
  },
  {
    category: "business",
    title: "Egypt market focus sharpens as global risk appetite turns selective",
    text: "Emerging-market allocation remains highly sensitive to dollar conditions and commodity pricing.",
    site: "THE RAMSIS Desk",
    publishedDate: new Date().toISOString(),
    url: ""
  }
];

const ARTICLE_FALLBACK = {
  section: "Business",
  subSection: "Markets & Strategy",
  title: "Capital, Concentration, and the New Market Hierarchy",
  deck: "The modern market narrative is no longer just about growth. It is about concentration, liquidity, central bank timing, and the race to price political risk faster than the next desk.",
  text: "Power in modern capital markets is not merely earned through balance-sheet strength. It is amplified by narrative control, passive fund flows, and the reflexive relationship between benchmarks and belief.",
  site: "THE RAMSIS Business Desk",
  publishedDate: new Date().toISOString(),
  url: ""
};

const firebaseReady = firebaseConfig && !Object.values(firebaseConfig).some((value) => String(value || "").includes("PASTE_YOUR_"));
let auth = null;
let googleProvider = null;

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function safeNumber(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function marketClass(value) {
  if (value > 0) return "market-up";
  if (value < 0) return "market-down";
  return "market-flat";
}
function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function getRelative(pathFromRoot, pathFromPages) {
  return window.location.pathname.includes("/pages/") ? pathFromPages : pathFromRoot;
}
function canonicalUrl() {
  const base = siteConfig?.siteUrl || window.location.origin;
  return new URL(window.location.pathname.replace(/\/index\.html$/, "/"), base).toString();
}
function formatPublishedTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "Live now";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  qsa("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(theme === "dark"));
    button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    button.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  });
  const themeMeta = qs('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", theme === "dark" ? "#060708" : "#991b1e");
  renderTradingViewWidgets();
}
function bindThemeToggle() {
  qsa("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  });
}
function bindMobileNav() {
  qsa("[data-mobile-nav-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const nav = qs("[data-site-nav]");
      if (!nav) return;
      const next = !nav.classList.contains("open");
      nav.classList.toggle("open", next);
      button.setAttribute("aria-expanded", String(next));
      document.body.classList.toggle("nav-open", next);
    });
  });
  qsa("[data-site-nav] a").forEach((a) => a.addEventListener("click", () => {
    qs("[data-site-nav]")?.classList.remove("open");
    qs("[data-mobile-nav-toggle]")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }));
}

function injectGlobalChrome() {
  const header = qs(".topbar");
  if (header && !qs(".breaking-strip")) {
    header.insertAdjacentHTML("afterend", `
      <section class="breaking-strip" data-breaking-strip>
        <div class="container breaking-strip-inner">
          <span class="breaking-label">Breaking</span>
          <div class="breaking-track" data-breaking-track><span>Loading live headlines…</span></div>
        </div>
      </section>
    `);
  }

  const breadcrumbTarget = qs("main");
  if (breadcrumbTarget && !qs(".breadcrumb-wrap")) {
    const crumbs = [{ label: "Home", href: getRelative("index.html", "../index.html") }];
    const path = window.location.pathname;
    if (path.includes("/pages/business")) crumbs.push({ label: "Business", href: "./business.html" });
    if (path.includes("business-archive")) crumbs.push({ label: "Archive" });
    else if (path.includes("business-article")) crumbs.push({ label: "Article" });
    else if (path.includes("archive.html")) crumbs.push({ label: "Archive" });
    else if (path.includes("profile.html")) crumbs.push({ label: "Profile" });

    if (crumbs.length > 1) {
      breadcrumbTarget.insertAdjacentHTML("afterbegin", `
        <div class="container breadcrumb-wrap">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            ${crumbs.map((item, idx) => item.href && idx !== crumbs.length - 1 ? `<a href="${item.href}">${escapeHtml(item.label)}</a>` : `<span>${escapeHtml(item.label)}</span>`).join('<span class="breadcrumb-sep">/</span>')}
          </nav>
        </div>
      `);
    }
  }
}

function ensureSeoEnhancements() {
  let canonical = qs('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl();

  const articleSchemaNode = qs('[data-schema-slot="article"]');
  if (articleSchemaNode) return;
}

function addStructuredData(obj) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(obj);
  document.head.appendChild(script);
}

function readProfileStore() { return readJson(PROFILE_STORE_KEY, {}); }
function saveStoredProfile(uid, payload) {
  if (!uid) return;
  const store = readProfileStore();
  store[uid] = { ...(store[uid] || {}), ...payload };
  writeJson(PROFILE_STORE_KEY, store);
}
function getStoredProfile(uid) { return readProfileStore()[uid] || {}; }
function readKnownAccounts() { return readJson(KNOWN_ACCOUNTS_KEY, []); }
function writeKnownAccounts(value) { writeJson(KNOWN_ACCOUNTS_KEY, value); }
function userDisplayName(user) {
  if (!user) return "Reader";
  const stored = getStoredProfile(user.uid);
  return stored.name || user.displayName || user.email?.split("@")[0] || "Reader";
}
function userAvatar(user) {
  if (!user) return "";
  const stored = getStoredProfile(user.uid);
  return stored.photoURL || user.photoURL || "";
}
function rememberKnownAccount(user) {
  if (!user?.email) return;
  const next = {
    uid: user.uid || user.email,
    email: user.email,
    name: userDisplayName(user),
    photoURL: userAvatar(user),
    lastUsedAt: Date.now()
  };
  const merged = readKnownAccounts().filter((item) => item.email !== next.email);
  merged.unshift(next);
  writeKnownAccounts(merged.slice(0, 6));
}
function avatarMarkup(name, avatar, fallbackClass = "account-avatar-fallback") {
  const initials = (name || "Reader").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "R";
  return avatar ? `<img class="account-avatar-image" src="${avatar}" alt="${escapeHtml(name)}">` : `<span class="${fallbackClass}">${initials}</span>`;
}
function mapAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/email-already-in-use") return "This email is already registered.";
  if (code === "auth/invalid-email") return "Invalid email address.";
  if (code === "auth/weak-password") return "Password must be at least 6 characters.";
  if (code === "auth/user-not-found") return "No account found with this email.";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Incorrect email or password.";
  if (code === "auth/unauthorized-domain") return "Add your domain in Firebase Authentication → Settings → Authorized domains.";
  if (code === "auth/popup-blocked") return "Popup blocked by the browser. Try again or allow popups for this site.";
  if (code === "auth/popup-closed-by-user") return "The Google sign-in popup was closed before completion.";
  return error?.message || "Something went wrong.";
}

function injectAuthModal() {
  if (qs("[data-auth-overlay]")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="auth-overlay" data-auth-overlay aria-hidden="true">
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="ramsisAuthHeading">
        <section class="auth-panel auth-panel-single">
          <button class="auth-close" type="button" aria-label="Close">×</button>
          <div class="auth-brandbar"><div class="auth-kicker">Reader access</div><div class="auth-brand">THE RAMSIS</div></div>
          <div class="auth-tabbar">
            <button class="auth-tab active" type="button" data-auth-tab="signin">Sign in</button>
            <button class="auth-tab" type="button" data-auth-tab="signup">Create account</button>
          </div>
          <div class="auth-forms">
            <form class="auth-form active" data-auth-form="signin">
              <h3 id="ramsisAuthHeading">Sign in</h3>
              <p>Enter your reader account to continue into THE RAMSIS.</p>
              <div class="auth-socials"><button type="button" class="auth-social" data-social="google"><span>G</span><span>Continue with Google</span></button></div>
              <div class="auth-divider">or continue with email</div>
              <div class="auth-field"><label for="ramsisSignInEmail">Email</label><input id="ramsisSignInEmail" type="email" name="email" required></div>
              <div class="auth-field"><label for="ramsisSignInPassword">Password</label><input id="ramsisSignInPassword" type="password" name="password" required></div>
              <button class="auth-submit" type="submit">Sign in</button>
              <div class="auth-switch">Not signed in before? <button type="button" data-switch-tab="signup">Create a free account</button></div>
              <div class="auth-message" data-auth-message="signin"></div>
            </form>
            <form class="auth-form" data-auth-form="signup">
              <h3>Create account</h3>
              <p>Create your reader account and your profile will sync across the site.</p>
              <div class="auth-socials"><button type="button" class="auth-social" data-social="google"><span>G</span><span>Continue with Google</span></button></div>
              <div class="auth-divider">or register with email</div>
              <div class="auth-row">
                <div class="auth-field"><label for="ramsisFirstName">First name</label><input id="ramsisFirstName" type="text" name="firstName" required></div>
                <div class="auth-field"><label for="ramsisLastName">Last name</label><input id="ramsisLastName" type="text" name="lastName" required></div>
              </div>
              <div class="auth-field"><label for="ramsisRegisterEmail">Email</label><input id="ramsisRegisterEmail" type="email" name="email" required></div>
              <div class="auth-row">
                <div class="auth-field"><label for="ramsisRegisterPassword">Password</label><input id="ramsisRegisterPassword" type="password" name="password" required></div>
                <div class="auth-field"><label for="ramsisConfirmPassword">Confirm password</label><input id="ramsisConfirmPassword" type="password" name="confirmPassword" required></div>
              </div>
              <button class="auth-submit" type="submit">Create account</button>
              <div class="auth-switch">Already have an account? <button type="button" data-switch-tab="signin">Sign in</button></div>
              <div class="auth-message" data-auth-message="signup"></div>
            </form>
          </div>
        </section>
      </div>
    </div>
  `);
}

function bindAuthUI() {
  injectAuthModal();
  const overlay = qs("[data-auth-overlay]");
  const signinMsg = qs('[data-auth-message="signin"]');
  const signupMsg = qs('[data-auth-message="signup"]');

  const setMessage = (type, text, mode = "info") => {
    const node = type === "signup" ? signupMsg : signinMsg;
    if (!node) return;
    node.textContent = text || "";
    node.dataset.mode = mode;
    node.style.display = text ? "block" : "none";
  };
  const clearMessages = () => { setMessage("signin", ""); setMessage("signup", ""); };
  const activateTab = (name) => {
    qsa("[data-auth-tab]").forEach((tab) => tab.classList.toggle("active", tab.dataset.authTab === name));
    qsa("[data-auth-form]").forEach((form) => form.classList.toggle("active", form.dataset.authForm === name));
    clearMessages();
  };
  const openAuth = (tab = "signin") => {
    activateTab(tab);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("auth-open");
  };
  const closeAuth = () => {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("auth-open");
    clearMessages();
  };

  qsa("[data-open-auth], [data-inline-auth]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openAuth(button.dataset.authView || button.dataset.inlineAuth || "signin");
    });
  });
  qsa("[data-auth-tab]").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.authTab)));
  qsa("[data-switch-tab]").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.switchTab)));
  qs(".auth-close")?.addEventListener("click", closeAuth);
  overlay?.addEventListener("click", (event) => { if (event.target === overlay) closeAuth(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeAuth(); });

  qsa(".auth-social").forEach((button) => {
    button.addEventListener("click", async () => {
      const activeTab = qs(".auth-form.active")?.dataset.authForm || "signin";
      setMessage(activeTab, firebaseReady ? "Opening Google sign-in…" : "Firebase config is not ready.");
      if (!auth || !googleProvider) return;
      try {
        const isTouchLike = window.matchMedia("(max-width: 900px)").matches;
        if (isTouchLike) {
          await signInWithRedirect(auth, googleProvider);
        } else {
          await signInWithPopup(auth, googleProvider);
        }
        closeAuth();
      } catch (error) {
        setMessage(activeTab, mapAuthError(error), "error");
      }
    });
  });

  qs('[data-auth-form="signin"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth) return setMessage("signin", "Firebase Authentication is not configured yet.", "error");
    const formData = new FormData(event.currentTarget);
    try {
      await signInWithEmailAndPassword(auth, String(formData.get("email") || "").trim(), String(formData.get("password") || ""));
      closeAuth();
    } catch (error) {
      setMessage("signin", mapAuthError(error), "error");
    }
  });

  qs('[data-auth-form="signup"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!auth) return setMessage("signup", "Firebase Authentication is not configured yet.", "error");
    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirmPassword") || "");
    if (password !== confirm) return setMessage("signup", "Passwords do not match.", "error");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
      await updateProfile(cred.user, { displayName });
      saveStoredProfile(cred.user.uid, { name: displayName });
      closeAuth();
    } catch (error) {
      setMessage("signup", mapAuthError(error), "error");
    }
  });

  const updateProfileUi = (user) => {
    qsa("[data-account-pill]").forEach((target) => {
      if (!user) {
        target.innerHTML = "";
        return;
      }
      const name = userDisplayName(user);
      const avatar = userAvatar(user);
      const known = readKnownAccounts().filter((item) => item.email !== user.email).slice(0, 4);
      target.innerHTML = `
        <div class="account-menu" data-account-menu>
          <button class="account-chip" type="button" data-account-menu-trigger aria-expanded="false">
            ${avatarMarkup(name, avatar)}
            <span class="account-chip-text">${escapeHtml(name)}</span>
          </button>
          <div class="account-dropdown">
            <div class="account-summary">${avatarMarkup(name, avatar, "account-avatar-fallback large")}
              <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(user.email || "")}</span></div>
            </div>
            <a class="account-dropdown-item" href="${getRelative("pages/profile.html", "./profile.html")}">Open profile</a>
            <button class="account-dropdown-item" type="button" data-account-switcher>Switch account</button>
            <button class="account-dropdown-item danger" type="button" data-auth-logout>Sign out</button>
            <div class="account-switcher-panel">
              ${known.length ? known.map((item) => `
                <button class="account-switcher-item" type="button" data-account-login="${escapeHtml(item.email)}">
                  ${avatarMarkup(item.name, item.photoURL)}<span>${escapeHtml(item.name)}</span>
                </button>`).join("") : `<div class="account-switcher-empty">Other accounts you use on this browser will appear here.</div>`}
            </div>
          </div>
        </div>
      `;
    });

    qsa(".auth-trigger").forEach((node) => node.style.display = user ? "none" : "inline-flex");
    qsa("[data-profile-gate]").forEach((node) => node.hidden = !!user);
    qsa("[data-profile-content]").forEach((node) => node.hidden = !user);
    qsa("[data-auth-subscribe]").forEach((node) => node.classList.toggle("locked", !user));
    qsa("[data-auth-note]").forEach((node) => node.style.display = user ? "none" : "flex");

    bindAccountMenus();
    hydrateProfilePage(user);
  };

  function bindAccountMenus() {
    qsa("[data-account-menu-trigger]").forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        const menu = button.closest("[data-account-menu]");
        const next = !menu.classList.contains("open");
        qsa("[data-account-menu].open").forEach((node) => node.classList.remove("open", "switcher-open"));
        menu.classList.toggle("open", next);
        button.setAttribute("aria-expanded", String(next));
      };
    });
    qsa("[data-account-switcher]").forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        button.closest("[data-account-menu]")?.classList.toggle("switcher-open");
      };
    });
    qsa("[data-auth-logout]").forEach((button) => button.onclick = async () => { if (auth) await signOut(auth); });
    qsa("[data-account-login]").forEach((button) => {
      button.onclick = () => {
        const input = qs("#ramsisSignInEmail");
        if (input) input.value = button.dataset.accountLogin || "";
        openAuth("signin");
      };
    });
  }

  if (auth) {
    onAuthStateChanged(auth, (user) => {
      if (user) rememberKnownAccount(user);
      updateProfileUi(user || null);
    });
  } else {
    updateProfileUi(null);
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-account-menu]")) qsa("[data-account-menu]").forEach((node) => node.classList.remove("open", "switcher-open"));
  });

  window.__ramsisOpenAuth = openAuth;
}

function hydrateProfilePage(user) {
  const shell = qs("[data-profile-shell]");
  if (!shell) return;
  const gate = qs("[data-profile-gate]");
  const content = qs("[data-profile-content]");
  if (gate) gate.hidden = !!user;
  if (content) content.hidden = !user;
  if (!user) return;

  const stored = getStoredProfile(user.uid);
  const name = stored.name || user.displayName || user.email?.split("@")[0] || "Reader";
  const email = user.email || "";
  const photo = stored.photoURL || user.photoURL || "";
  const fallback = name.split(/\s+/).filter(Boolean).slice(0,2).map((p) => p[0]?.toUpperCase()).join("") || "R";

  const image = qs("[data-profile-preview-image]");
  const imageFallback = qs("[data-profile-preview-fallback]");
  if (image) {
    image.src = photo;
    image.hidden = !photo;
  }
  if (imageFallback) {
    imageFallback.hidden = !!photo;
    imageFallback.textContent = fallback;
  }
  qsa("[data-profile-page-name], [data-profile-heading-name], [data-profile-quick-name]").forEach((node) => node.textContent = name);
  qs("[data-profile-quick-email]") && (qs("[data-profile-quick-email]").textContent = email);
  qs("[data-profile-name]") && (qs("[data-profile-name]").value = name);
  qs("[data-profile-email]") && (qs("[data-profile-email]").value = email);

  qs("[data-profile-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newName = qs("[data-profile-name]")?.value?.trim() || name;
    try {
      await updateProfile(user, { displayName: newName, photoURL: photo || user.photoURL || null });
      saveStoredProfile(user.uid, { name: newName });
      const status = qs("[data-profile-status]");
      if (status) {
        status.textContent = "Profile updated.";
        status.dataset.mode = "success";
      }
      hydrateProfilePage(auth?.currentUser || user);
    } catch (error) {
      const status = qs("[data-profile-status]");
      if (status) {
        status.textContent = mapAuthError(error);
        status.dataset.mode = "error";
      }
    }
  }, { once: true });

  qs("[data-profile-photo-input]")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      saveStoredProfile(user.uid, { name, photoURL: dataUrl });
      try { await updateProfile(user, { displayName: name, photoURL: dataUrl }); } catch {}
      hydrateProfilePage(auth?.currentUser || user);
    };
    reader.readAsDataURL(file);
  }, { once: true });

  qs("[data-profile-remove-photo]")?.addEventListener("click", async () => {
    saveStoredProfile(user.uid, { photoURL: "" });
    try { await updateProfile(user, { photoURL: null }); } catch {}
    hydrateProfilePage(auth?.currentUser || user);
  }, { once: true });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadBusinessMarkets() {
  const tapeNodes = qsa("[data-market-tape]");
  const gridNodes = qsa("[data-market-grid]");
  if (!tapeNodes.length && !gridNodes.length) return FALLBACK_MARKETS;

  let markets = FALLBACK_MARKETS;
  const apiKey = marketDataConfig?.apiKey || "";
  try {
    if (apiKey && !apiKey.includes("PASTE_YOUR_")) {
      const [quotes, forex] = await Promise.all([
        fetchJson(`https://financialmodelingprep.com/stable/quote?symbol=%5EGSPC,%5EDJI,%5EIXIC,GCUSD&apikey=${apiKey}`),
        fetchJson(`https://financialmodelingprep.com/stable/batch-forex-quotes?apikey=${apiKey}`)
      ]);
      const map = new Map();
      [...quotes, ...forex].forEach((item) => map.set(item.symbol, item));
      markets = FALLBACK_MARKETS.map((item) => {
        const live = map.get(item.symbol) || map.get(item.label) || {};
        return {
          ...item,
          price: live.price ?? item.price,
          change: live.change ?? item.change,
          changesPercentage: live.changesPercentage ?? item.changesPercentage
        };
      });
    }
  } catch (error) {
    console.warn("Market fallback active", error);
  }

  writeJson(BUSINESS_CACHE_KEY, { markets, updatedAt: Date.now() });
  tapeNodes.forEach((node) => {
    node.innerHTML = markets.map((item) => {
      const pct = Number(item.changesPercentage || 0);
      return `<article class="market-tape-item"><div class="market-tape-label">${escapeHtml(item.label)}</div><span class="market-tape-price">${safeNumber(item.price)}</span><span class="market-percent ${marketClass(pct)}">${pct > 0 ? "+" : ""}${safeNumber(pct)}%</span></article>`;
    }).join("");
  });
  gridNodes.forEach((node) => {
    node.innerHTML = markets.map((item) => {
      const pct = Number(item.changesPercentage || 0);
      return `<article class="terminal-item"><small>${escapeHtml(item.label)}</small><strong>${safeNumber(item.price)}</strong><span class="market-change ${marketClass(pct)}">${pct > 0 ? "+" : ""}${safeNumber(pct)}%</span></article>`;
    }).join("");
  });
  markets.forEach((item) => qsa(`[data-snapshot="${item.key}"]`).forEach((node) => node.textContent = safeNumber(item.price)));
  qsa("[data-live-time]").forEach((node) => node.textContent = formatPublishedTime(new Date().toISOString()));
  return markets;
}

function normalizeNews(items = [], category = "general") {
  return items.map((item) => ({
    category,
    title: item.title || item.headline || "Untitled update",
    text: item.text || item.content || item.description || item.summary || "Open the story for full coverage.",
    site: item.site || item.source || item.publisher || item.source?.name || "News Desk",
    url: item.url || item.link || "",
    publishedDate: item.publishedDate || item.published_at || item.publishedAt || item.date || new Date().toISOString(),
    image: item.image || item.imageUrl || item.urlToImage || ""
  })).filter((item) => item.title);
}

async function fetchFinancialNews() {
  const apiKey = marketDataConfig?.apiKey || "";
  if (!apiKey || apiKey.includes("PASTE_YOUR_")) return [];
  try {
    const url = `https://financialmodelingprep.com/stable/news/latest?limit=8&apikey=${apiKey}`;
    const data = await fetchJson(url);
    return normalizeNews(data, "business");
  } catch {
    return [];
  }
}

async function fetchGeneralNews() {
  const sources = [];
  const gnewsKey = newsDataConfig?.gnewsApiKey || "";
  const newsApiKey = newsDataConfig?.newsApiKey || "";

  if (gnewsKey && !gnewsKey.includes("PASTE_YOUR_")) {
    try {
      const politics = fetchJson(`https://gnews.io/api/v4/top-headlines?category=general&lang=en&max=4&q=politics&apikey=${gnewsKey}`);
      const ai = fetchJson(`https://gnews.io/api/v4/search?q=artificial%20intelligence%20OR%20AI&lang=en&max=4&apikey=${gnewsKey}`);
      const [p, a] = await Promise.all([politics, ai]);
      sources.push(...normalizeNews(p.articles || [], "politics"), ...normalizeNews(a.articles || [], "ai"));
    } catch {}
  }

  if (!sources.length && newsApiKey && !newsApiKey.includes("PASTE_YOUR_")) {
    try {
      const [p, a] = await Promise.all([
        fetchJson(`https://newsapi.org/v2/top-headlines?category=general&language=en&pageSize=4&q=politics`, { headers: { "X-Api-Key": newsApiKey } }),
        fetchJson(`https://newsapi.org/v2/everything?language=en&pageSize=4&sortBy=publishedAt&q=artificial%20intelligence%20OR%20AI`, { headers: { "X-Api-Key": newsApiKey } })
      ]);
      sources.push(...normalizeNews(p.articles || [], "politics"), ...normalizeNews(a.articles || [], "ai"));
    } catch {}
  }
  return sources;
}

function articleHref(item) {
  const base = getRelative("pages/business-article.html", "./business-article.html");
  const params = new URLSearchParams({
    section: item.category || "business",
    title: item.title,
    deck: item.text,
    text: item.text,
    source: item.site,
    when: item.publishedDate,
    external: item.url || ""
  });
  return `${base}?${params.toString()}`;
}

async function loadBusinessNews() {
  const leadNode = qs("[data-lead-news]");
  const feedNode = qs("[data-news-feed]");
  const railNode = qs("[data-rail-news]");
  const archiveNode = qs("[data-business-archive]");
  const breakingNode = qs("[data-breaking-track]");

  const fallback = [...FALLBACK_NEWS];
  let merged = fallback;
  try {
    const [financial, general] = await Promise.all([fetchFinancialNews(), fetchGeneralNews()]);
    merged = [...financial, ...general, ...fallback].slice(0, 18);
  } catch {
    merged = fallback;
  }
  writeJson(BREAKING_CACHE_KEY, { items: merged, updatedAt: Date.now() });

  const lead = merged[0] || ARTICLE_FALLBACK;
  if (leadNode) {
    leadNode.innerHTML = `
      <div class="headline-card-kicker">Top story</div>
      <h3><a href="${articleHref(lead)}">${escapeHtml(lead.title)}</a></h3>
      <p>${escapeHtml(lead.text)}</p>
      <div class="headline-meta"><span>${escapeHtml(lead.site)}</span><span>${escapeHtml(formatPublishedTime(lead.publishedDate))}</span></div>
      <a class="text-link-accent" href="${articleHref(lead)}">Open coverage</a>
    `;
  }

  if (feedNode) {
    feedNode.innerHTML = merged.slice(1, 7).map((item) => `
      <article class="headline-feed-item">
        <div class="headline-feed-kicker">${escapeHtml(item.category || "update")}</div>
        <h3><a href="${articleHref(item)}">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.text)}</p>
        <div class="headline-meta"><span>${escapeHtml(item.site)}</span><span>${escapeHtml(formatPublishedTime(item.publishedDate))}</span></div>
      </article>
    `).join("");
  }

  if (railNode) {
    railNode.innerHTML = merged.slice(0, 5).map((item) => `
      <a class="rail-news-item" href="${articleHref(item)}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.site)} • ${escapeHtml(formatPublishedTime(item.publishedDate))}</span>
      </a>
    `).join("");
  }

  if (archiveNode) {
    archiveNode.innerHTML = merged.slice(0, 12).map((item) => `
      <article class="archive-item business-archive-item">
        <time>${escapeHtml(formatPublishedTime(item.publishedDate))}</time>
        <div><div class="archive-cat">${escapeHtml(item.category || "Desk")}</div><h3 class="story-title"><a href="${articleHref(item)}">${escapeHtml(item.title)}</a></h3><p class="story-excerpt">${escapeHtml(item.text)}</p></div>
        <div class="archive-cat">${escapeHtml(item.site)}</div>
      </article>
    `).join("");
  }

  if (breakingNode) {
    breakingNode.innerHTML = `<div class="breaking-items">${merged.slice(0, 10).map((item) => `<a href="${articleHref(item)}">${escapeHtml(item.title)}</a>`).join("")}</div>`;
  }

  qs("[data-news-status]") && (qs("[data-news-status]").textContent = `Updated ${formatPublishedTime(new Date().toISOString())}`);
  return merged;
}

function hydrateBusinessArticleFromQuery() {
  const page = qs("[data-business-article-page]");
  if (!page) return;
  const params = new URLSearchParams(window.location.search);
  const data = {
    section: params.get("section") || ARTICLE_FALLBACK.section,
    title: params.get("title") || ARTICLE_FALLBACK.title,
    deck: params.get("deck") || ARTICLE_FALLBACK.deck,
    text: params.get("text") || ARTICLE_FALLBACK.text,
    site: params.get("source") || ARTICLE_FALLBACK.site,
    when: params.get("when") || ARTICLE_FALLBACK.publishedDate,
    external: params.get("external") || ""
  };

  const title = qs(".article-title-business");
  const deck = qs(".business-article-deck");
  const author = qs(".author-name");
  if (title) title.textContent = data.title;
  if (deck) deck.textContent = data.deck;
  if (author) author.textContent = data.site;
  document.title = `${data.title} — THE RAMSIS`;
  const desc = qs('meta[name="description"]');
  if (desc) desc.setAttribute("content", data.deck);
  const ogTitle = qs('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", `${data.title} — THE RAMSIS`);
  const ogDesc = qs('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", data.deck);

  const firstParagraph = qs(".business-article-body p.dropcap");
  if (firstParagraph) firstParagraph.textContent = data.text;
  const tags = qs(".business-article-body .tags");
  if (data.external && tags && !qs("[data-external-story]", tags)) {
    tags.insertAdjacentHTML("beforeend", `<a href="${escapeHtml(data.external)}" target="_blank" rel="noopener noreferrer" data-external-story>Source link</a>`);
  }

  addStructuredData({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: data.title,
    description: data.deck,
    datePublished: data.when,
    dateModified: data.when,
    author: { "@type": "Organization", name: data.site },
    publisher: { "@type": "Organization", name: "THE RAMSIS" },
    mainEntityOfPage: canonicalUrl(),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: getRelative("index.html", "../index.html") },
        { "@type": "ListItem", position: 2, name: "Business", item: getRelative("pages/business.html", "./business.html") },
        { "@type": "ListItem", position: 3, name: data.title, item: canonicalUrl() }
      ]
    }
  });
}

function renderTradingViewWidgets() {
  const widgets = qsa(".tv-widget");
  if (!widgets.length) return;
  const dark = document.documentElement.dataset.theme === "dark";
  widgets.forEach((node) => {
    const symbol = node.dataset.tvSymbol || "SP:SPX";
    const height = node.classList.contains("wide") ? 420 : 320;
    node.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify({
      symbols: [[`${symbol}|1D`]],
      chartOnly: false,
      width: "100%",
      height,
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
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineWidth: 2,
      dateRanges: ["1D|1", "1M|30", "3M|60", "12M|1D", "60M|1W", "all|1M"]
    });
    container.appendChild(script);
    node.appendChild(container);
  });
}

function initAdsensePlacements() {
  const config = siteMonetizationConfig || {};
  const adNodes = qsa("[data-ad-slot]");
  if (!adNodes.length) return;
  if (!config.adsenseEnabled || !config.adsenseClient || config.adsenseClient.includes("XXXXXXXX")) {
    adNodes.forEach((node) => node.classList.add("ad-placeholder-mode"));
    return;
  }
  if (!qs('script[data-ramsis-adsense-script]')) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.ramsisAdsenseScript = "true";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsenseClient}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }
  adNodes.forEach((node) => {
    if (node.dataset.adReady === "true") return;
    const slotId = config.adSlots?.[node.dataset.adKey || "leaderboard"];
    if (!slotId) return node.classList.add("ad-placeholder-mode");
    node.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${config.adsenseClient}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    node.dataset.adReady = "true";
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  });
}

function setCurrentYear() {
  qsa("[data-year]").forEach((node) => node.textContent = String(new Date().getFullYear()));
}

function initFirebase() {
  if (!firebaseReady) return;
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  getRedirectResult(auth).catch(() => {});
}

async function init() {
  setCurrentYear();
  initFirebase();
  injectGlobalChrome();
  bindThemeToggle();
  bindMobileNav();
  applyTheme(getPreferredTheme());
  bindAuthUI();
  hydrateBusinessArticleFromQuery();
  ensureSeoEnhancements();
  initAdsensePlacements();
  await Promise.all([loadBusinessMarkets(), loadBusinessNews()]);
  setInterval(() => {
    loadBusinessMarkets();
    loadBusinessNews();
  }, Number(marketDataConfig?.refreshMs || 60000));
}

document.addEventListener("DOMContentLoaded", init);
