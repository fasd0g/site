(() => {
  const DOMAIN = "minecraft.serv64rus.ru"; // Только домен — IP нигде не используется

  const el = (id) => document.getElementById(id);

  const statusText = el("statusText");
  const statusHint = el("statusHint");
  const playersNow = el("playersNow");
  const playersMax = el("playersMax");
  const playersList = el("playersList");
  const versionText = el("versionText");
  const motdText = el("motdText");
  const toast = el("toast");

  const copyBtn = el("copyBtn");
  const refreshBtn = el("refreshBtn");
  el("year").textContent = new Date().getFullYear();

  function showToast(msg) {
    toast.textContent = msg;
    setTimeout(() => {
      if (toast.textContent === msg) toast.textContent = "";
    }, 2400);
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(DOMAIN);
      showToast("Адрес скопирован: " + DOMAIN);
    } catch {
      // Фоллбек
      const ta = document.createElement("textarea");
      ta.value = DOMAIN;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Адрес скопирован: " + DOMAIN);
    }
  }

  function setOffline(reason = "Сервер офлайн или недоступен") {
    statusText.textContent = "OFFLINE";
    statusText.classList.remove("mc-online");
    statusText.classList.add("offline");

    statusHint.textContent = reason;
    playersNow.textContent = "0";
    playersMax.textContent = "0";
    versionText.textContent = "—";
    motdText.textContent = "—";
    playersList.textContent = "—";
  }

  function setMinecraftOnlineText() {
    // ONLINE = 6 букв → делаем 6 сегментов
    const letters = ["O", "N", "L", "I", "N", "E"];
    statusText.innerHTML = letters.map((ch) => `<span class="seg">${ch}</span>`).join("");
    statusText.classList.remove("offline");
    statusText.classList.add("mc-online");
  }

  function cleanMotd(motd) {
    if (!motd) return "—";
    // Иногда API отдаёт массив строк
    if (Array.isArray(motd)) return motd.join("\n");
    return String(motd);
  }

  async function fetchStatus() {
    statusText.innerHTML = "…";
    statusText.classList.remove("mc-online", "offline");
    statusHint.textContent = "Обновляем статус";

    try {
      // Простое публичное API: https://api.mcsrvstat.us/2/<domain>
      const url = `https://api.mcsrvstat.us/2/${encodeURIComponent(DOMAIN)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      if (!data || data.online !== true) {
        setOffline("Сервер офлайн (по данным статуса)");
        return;
      }

      setMinecraftOnlineText();
      statusHint.textContent = "Последнее обновление: " + new Date().toLocaleString("ru-RU");

      const online = data.players?.online ?? 0;
      const max = data.players?.max ?? 0;

      playersNow.textContent = String(online);
      playersMax.textContent = String(max);

      versionText.textContent = data.version || "—";
      motdText.textContent = cleanMotd(data.motd?.clean || data.motd?.raw || data.motd);

      const list = data.players?.list;
      if (Array.isArray(list) && list.length) {
        playersList.textContent =
          "Игроки: " + list.slice(0, 20).join(", ") + (list.length > 20 ? " …" : "");
      } else {
        playersList.textContent = "Список игроков скрыт или недоступен";
      }
    } catch (e) {
      setOffline("Ошибка получения статуса");
      console.error(e);
    }
  }

  copyBtn.addEventListener("click", copyAddress);
  refreshBtn.addEventListener("click", fetchStatus);

  fetchStatus();
  // авто-обновление раз в 30 секунд
  setInterval(fetchStatus, 30000);
})();
