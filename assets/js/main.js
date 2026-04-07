document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  const authStorageKey = "the_ramsis_auth";
  const getAuth = () => {
    try {
      return JSON.parse(localStorage.getItem(authStorageKey)) || null;
    } catch (error) {
      return null;
    }
  };
  const setAuth = (payload) => localStorage.setItem(authStorageKey, JSON.stringify(payload));
  const clearAuth = () => localStorage.removeItem(authStorageKey);

  const authMarkup = `
    <div class="auth-overlay" data-auth-overlay aria-hidden="true">
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="ramsisAuthHeading">
        <aside class="auth-aside">
          <div>
            <div class="auth-kicker">The Ramsis access</div>
            <div class="auth-brand">THE RAMSIS</div>
            <h2 class="auth-headline" id="ramsisAuthHeading">Enter the royal edition. Then unlock the subscription.</h2>
            <p class="auth-copy">Inspired by premium news sign-in flows, but redesigned with a royal Egyptian identity: darker stone tones, gilded details, and a grander Ramsis presence.</p>
            <div class="auth-highlights">
              <div class="auth-highlight"><strong>Royal profile</strong>Create a reader identity that feels ceremonial, polished, and worthy of the masthead.</div>
              <div class="auth-highlight"><strong>Members chamber</strong>The subscribe panel remains hidden until entry is granted through sign in.</div>
              <div class="auth-highlight"><strong>Egyptian tone</strong>Black-and-gold depth, monumental typography, and a refined palace-like newsroom mood.</div>
            </div>
          </div>
          <div class="auth-kicker">Access journalism with a pharaonic members-first rhythm</div>
        </aside>
        <section class="auth-panel">
          <button class="auth-close" type="button" aria-label="Close">×</button>
          <div class="auth-tabbar">
            <button class="auth-tab active" type="button" data-auth-tab="signin">Sign in</button>
            <button class="auth-tab" type="button" data-auth-tab="signup">Create account</button>
          </div>
          <div class="auth-forms">
            <form class="auth-form active" data-auth-form="signin">
              <h3>Sign in</h3>
              <p>One royal reader identity to continue into THE RAMSIS.</p>
              <div class="auth-socials">
                <button type="button" class="auth-social" data-social="google"><span>G</span><span>Continue with Google</span></button>
                <button type="button" class="auth-social" data-social="apple"><span></span><span>Continue with Apple</span></button>
              </div>
              <div class="auth-divider">or continue with</div>
              <div class="auth-field">
                <label for="ramsisSignInEmail">Email</label>
                <input id="ramsisSignInEmail" type="email" name="email" placeholder="pharaoh@theramsis.com" required>
              </div>
              <div class="auth-field">
                <label for="ramsisSignInPassword">Password</label>
                <input id="ramsisSignInPassword" type="password" name="password" placeholder="Your password" required>
              </div>
              <button class="auth-submit" type="submit">Sign in</button>
              <div class="auth-switch">Not signed in before? <button type="button" data-switch-tab="signup">Create a free account</button></div>
            </form>

            <form class="auth-form" data-auth-form="signup">
              <h3>Create account</h3>
              <p>Build your royal reader identity first. Subscription appears right after access is granted.</p>
              <div class="auth-socials">
                <button type="button" class="auth-social" data-social="google"><span>G</span><span>Continue with Google</span></button>
                <button type="button" class="auth-social" data-social="apple"><span></span><span>Continue with Apple</span></button>
              </div>
              <div class="auth-divider">or register with</div>
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
                <input id="ramsisRegisterEmail" type="email" name="email" placeholder="scribe@theramsis.com" required>
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

  function activateTab(name) {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authTab === name));
    forms.forEach((form) => form.classList.toggle("active", form.dataset.authForm === name));
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
  }

  function updateAuthUI() {
    const auth = getAuth();
    const isLoggedIn = Boolean(auth && auth.email);

    authTriggers.forEach((trigger) => {
      trigger.style.display = isLoggedIn ? "none" : "inline-flex";
    });

    accountPills.forEach((pill) => {
      pill.style.display = isLoggedIn ? "inline-flex" : "none";
    });

    accountNames.forEach((node) => {
      node.textContent = auth?.name || auth?.email || "Reader";
    });

    subscribeBands.forEach((band) => {
      band.classList.toggle("locked", !isLoggedIn);
    });

    lockedNotes.forEach((note) => {
      note.style.display = isLoggedIn ? "none" : "flex";
    });

    newsletterForms.forEach((form) => {
      const input = form.querySelector('input[type="email"]');
      if (input && isLoggedIn && auth?.email) input.value = auth.email;
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

  document.querySelectorAll(".auth-social").forEach((button) => {
    button.addEventListener("click", () => {
      const provider = button.dataset.social === "apple" ? "Apple" : "Google";
      setAuth({ name: provider + " Reader", email: provider.toLowerCase() + "@theramsis.com", provider });
      updateAuthUI();
      closeAuth();
      alert(`Signed in with ${provider}. The subscription panel is now unlocked.`);
    });
  });

  const signInForm = document.querySelector('[data-auth-form="signin"]');
  signInForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(signInForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }
    const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\w/g, (char) => char.toUpperCase());
    setAuth({ name, email, provider: "email" });
    updateAuthUI();
    closeAuth();
    alert("Welcome back. Subscription is now available.");
  });

  const signUpForm = document.querySelector('[data-auth-form="signup"]');
  signUpForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(signUpForm);
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const confirmPassword = String(formData.get("confirmPassword") || "").trim();
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      alert("Please complete all account fields.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    setAuth({ name: `${firstName} ${lastName}`, email, provider: "email" });
    updateAuthUI();
    closeAuth();
    alert("Account created successfully. Subscription is now unlocked.");
  });

  logoutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      clearAuth();
      updateAuthUI();
      alert("You have been signed out.");
    });
  });

  document.querySelectorAll('[data-inline-auth]').forEach((button) => {
    button.addEventListener('click', () => openAuth(button.dataset.inlineAuth || 'signin'));
  });

  newsletterForms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const auth = getAuth();
      if (!auth?.email) {
        openAuth("signin");
        alert("Sign in first to subscribe.");
        return;
      }
      const input = form.querySelector('input[type="email"]');
      const email = input?.value.trim() || auth.email;
      if (!email) {
        alert("Please enter an email address.");
        return;
      }
      alert(`Thanks for subscribing to THE RAMSIS, ${email}!`);
      if (input) input.value = auth.email;
    });
  });

  updateAuthUI();
});
