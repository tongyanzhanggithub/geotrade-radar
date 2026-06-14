(() => {
  const modal = document.getElementById("account-modal");
  if (!modal) return;

  const button = document.getElementById("account-button");
  const label = document.getElementById("account-label");
  const closeButton = document.getElementById("account-modal-close");
  const guestView = document.getElementById("account-modal-guest");
  const memberView = document.getElementById("account-modal-member");
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const form = document.getElementById("account-form");
  const emailInput = document.getElementById("account-email");
  const passwordInput = document.getElementById("account-password");
  const errorBox = document.getElementById("account-error");
  const submitButton = document.getElementById("account-submit");
  const memberEmail = document.getElementById("member-email");
  const memberLevel = document.getElementById("member-level");
  const logoutButton = document.getElementById("account-logout");

  const landingGate = document.getElementById("landing-gate");
  const appShell = document.getElementById("app-shell");
  const loginTriggers = document.querySelectorAll(".landing-login-trigger");
  const langToggle = document.getElementById("lg-lang-toggle");
  const searchForm = document.getElementById("lg-search-form");
  const searchInput = document.getElementById("lg-search-input");
  const exampleChips = document.querySelectorAll(".lg-chip");

  const radarSelect = document.getElementById("radar-select");
  const rsUser = document.getElementById("rs-user");
  const rsLogout = document.getElementById("rs-logout");
  const radarCardActive = document.querySelector('.rs-card[data-radar="global"]');
  const radarCardChina = document.querySelector('.rs-card[data-radar="china"]');
  const radarCardShipping = document.querySelector('.rs-card[data-radar="shipping"]');
  const radarCardEnergy = document.querySelector('.rs-card[data-radar="energy"]');
  const radarCardIndustry = document.querySelector('.rs-card[data-radar="industry"]');
  const brandHome = document.getElementById("brand-home");
  const radarSwitch = document.getElementById("radar-switch");

  const memberLevelLabels = { free: "普通用户", member: "会员", pro: "高级会员" };

  let mode = "login";
  let currentUser = null;
  // 登录后先进入雷达选择界面，进入某个雷达后才展示仪表盘
  let enteredRadar = false;

  function showError(message) {
    if (!message) {
      errorBox.hidden = true;
      errorBox.textContent = "";
      return;
    }
    errorBox.hidden = false;
    errorBox.textContent = message;
  }

  // 注册时的密码强度提示（仅提示，不强制）
  const strengthBox = document.getElementById("password-strength");
  function updateStrength() {
    if (!strengthBox) return;
    const value = passwordInput.value;
    if (mode !== "register" || !value) {
      strengthBox.hidden = true;
      return;
    }
    let score = 0;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;
    if (/[a-zA-Z]/.test(value) && /\d/.test(value)) score += 1;
    if (/[^a-zA-Z0-9]/.test(value)) score += 1;
    const levels = [
      ["弱：至少需要 8 位", "#e87a7a"],
      ["弱：建议混合字母和数字", "#e87a7a"],
      ["中：可以再加长度或符号", "#e8c069"],
      ["较强", "#4cd9b0"],
      ["强", "#4cd9b0"],
    ];
    strengthBox.hidden = false;
    strengthBox.textContent = `密码强度 · ${levels[score][0]}`;
    strengthBox.style.color = levels[score][1];
  }
  passwordInput.addEventListener("input", updateStrength);

  function setMode(nextMode) {
    mode = nextMode;
    showError("");
    tabLogin.classList.toggle("active", mode === "login");
    tabRegister.classList.toggle("active", mode === "register");
    submitButton.textContent = mode === "login" ? "登录" : "注册";
    passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
    updateStrength();
  }

  function renderUser() {
    if (currentUser) {
      label.textContent = currentUser.email.split("@")[0];
      guestView.hidden = true;
      memberView.hidden = false;
      memberEmail.textContent = currentUser.email;
      memberLevel.textContent = memberLevelLabels[currentUser.memberLevel] || currentUser.memberLevel;
    } else {
      label.textContent = "登录";
      guestView.hidden = false;
      memberView.hidden = true;
    }
  }

  function revealShell() {
    const wasHidden = appShell.hidden;
    appShell.hidden = false;
    if (wasHidden) {
      // Leaflet 在隐藏容器里初始化时会得到零尺寸，显示后需要重新计算地图尺寸
      window.setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        if (typeof geoMap !== "undefined" && geoMap) geoMap.invalidateSize();
      }, 80);
    }
  }

  function updateGate() {
    if (!landingGate || !appShell) return;
    if (!currentUser) {
      landingGate.hidden = false;
      if (radarSelect) radarSelect.hidden = true;
      appShell.hidden = true;
      enteredRadar = false;
      return;
    }
    // 已登录
    landingGate.hidden = true;
    if (rsUser) rsUser.textContent = currentUser.email;
    if (enteredRadar) {
      if (radarSelect) radarSelect.hidden = true;
      revealShell();
    } else {
      if (radarSelect) radarSelect.hidden = false;
      appShell.hidden = true;
    }
  }

  function enterRadar() {
    enteredRadar = true;
    updateGate();
  }

  function backToRadarSelect() {
    enteredRadar = false;
    updateGate();
  }

  async function doLogout() {
    try {
      await api("/api/logout");
    } catch {
      // ignore
    }
    currentUser = null;
    enteredRadar = false;
    renderUser();
    updateGate();
    closeModal();
  }

  function openModal() {
    showError("");
    modal.hidden = false;
  }

  function openLoginModal() {
    setMode("login");
    openModal();
  }

  function closeModal() {
    modal.hidden = true;
  }

  async function api(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "请求失败");
    return data;
  }

  async function refreshSession() {
    try {
      const response = await fetch("/api/me", { credentials: "same-origin" });
      const data = await response.json();
      currentUser = data.user || null;
    } catch {
      currentUser = null;
    }
    renderUser();
    updateGate();
  }

  button.addEventListener("click", () => {
    if (currentUser) {
      renderUser();
      openModal();
    } else {
      openLoginModal();
    }
  });

  loginTriggers.forEach((trigger) =>
    trigger.addEventListener("click", (event) => {
      // 搜索框内的提交按钮会自带 submit 行为，这里统一拦截后引导登录
      if (trigger.type === "submit") event.preventDefault();
      openLoginModal();
    })
  );

  // 落地页语言切换（中文 / English），仅影响落地页文案
  if (langToggle && landingGate) {
    const applyPlaceholder = (lang) => {
      if (!searchInput) return;
      const next = searchInput.getAttribute(`data-placeholder-${lang}`);
      if (next) searchInput.placeholder = next;
    };
    langToggle.addEventListener("click", () => {
      const next = landingGate.getAttribute("data-lang") === "zh" ? "en" : "zh";
      landingGate.setAttribute("data-lang", next);
      applyPlaceholder(next);
    });
  }

  // 示例搜索标签：点击填入搜索框
  exampleChips.forEach((chip) =>
    chip.addEventListener("click", () => {
      if (!searchInput || !landingGate) return;
      const lang = landingGate.getAttribute("data-lang") === "en" ? "en" : "zh";
      const value = chip.getAttribute(`data-${lang}`) || chip.textContent.trim();
      searchInput.value = value;
      searchInput.focus();
    })
  );

  // 搜索提交需要登录后进入仪表盘
  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      openLoginModal();
    });
  }

  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  tabLogin.addEventListener("click", () => setMode("login"));
  tabRegister.addEventListener("click", () => setMode("register"));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    submitButton.disabled = true;
    try {
      const path = mode === "login" ? "/api/login" : "/api/register";
      const data = await api(path, { email, password });
      currentUser = data.user;
      form.reset();
      renderUser();
      updateGate();
      closeModal();
    } catch (error) {
      showError(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", doLogout);

  // 雷达选择界面
  if (radarCardActive) radarCardActive.addEventListener("click", enterRadar);
  // 华贸雷达是独立页面，已登录会话由 china.html 自行校验
  if (radarCardChina)
    radarCardChina.addEventListener("click", () => {
      window.location.href = "china.html";
    });
  if (radarCardShipping)
    radarCardShipping.addEventListener("click", () => {
      window.location.href = "shipping.html";
    });
  if (radarCardEnergy)
    radarCardEnergy.addEventListener("click", () => {
      window.location.href = "energy.html";
    });
  if (radarCardIndustry)
    radarCardIndustry.addEventListener("click", () => {
      window.location.href = "industry.html";
    });
  if (rsLogout) rsLogout.addEventListener("click", doLogout);

  // 顶栏「⊞ 雷达选择」按钮 → 返回雷达选择
  if (radarSwitch) radarSwitch.addEventListener("click", backToRadarSelect);

  // 仪表盘左上角品牌 → 返回雷达选择
  if (brandHome) {
    brandHome.addEventListener("click", backToRadarSelect);
    brandHome.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        backToRadarSelect();
      }
    });
  }

  refreshSession();
})();
