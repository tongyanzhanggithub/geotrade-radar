// 我的雷达：用户画像加载、编辑与“按画像过滤”开关。
// 画像存服务器（/api/profile，会员专属），加载后写入 window.geoProfile，
// app.js 的 filteredEvents / matchesProfile 据此过滤事件。
(() => {
  const toggle = document.getElementById("my-radar-only");
  const editButton = document.getElementById("profile-edit-button");
  const modal = document.getElementById("profile-modal");
  if (!toggle || !modal) return;

  const closeButton = document.getElementById("profile-modal-close");
  const form = document.getElementById("profile-form");
  const hsInput = document.getElementById("profile-hs");
  const countriesInput = document.getElementById("profile-countries");
  const routesInput = document.getElementById("profile-routes");
  const webhookInput = document.getElementById("profile-webhook");
  const emailAlertsInput = document.getElementById("profile-email-alerts");
  const errorBox = document.getElementById("profile-error");

  const splitTerms = (value) =>
    String(value || "")
      .split(/[,，;；、]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const joinTerms = (list) => (list || []).join(", ");

  function showError(message) {
    errorBox.hidden = !message;
    errorBox.textContent = message || "";
  }

  function fillForm(profile) {
    hsInput.value = joinTerms(profile?.hsCodes);
    countriesInput.value = joinTerms(profile?.countries);
    routesInput.value = joinTerms(profile?.routes);
    webhookInput.value = profile?.webhook || "";
    emailAlertsInput.checked = Boolean(profile?.emailAlerts);
  }

  function rerender() {
    // 与 high-risk-only 开关相同的渲染入口（app.js 全局函数）
    if (typeof renderEventList === "function") renderEventList();
    if (typeof renderMarkers === "function") renderMarkers();
  }

  async function loadProfile() {
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) return;
      const data = await response.json();
      if (data.profile) {
        window.geoProfile = data.profile;
        fillForm(data.profile);
      }
    } catch {
      /* 未登录或网络错误：保持未过滤状态 */
    }
  }

  toggle.addEventListener("change", () => {
    if (toggle.checked && !window.geoProfile) {
      toggle.checked = false;
      openModal();
      return;
    }
    state.myRadarOnly = toggle.checked;
    rerender();
  });

  function openModal() {
    showError("");
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
  }

  editButton.addEventListener("click", (eventObject) => {
    eventObject.preventDefault();
    openModal();
  });
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (eventObject) => {
    if (eventObject.target === modal) closeModal();
  });

  form.addEventListener("submit", async (eventObject) => {
    eventObject.preventDefault();
    showError("");
    const webhook = webhookInput.value.trim();
    if (webhook && !webhook.startsWith("https://qyapi.weixin.qq.com/")) {
      showError("Webhook 地址必须是企业微信机器人地址（https://qyapi.weixin.qq.com/ 开头）");
      return;
    }
    const profile = {
      hsCodes: splitTerms(hsInput.value),
      countries: splitTerms(countriesInput.value),
      routes: splitTerms(routesInput.value),
      webhook,
      emailAlerts: emailAlertsInput.checked,
    };
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          // 钩子：用他刚填的画像现场数一遍相关事件，让价值可见
          let teaser = "";
          try {
            const terms = [...profile.hsCodes, ...profile.countries, ...profile.routes].map((t) => t.toLowerCase());
            if (terms.length && Array.isArray(events)) {
              const count = events.filter((ev) =>
                terms.some((term) =>
                  [ev.title, ev.summary, ...ev.countries, ...ev.sectors, ...ev.commodities, ev.route]
                    .join(" ")
                    .toLowerCase()
                    .includes(term),
                ),
              ).length;
              if (count > 0) teaser = `当前有 <b>${count} 条</b>与你画像相关的风险事件。`;
            }
          } catch {
            /* 钩子失败不影响提示 */
          }
          errorBox.hidden = false;
          errorBox.innerHTML = `${teaser}${data.error || "会员专属功能"} <a href="./pricing.html" style="color:var(--teal,#4cd9b0)">查看订阅方案 →</a>`;
          return;
        }
        showError(data.error || "保存失败，请稍后再试");
        return;
      }
      window.geoProfile = data.profile;
      closeModal();
      state.myRadarOnly = true;
      toggle.checked = true;
      rerender();
    } catch {
      showError("网络错误，请稍后再试");
    }
  });

  loadProfile();
})();
