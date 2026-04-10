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
  sendPasswordResetEmail,
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

const GENERIC_ARTICLE_FALLBACK = {
  section: "World",
  title: "A live desk update from THE RAMSIS",
  deck: "Current coverage rendered inside the house article template with preserved source attribution and a link back to the original report.",
  text: "THE RAMSIS now uses live desk feeds across its section pages, so article clicks can open inside a consistent reading view while preserving the original source link.",
  site: "THE RAMSIS Desk",
  publishedDate: new Date().toISOString(),
  url: ""
};

const SECTION_DEFINITIONS = {
  home: {
    key: "home",
    label: "World",
    title: "World",
    summary: "General world and cross-desk coverage",
    apiLabels: ["GNews", "The News API", "NewsData.io", "NewsAPI.org"],
    homeHref: getRelative("index.html", "../index.html"),
    articlePage: getRelative("pages/article.html", "./article.html"),
    gnews: [{ endpoint: "top-headlines", category: "world" }, { endpoint: "search", query: "world OR geopolitics OR global markets" }],
    newsApi: [{ endpoint: "top-headlines", category: "general", query: "world" }],
    theNewsApi: [{ endpoint: "all", categories: "politics,business,tech,science", search: "world | geopolitics | markets" }],
    newsData: [{ category: "top" }],
    fallback: FALLBACK_NEWS
  },
  business: {
    key: "business",
    label: "Business",
    title: "Business",
    summary: "Economy, markets, policy spillovers, and corporate power",
    apiLabels: ["Financial Modeling Prep", "GNews", "The News API", "NewsData.io", "NewsAPI.org"],
    homeHref: getRelative("pages/business.html", "./business.html"),
    articlePage: getRelative("pages/business-article.html", "./business-article.html"),
    gnews: [{ endpoint: "top-headlines", category: "business" }, { endpoint: "search", query: "economy OR inflation OR central bank OR earnings" }],
    newsApi: [{ endpoint: "top-headlines", category: "business" }, { endpoint: "everything", query: "economy OR inflation OR markets", sortBy: "publishedAt" }],
    theNewsApi: [{ endpoint: "all", categories: "business", search: "markets | economy | inflation | forex" }],
    newsData: [{ category: "business" }],
    fallback: FALLBACK_NEWS.filter((item) => item.category === "business")
  },
  politics: {
    key: "politics",
    label: "Politics",
    title: "Politics",
    summary: "Government, elections, diplomacy, and power",
    apiLabels: ["GNews", "The News API", "NewsData.io", "NewsAPI.org"],
    homeHref: getRelative("pages/politics.html", "./politics.html"),
    articlePage: getRelative("pages/article.html", "./article.html"),
    gnews: [{ endpoint: "search", query: "politics OR government OR election OR parliament OR diplomacy" }, { endpoint: "top-headlines", category: "nation" }],
    newsApi: [{ endpoint: "everything", query: "politics OR government OR election OR diplomacy", sortBy: "publishedAt" }],
    theNewsApi: [{ endpoint: "all", categories: "politics", search: "politics | election | government | diplomacy" }],
    newsData: [{ category: "politics" }],
    fallback: FALLBACK_NEWS.filter((item) => item.category === "politics")
  },
  ai: {
    key: "ai",
    label: "AI",
    title: "AI",
    summary: "Models, compute, chips, startups, products, and regulation",
    apiLabels: ["GNews", "The News API", "NewsData.io", "NewsAPI.org"],
    homeHref: getRelative("pages/ai.html", "./ai.html"),
    articlePage: getRelative("pages/article.html", "./article.html"),
    gnews: [{ endpoint: "search", query: '"artificial intelligence" OR AI OR LLM OR OpenAI OR Anthropic OR Nvidia' }, { endpoint: "search", query: "AI chips OR AI regulation OR generative AI" }],
    newsApi: [{ endpoint: "everything", query: '"artificial intelligence" OR AI OR LLM OR OpenAI OR Anthropic OR Nvidia', sortBy: "publishedAt" }],
    theNewsApi: [{ endpoint: "all", categories: "tech,business", search: '"artificial intelligence" | AI | LLM | chips | OpenAI | Anthropic' }],
    newsData: [{ q: "artificial intelligence OR AI OR LLM", category: "technology" }],
    fallback: FALLBACK_NEWS.filter((item) => item.category === "ai")
  },
  tech: {
    key: "tech",
    label: "Technology",
    title: "Technology",
    summary: "Platforms, devices, software, startups, and semiconductors",
    apiLabels: ["GNews", "The News API", "NewsData.io", "NewsAPI.org"],
    homeHref: getRelative("pages/tech.html", "./tech.html"),
    articlePage: getRelative("pages/article.html", "./article.html"),
    gnews: [{ endpoint: "top-headlines", category: "technology" }, { endpoint: "search", query: "technology OR software OR semiconductors OR gadgets" }],
    newsApi: [{ endpoint: "top-headlines", category: "technology" }, { endpoint: "everything", query: "technology OR software OR semiconductors", sortBy: "publishedAt" }],
    theNewsApi: [{ endpoint: "all", categories: "tech", search: "technology | software | semiconductors | devices" }],
    newsData: [{ category: "technology" }],
    fallback: []
  },
  science: {
    key: "science",
    label: "Science",
    title: "Science",
    summary: "Research, discovery, medicine, and climate",
    apiLabels: ["GNews", "The News API", "NewsData.io", "NewsAPI.org"],
    homeHref: getRelative("pages/science.html", "./science.html"),
    articlePage: getRelative("pages/article.html", "./article.html"),
    gnews: [{ endpoint: "top-headlines", category: "science" }, { endpoint: "search", query: "science OR research OR discovery OR climate" }],
    newsApi: [{ endpoint: "top-headlines", category: "science" }, { endpoint: "everything", query: "science OR research OR climate OR medicine", sortBy: "publishedAt" }],
    theNewsApi: [{ endpoint: "all", categories: "science", search: "science | research | climate | medicine" }],
    newsData: [{ category: "science" }],
    fallback: []
  },
  culture: {
    key: "culture",
    label: "Culture",
    title: "Culture",
    summary: "Film, books, design, arts, and criticism",
    apiLabels: ["GNews", "The News API", "NewsData.io", "NewsAPI.org"],
    homeHref: getRelative("pages/culture.html", "./culture.html"),
    articlePage: getRelative("pages/article.html", "./article.html"),
    gnews: [{ endpoint: "search", query: "culture OR arts OR film OR books OR design OR music" }],
    newsApi: [{ endpoint: "everything", query: "culture OR arts OR film OR books OR design", sortBy: "publishedAt" }],
    theNewsApi: [{ endpoint: "all", categories: "entertainment", search: "culture | arts | film | books | design" }],
    newsData: [{ q: "culture OR arts OR film OR books OR design", category: "entertainment" }],
    fallback: []
  },
  opinion: {
    key: "opinion",
    label: "Opinion",
    title: "Opinion",
    summary: "Analysis, editorials, perspectives, and commentary",
    apiLabels: ["GNews", "The News API", "NewsData.io", "NewsAPI.org"],
    homeHref: getRelative("pages/opinion.html", "./opinion.html"),
    articlePage: getRelative("pages/article.html", "./article.html"),
    gnews: [{ endpoint: "search", query: "opinion OR analysis OR editorial OR commentary" }],
    newsApi: [{ endpoint: "everything", query: "opinion OR analysis OR editorial OR commentary", sortBy: "publishedAt" }],
    theNewsApi: [{ endpoint: "all", categories: "politics,business,tech", search: "opinion | analysis | editorial | commentary" }],
    newsData: [{ q: "opinion OR analysis OR editorial OR commentary" }],
    fallback: []
  }
};

const NEWS_CACHE_PREFIX = "ramsis-news-cache-v4-";

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
      <div class="auth-modal auth-modal-editorial" role="dialog" aria-modal="true" aria-labelledby="ramsisAuthHeading">
        <section class="auth-editorial-shell">
          <div class="auth-editorial-copy">
            <div class="auth-brandmark">THE RAMSIS</div>
            <div class="auth-kicker">The sovereign editorial</div>
            <h2 class="auth-editorial-title" data-auth-copy-title>Sign In</h2>
            <p class="auth-editorial-text" data-auth-copy-text>
              Access the curated archives and global intelligence of The Ramsis editorial desk.
            </p>
            <div class="auth-editorial-footer">© 2026 THE RAMSIS. Archiving the modern world.</div>
          </div>
          <div class="auth-editorial-visual">
            <div class="auth-editorial-quote-wrap">
              <span class="auth-editorial-line"></span>
              <blockquote class="auth-editorial-quote">
                "History is not merely the past, it is the lens through which we decrypt the present chaos."
              </blockquote>
              <div class="auth-editorial-credit">Chief Editor</div>
              <div class="auth-editorial-publication">THE RAMSIS ARCHIVE</div>
            </div>
          </div>
          <button class="auth-close" type="button" aria-label="Close">×</button>
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
              <div class="auth-field"><label for="ramsisSignInEmail">Corporate email</label><input id="ramsisSignInEmail" type="email" name="email" placeholder="name@theramsis.com" required></div>
              <div class="auth-field"><label for="ramsisSignInPassword">Credential key</label><input id="ramsisSignInPassword" type="password" name="password" placeholder="••••••••" required></div>
              <div class="auth-meta-row">
                <label class="auth-check"><input type="checkbox" name="remember"><span>Remember station</span></label>
                <button class="auth-link-button" type="button" data-forgot-password>Forgot password</button>
              </div>
              <button class="auth-submit" type="submit">Authenticate access</button>
              <div class="auth-divider auth-divider-tight">or</div>
              <button class="auth-secondary" type="button" data-switch-tab="signup">Request new credentials</button>
              <div class="auth-message" data-auth-message="signin"></div>
            </form>
            <form class="auth-form" data-auth-form="signup">
              <h3>Create account</h3>
              <p>Create your reader account and your profile will sync across the site.</p>
              <div class="auth-socials">
                <button type="button" class="auth-social" data-social="google"><span>G</span><span>Continue with Google</span></button>
              </div>
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
    const title = qs("[data-auth-copy-title]");
    const textNode = qs("[data-auth-copy-text]");
    if (title) title.textContent = name === "signup" ? "Create Account" : "Sign In";
    if (textNode) textNode.textContent = name === "signup"
      ? "Build your reader identity first. Your profile, image, and subscriptions will follow you across The Ramsis."
      : "Access the curated archives and global intelligence of The Ramsis editorial desk.";
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

  qs("[data-forgot-password]")?.addEventListener("click", async () => {
    if (!auth) return setMessage("signin", "Firebase Authentication is not configured yet.", "error");
    const email = String(qs("#ramsisSignInEmail")?.value || "").trim();
    if (!email) return setMessage("signin", "Enter your email first, then choose Forgot password.", "error");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("signin", "Password reset email sent. Check your inbox.", "success");
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
      await signOut(auth);
      const signInEmail = qs("#ramsisSignInEmail");
      const signInPassword = qs("#ramsisSignInPassword");
      if (signInEmail) signInEmail.value = email;
      if (signInPassword) signInPassword.value = password;
      activateTab("signin");
      setMessage("signin", "Account created. Signing you in…", "success");
      await signInWithEmailAndPassword(auth, email, password);
      closeAuth();
    } catch (error) {
      setMessage("signup", mapAuthError(error), "error");
    }
  });

  const updateProfileUi = (user) => {
    qsa("[data-account-pill]").forEach((target) => {
      target.style.display = user ? "flex" : "none";
      target.hidden = !user;
      if (!user) {
        target.innerHTML = "";
        return;
      }
      const name = userDisplayName(user);
      const avatar = userAvatar(user);
      const known = readKnownAccounts().filter((item) => item.email !== user.email).slice(0, 4);
      target.innerHTML = `
        <div class="account-menu" data-account-menu>
          <button class="account-chip" type="button" data-account-menu-trigger aria-expanded="false" title="${escapeHtml(name)}">
            ${avatarMarkup(name, avatar)}
            <span class="account-chip-text">${escapeHtml(name)}</span>
          </button>
          <div class="account-dropdown">
            <button class="account-dropdown-item account-dropdown-switch-row" type="button" data-account-switcher>
              <span>Account switcher</span>
              <span class="account-switch-arrow">›</span>
            </button>
            <a class="account-dropdown-item" href="${getRelative("pages/profile.html", "./profile.html")}">Profile</a>
            <a class="account-dropdown-item" href="${getRelative("pages/profile.html#settings", "./profile.html#settings")}">Settings</a>
            <a class="account-dropdown-item" href="${getRelative("pages/profile.html#subscriptions", "./profile.html#subscriptions")}">My subscriptions</a>
            <a class="account-dropdown-item" href="${getRelative("pages/profile.html#help", "./profile.html#help")}">Help</a>
            <button class="account-dropdown-item danger" type="button" data-auth-logout>Sign out</button>
          </div>
          <div class="account-switcher-panel">
            <div class="account-switcher-header">
              ${avatarMarkup(name, avatar, "account-avatar-fallback large")}
              <div class="account-switcher-meta">
                <strong>${escapeHtml(name)}</strong>
                <small>${escapeHtml(user.email || "")}</small>
              </div>
            </div>
            ${known.length ? known.map((item) => `
              <button class="account-switcher-item" type="button" data-account-login="${escapeHtml(item.email)}">
                ${avatarMarkup(item.name, item.photoURL)}
                <div class="account-switcher-meta">
                  <strong>${escapeHtml(item.name)}</strong>
                  <small>${escapeHtml(item.email)}</small>
                </div>
              </button>`).join("") : `<div class="account-switcher-empty">Other accounts you use on this browser will appear here.</div>`}
            <button class="account-switcher-item" type="button" data-account-add>
              <span class="account-switcher-plus">+</span>
              <div class="account-switcher-meta"><strong>Add account</strong><small>Use another Ramsis identity</small></div>
            </button>
            <button class="account-switcher-item danger" type="button" data-auth-logout>
              <span class="account-switcher-plus">↗</span>
              <div class="account-switcher-meta"><strong>Sign out…</strong><small>Leave this account on this browser</small></div>
            </button>
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
    requestAnimationFrame(() => {
      qsa("[data-account-pill]").forEach((node) => {
        if (user) {
          node.style.display = "flex";
          node.hidden = false;
        }
      });
    });
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
        button.closest("[data-account-menu]")?.classList.add("switcher-open");
      };
    });
    qsa("[data-account-add]").forEach((button) => {
      button.onclick = () => {
        qsa("[data-account-menu]").forEach((node) => node.classList.remove("open", "switcher-open"));
        openAuth("signin");
      };
    });
    qsa("[data-auth-logout]").forEach((button) => button.onclick = async () => { if (auth) await signOut(auth); });
    qsa("[data-account-login]").forEach((button) => {
      button.onclick = () => {
        const input = qs("#ramsisSignInEmail");
        if (input) input.value = button.dataset.accountLogin || "";
        qsa("[data-account-menu]").forEach((node) => node.classList.remove("open", "switcher-open"));
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
    category: item.category || category,
    title: item.title || item.headline || item.name || "Untitled update",
    text: item.text || item.content || item.description || item.summary || item.snippet || "Open the story for full coverage.",
    site: item.site || item.source || item.publisher || item.source?.name || item.news_site || "News Desk",
    url: item.url || item.link || item.source_url || "",
    publishedDate: item.publishedDate || item.published_at || item.publishedAt || item.date || new Date().toISOString(),
    image: item.image || item.imageUrl || item.image_url || item.urlToImage || ""
  })).filter((item) => item.title);
}

function dedupeNews(items = []) {
  const map = new Map();
  items.forEach((item) => {
    const key = (item.url || item.title || "").toLowerCase().trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, item);
  });
  return [...map.values()].sort((a, b) => new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0));
}

function sectionCacheKey(sectionKey) {
  return `${NEWS_CACHE_PREFIX}${sectionKey}`;
}

function getSectionKeyFromPage() {
  return document.body.dataset.sectionPage || (window.location.pathname.match(/\/(business|politics|ai|tech|science|culture|opinion)\.html$/)?.[1]) || "home";
}

function buildGNewsUrl(request, max = Number(newsDataConfig?.maxPerSection || 24)) {
  const apiKey = newsDataConfig?.gnewsApiKey || "";
  if (!apiKey) return "";
  const params = new URLSearchParams({ lang: "en", max: String(Math.min(max, 25)), apikey: apiKey });
  if (request.endpoint === "top-headlines") {
    if (request.category) params.set("category", request.category);
    if (request.query) params.set("q", request.query);
    return `https://gnews.io/api/v4/top-headlines?${params.toString()}`;
  }
  params.set("q", request.query || request.category || "news");
  return `https://gnews.io/api/v4/search?${params.toString()}`;
}

async function fetchGNewsSection(definition) {
  const key = newsDataConfig?.gnewsApiKey || "";
  if (!key || key.includes("PASTE_YOUR_")) return [];
  const requests = definition.gnews || [];
  const data = await Promise.all(requests.map(async (request) => {
    try {
      const json = await fetchJson(buildGNewsUrl(request));
      return normalizeNews(json.articles || [], definition.key);
    } catch {
      return [];
    }
  }));
  return data.flat();
}

function buildNewsApiUrl(request, pageSize = 12) {
  const params = new URLSearchParams({ language: "en", pageSize: String(pageSize) });
  if (request.category) params.set("category", request.category);
  if (request.query) params.set("q", request.query);
  if (request.sortBy) params.set("sortBy", request.sortBy);
  const endpoint = request.endpoint === "everything" ? "everything" : "top-headlines";
  return `https://newsapi.org/v2/${endpoint}?${params.toString()}`;
}

async function fetchNewsApiSection(definition) {
  const apiKey = newsDataConfig?.newsApiKey || "";
  if (!apiKey || apiKey.includes("PASTE_YOUR_")) return [];
  const requests = definition.newsApi || [];
  const data = await Promise.all(requests.map(async (request) => {
    try {
      const json = await fetchJson(buildNewsApiUrl(request), { headers: { "X-Api-Key": apiKey } });
      return normalizeNews(json.articles || [], definition.key);
    } catch {
      return [];
    }
  }));
  return data.flat();
}

async function fetchTheNewsApiSection(definition) {
  const apiToken = newsDataConfig?.theNewsApiKey || "";
  if (!apiToken || apiToken.includes("PASTE_YOUR_")) return [];
  const requests = definition.theNewsApi || [];
  const data = await Promise.all(requests.map(async (request) => {
    try {
      const params = new URLSearchParams({ api_token: apiToken, language: "en", limit: "12" });
      if (request.categories) params.set("categories", request.categories);
      if (request.search) params.set("search", request.search);
      const endpoint = request.endpoint === "top" ? "top" : "all";
      const json = await fetchJson(`https://api.thenewsapi.com/v1/news/${endpoint}?${params.toString()}`);
      return normalizeNews(json.data || [], definition.key);
    } catch {
      return [];
    }
  }));
  return data.flat();
}

async function fetchNewsDataSection(definition) {
  const apiKey = newsDataConfig?.newsDataApiKey || "";
  if (!apiKey || apiKey.includes("PASTE_YOUR_")) return [];
  const requests = definition.newsData || [];
  const data = await Promise.all(requests.map(async (request) => {
    try {
      const params = new URLSearchParams({ apikey: apiKey, language: "en", size: "12" });
      if (request.category) params.set("category", request.category);
      if (request.q) params.set("q", request.q);
      const json = await fetchJson(`https://newsdata.io/api/1/latest?${params.toString()}`);
      return normalizeNews(json.results || [], definition.key);
    } catch {
      return [];
    }
  }));
  return data.flat();
}

async function fetchFinancialNews(limit = 12) {
  const apiKey = marketDataConfig?.apiKey || "";
  if (!apiKey || apiKey.includes("PASTE_YOUR_")) return [];
  try {
    const url = `https://financialmodelingprep.com/stable/news/latest?limit=${limit}&apikey=${apiKey}`;
    const data = await fetchJson(url);
    return normalizeNews(data, "business");
  } catch {
    return [];
  }
}

async function fetchSectionNews(sectionKey = getSectionKeyFromPage()) {
  const definition = SECTION_DEFINITIONS[sectionKey] || SECTION_DEFINITIONS.home;
  const cached = readJson(sectionCacheKey(sectionKey), null);
  const tasks = [fetchGNewsSection(definition), fetchTheNewsApiSection(definition), fetchNewsDataSection(definition)];
  if (["business", "home"].includes(sectionKey)) tasks.unshift(fetchFinancialNews(sectionKey === "business" ? 14 : 8));
  if (window.location.protocol !== "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    tasks.push(fetchNewsApiSection(definition));
  }
  try {
    const result = dedupeNews([...(await Promise.all(tasks)).flat(), ...(definition.fallback || []), ...FALLBACK_NEWS.filter((item) => sectionKey === "home" || item.category === sectionKey)]).slice(0, Number(newsDataConfig?.maxPerSection || 24));
    if (result.length) {
      writeJson(sectionCacheKey(sectionKey), { items: result, updatedAt: Date.now() });
      return result;
    }
  } catch (error) {
    console.warn(`Section news fallback active for ${sectionKey}`, error);
  }
  return cached?.items?.length ? cached.items : dedupeNews([...(definition.fallback || []), ...FALLBACK_NEWS]).slice(0, 12);
}

function articleHref(item) {
  const sectionKey = item.category || getSectionKeyFromPage();
  const definition = SECTION_DEFINITIONS[sectionKey] || SECTION_DEFINITIONS.home;
  const base = definition.articlePage || getRelative("pages/article.html", "./article.html");
  const params = new URLSearchParams({
    section: definition.title || sectionKey,
    title: item.title,
    deck: item.text,
    text: item.text,
    source: item.site,
    when: item.publishedDate,
    external: item.url || "",
    category: sectionKey
  });
  return `${base}?${params.toString()}`;
}

function renderLeadStory(node, item) {
  if (!node || !item) return;
  node.innerHTML = `
    <div class="section-kicker"><span class="kicker-pill">Lead</span><span>${escapeHtml(item.category || "desk")}</span></div>
    <h2><a href="${articleHref(item)}">${escapeHtml(item.title)}</a></h2>
    <p>${escapeHtml(item.text)}</p>
    <div class="section-source-row"><span>${escapeHtml(item.site)}</span><span>${escapeHtml(formatPublishedTime(item.publishedDate))}</span></div>
  `;
}

function renderStoryList(node, items = []) {
  if (!node) return;
  node.innerHTML = items.map((item) => `
    <article class="section-story-item">
      <div class="section-story-time">${escapeHtml(formatPublishedTime(item.publishedDate))}</div>
      <div>
        <h3><a href="${articleHref(item)}">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.text)}</p>
        <div class="section-source-row"><span>${escapeHtml(item.site)}</span><span>${escapeHtml(item.category || "desk")}</span></div>
      </div>
    </article>
  `).join("") || `<div class="home-section-empty">No stories available right now.</div>`;
}

function renderRailList(node, items = []) {
  if (!node) return;
  node.innerHTML = items.map((item) => `<li><a href="${articleHref(item)}"><strong>${escapeHtml(item.title)}</strong><br><span>${escapeHtml(item.site)} • ${escapeHtml(formatPublishedTime(item.publishedDate))}</span></a></li>`).join("") || `<li class="home-section-empty">No rail stories available.</li>`;
}

function renderArchiveList(node, items = []) {
  if (!node) return;
  node.innerHTML = items.map((item) => `
    <article class="section-archive-item">
      <time class="section-story-time">${escapeHtml(formatPublishedTime(item.publishedDate))}</time>
      <div>
        <div class="archive-cat">${escapeHtml(item.category || "Desk")}</div>
        <h3 class="story-title"><a href="${articleHref(item)}">${escapeHtml(item.title)}</a></h3>
        <p class="story-excerpt">${escapeHtml(item.text)}</p>
      </div>
      <div class="section-archive-source">${escapeHtml(item.site)}</div>
    </article>
  `).join("") || `<div class="home-section-empty">Archive is empty right now.</div>`;
}

async function loadSectionPageNews() {
  const pageKey = getSectionKeyFromPage();
  const definition = SECTION_DEFINITIONS[pageKey];
  if (!definition || pageKey === "home") return [];
  const items = await fetchSectionNews(pageKey);
  renderLeadStory(qs("[data-section-lead]"), items[0]);
  renderStoryList(qs("[data-section-feed]"), items.slice(1, 9));
  renderRailList(qs("[data-section-rail]"), items.slice(0, 6));
  renderArchiveList(qs("[data-section-archive]"), items.slice(0, Number(newsDataConfig?.maxPerSection || 24)));
  qsa("[data-section-api-list]").forEach((node) => node.innerHTML = (definition.apiLabels || []).map((label) => `<span class="section-api-pill">${escapeHtml(label)}</span>`).join(""));
  qsa("[data-section-count]").forEach((node) => node.textContent = String(items.length));
  qsa("[data-section-primary-source]").forEach((node) => node.textContent = definition.apiLabels?.[0] || "GNews");
  qsa("[data-section-updated]").forEach((node) => node.textContent = `Updated ${formatPublishedTime(new Date().toISOString())}`);
  return items;
}

async function loadHomeDeskSummaries() {
  const container = qs("[data-home-desks]");
  if (!container) return;
  const sections = ["business", "politics", "ai", "tech", "science", "culture", "opinion"];
  const entries = await Promise.all(sections.map(async (key) => [key, await fetchSectionNews(key)]));
  container.innerHTML = entries.map(([key, items]) => {
    const definition = SECTION_DEFINITIONS[key];
    return `
      <article class="home-desk-card">
        <div class="home-desk-card-head"><div><div class="home-desk-tag">${escapeHtml(definition.label)}</div><h3>${escapeHtml(definition.title)}</h3></div><a href="${definition.homeHref}">Open desk</a></div>
        <ul class="home-desk-list">
          ${(items || []).slice(0, 5).map((item) => `
            <li>
              <a href="${articleHref(item)}">
                <h4>${escapeHtml(item.title)}</h4>
                <span>${escapeHtml(item.site)} • ${escapeHtml(formatPublishedTime(item.publishedDate))}</span>
              </a>
            </li>`).join("") || `<li class="home-section-empty">No headlines yet.</li>`}
        </ul>
      </article>
    `;
  }).join("");
}

async function loadBusinessNews() {
  const leadNode = qs("[data-lead-news]");
  const feedNode = qs("[data-news-feed]");
  const railNode = qs("[data-rail-news]");
  const archiveNode = qs("[data-business-archive]");
  const breakingNode = qs("[data-breaking-track]");
  const merged = await fetchSectionNews("business");

  if (leadNode) {
    const lead = merged[0] || ARTICLE_FALLBACK;
    leadNode.innerHTML = `
      <div class="headline-card-kicker">Top story</div>
      <h3><a href="${articleHref(lead)}">${escapeHtml(lead.title)}</a></h3>
      <p>${escapeHtml(lead.text)}</p>
      <div class="headline-meta"><span>${escapeHtml(lead.site)}</span><span>${escapeHtml(formatPublishedTime(lead.publishedDate))}</span></div>
      <a class="text-link-accent" href="${articleHref(lead)}">Open coverage</a>
    `;
  }
  if (feedNode) {
    feedNode.innerHTML = merged.slice(1, 9).map((item) => `
      <article class="headline-feed-item">
        <div class="headline-feed-kicker">${escapeHtml(item.category || "update")}</div>
        <h3><a href="${articleHref(item)}">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.text)}</p>
        <div class="headline-meta"><span>${escapeHtml(item.site)}</span><span>${escapeHtml(formatPublishedTime(item.publishedDate))}</span></div>
      </article>
    `).join("");
  }
  if (railNode) renderRailList(railNode, merged.slice(0, 5));
  if (archiveNode) {
    archiveNode.innerHTML = merged.slice(0, Number(newsDataConfig?.maxPerSection || 24)).map((item) => `
      <article class="archive-item business-archive-item">
        <time>${escapeHtml(formatPublishedTime(item.publishedDate))}</time>
        <div><div class="archive-cat">${escapeHtml(item.category || "Desk")}</div><h3 class="story-title"><a href="${articleHref(item)}">${escapeHtml(item.title)}</a></h3><p class="story-excerpt">${escapeHtml(item.text)}</p></div>
        <div class="archive-cat">${escapeHtml(item.site)}</div>
      </article>
    `).join("");
  }
  if (breakingNode) {
    const breakingItems = await fetchSectionNews("home");
    breakingNode.innerHTML = `<div class="breaking-items">${breakingItems.slice(0, 12).map((item) => `<a href="${articleHref(item)}">${escapeHtml(item.title)}</a>`).join("")}</div>`;
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
    mainEntityOfPage: canonicalUrl()
  });
}

function hydrateGenericArticleFromQuery() {
  const page = qs(".article-body");
  if (!page || qs("[data-business-article-page]")) return;
  const params = new URLSearchParams(window.location.search);
  const data = {
    section: params.get("section") || GENERIC_ARTICLE_FALLBACK.section,
    title: params.get("title") || GENERIC_ARTICLE_FALLBACK.title,
    deck: params.get("deck") || GENERIC_ARTICLE_FALLBACK.deck,
    text: params.get("text") || GENERIC_ARTICLE_FALLBACK.text,
    site: params.get("source") || GENERIC_ARTICLE_FALLBACK.site,
    when: params.get("when") || GENERIC_ARTICLE_FALLBACK.publishedDate,
    external: params.get("external") || ""
  };
  qs(".article-title") && (qs(".article-title").textContent = data.title);
  qs(".kicker-row .kicker-pill") && (qs(".kicker-row .kicker-pill").textContent = data.section);
  qsa(".kicker-row span")[1] && (qsa(".kicker-row span")[1].textContent = "Live desk");
  qs(".author-name") && (qs(".author-name").textContent = data.site);
  qsa(".meta-value")[0] && (qsa(".meta-value")[0].textContent = formatPublishedTime(data.when));
  qs(".deck-quote") && (qs(".deck-quote").textContent = data.deck);
  qs(".article-body p.dropcap") && (qs(".article-body p.dropcap").textContent = data.text);
  const tags = qs(".article-body .tags");
  if (tags) {
    tags.innerHTML = `<a href="#">${escapeHtml(data.section)}</a><a href="#">Live Desk</a>${data.external ? `<a href="${escapeHtml(data.external)}" target="_blank" rel="noopener noreferrer">Source link</a>` : ""}`;
  }
  document.title = `${data.title} — THE RAMSIS`;
  const desc = qs('meta[name="description"]');
  if (desc) desc.setAttribute("content", data.deck);
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
  hydrateGenericArticleFromQuery();
  ensureSeoEnhancements();
  initAdsensePlacements();
  await Promise.all([loadBusinessMarkets(), loadBusinessNews(), loadSectionPageNews(), loadHomeDeskSummaries()]);
  setInterval(() => {
    loadBusinessMarkets();
    loadBusinessNews();
    loadSectionPageNews();
    loadHomeDeskSummaries();
  }, Number(newsDataConfig?.refreshMs || marketDataConfig?.refreshMs || 300000));
}

document.addEventListener("DOMContentLoaded", init);
