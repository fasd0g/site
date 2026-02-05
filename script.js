// ====== НАСТРОЙКИ СЕРВЕРОВ ======
const SERVERS = [
  {
    id: "mc",
    game: "Minecraft",
    badge: "Minecraft Server",
    title: "minecraft.serv64rus.ru",
    subtitle: "Заходи играть — статус сервера обновляется автоматически.",
    addressToCopy: "minecraft.serv64rus.ru",
    // Источник статуса (готовый публичный)
    fetchStatus: fetchMinecraftStatus,
    howtoSteps: [
      'Открой Minecraft → <b>Сетевая игра</b> → <b>Добавить сервер</b>',
      'Адрес сервера: <b>minecraft.serv64rus.ru</b>',
      'Сохрани и заходи 🎮',
    ],
    howtoNote: "На странице IP не отображается — используется только доменное имя.",
  },
  {
    id: "hytale",
    game: "Hytale",
    badge: "Hytale Server",
    title: "hytale.serv64rus.ru:6305",
    subtitle: "Статус Hytale сервера — обновляется автоматически.",
    addressToCopy: "hytale.serv64rus.ru:6305",
    // Источник статуса (твой бэкенд)
    fetchStatus: fetchHytaleStatus,
    howtoSteps: [
      'Открой Hytale → <b>Multiplayer</b> → <b>Add Server</b>',
      'Адрес сервера: <b>hytale.serv64rus.ru:6305</b>',
      'Сохрани и заходи 🎮',
    ],
    howtoNote: "Можно подключаться по домену или напрямую по IP: 185.248.101.123:6305",
  },
];

const els = {
  tabs: document.getElementById("tabs"),
  badge: document.getElementById("badge"),
  title: document.getElementById("serverTitle"),
  subtitle: document.getElementById("serverSubtitle"),
  copyBtn: document.getElementById("copyBtn"),
  toast: document.getElementById("toast"),

  statusText: document.getElementById("statusText"),
  statusHint: document.getElementById("statusHint"),

  playersNow: document.getElementById("playersNow"),
  playersMax: document.getElementById("playersMax"),
  playersList: document.getElementById("playersList"),

  versionText: document.getElementById("versionText"),
  motdText: document.getElementById("motdText"),

  howtoSteps: document.getElementById("howtoSteps"),
  howtoNote: document.getElementById("howtoNote"),

  refreshBtn: document.getElementById("refreshBtn"),
  year: document.getElementById("year"),
  footerDomain: document.getElementById("footerDomain"),
};

let activeId = localStorage.getItem("activeServerId") || SERVERS[0].id;

// ====== UI ======
function renderTabs() {
  els.tabs.innerHTML = SERVERS.map(s => `
    <button class="tab ${s.id === activeId ? "active" : ""}"
            role="tab"
            aria-selected="${s.id === activeId ? "true" : "false"}"
            data-id="${s.id}">
      ${s.game}
    </button>
  `).join("");

  els.tabs.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      activeId = btn.dataset.id;
      localStorage.setItem("activeServerId", activeId);
      renderStatic();
      refreshStatus();
    });
  });
}

function showToast(text) {
  if (!els.toast) return;
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1600);
}

function setLoading() {
  els.statusText.textContent = "Загрузка…";
  els.statusHint.textContent = "Проверяем сервер";
  els.playersNow.textContent = "—";
  els.playersMax.textContent = "—";
  els.playersList.textContent = "Список игроков может быть скрыт";
  els.versionText.textContent = "—";
  els.motdText.textContent = "—";
}

function renderStatic() {
  renderTabs();

  const s = getActive();
  document.title = `${s.game} сервер — ${s.title}`;
  els.badge.textContent = s.badge;
  els.title.textContent = s.title;
  els.subtitle.textContent = s.subtitle;
  els.footerDomain.textContent = "serv64rus.ru";

  els.howtoSteps.innerHTML = s.howtoSteps.map(x => `<li>${x}</li>`).join("");
  els.howtoNote.textContent = s.howtoNote;

  els.copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(s.addressToCopy);
      showToast("Адрес скопирован ✅");
    } catch {
      showToast("Не удалось скопировать 😕");
    }
  };
}

// ====== ОБНОВЛЕНИЕ СТАТУСА ======
async function refreshStatus() {
  const s = getActive();
  setLoading();

  try {
    const data = await s.fetchStatus(s);

    // data = { online, playersOnline, playersMax, playerNames?, version?, motd?, lastUpdate? }
    if (data.online) {
      els.statusText.textContent = "ONLINE";
      els.statusText.classList?.remove("offline");
      els.statusText.classList?.add("online");
      els.statusHint.textContent = data.lastUpdate ? `Последнее обновление: ${data.lastUpdate}` : "Сервер доступен";
    } else {
      els.statusText.textContent = "OFFLINE";
      els.statusText.classList?.remove("online");
      els.statusText.classList?.add("offline");
      els.statusHint.textContent = data.lastUpdate ? `Последнее обновление: ${data.lastUpdate}` : "Сервер недоступен";
    }

    els.playersNow.textContent = String(data.playersOnline ?? 0);
    els.playersMax.textContent = String(data.playersMax ?? 0);

    if (Array.isArray(data.playerNames) && data.playerNames.length) {
      els.playersList.textContent = `Игроки: ${data.playerNames.join(", ")}`;
    } else {
      els.playersList.textContent = "Список игроков может быть скрыт";
    }

    els.versionText.textContent = data.version || "—";
    els.motdText.textContent = data.motd || "—";
  } catch (e) {
    els.statusText.textContent = "OFFLINE";
    els.statusHint.textContent = "Не удалось получить статус (ошибка запроса)";
    els.playersNow.textContent = "—";
    els.playersMax.textContent = "—";
    els.versionText.textContent = "—";
    els.motdText.textContent = "—";
  }
}

// ====== FETCHERS ======

// Minecraft через mcsrvstat.us
async function fetchMinecraftStatus(server) {
  const url = `https://api.mcsrvstat.us/2/${encodeURIComponent(server.addressToCopy)}`;
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();

  const online = !!j.online;
  const playersOnline = j?.players?.online ?? 0;
  const playersMax = j?.players?.max ?? 0;

  const playerNames = Array.isArray(j?.players?.list) ? j.players.list : [];

  // version
  const version = j?.version || "";

  // motd может приходить массивом строк
  let motd = "";
  if (j?.motd?.clean) motd = Array.isArray(j.motd.clean) ? j.motd.clean.join("\n") : String(j.motd.clean);
  else if (j?.motd?.raw) motd = Array.isArray(j.motd.raw) ? j.motd.raw.join("\n") : String(j.motd.raw);

  return {
    online,
    playersOnline,
    playersMax,
    playerNames,
    version,
    motd,
    lastUpdate: new Date().toLocaleString(),
  };
}

// Hytale — из файла, который обновляет GitHub Actions
async function fetchHytaleStatus(server) {
  const r = await fetch("status/hytale.json", { cache: "no-store" });
  if (!r.ok) throw new Error("Cannot load status/hytale.json");
  const j = await r.json();

  return {
    online: !!j.online,
    playersOnline: j.playersOnline ?? 0,
    playersMax: j.playersMax ?? 0,
    playerNames: Array.isArray(j.playerNames) ? j.playerNames : [],
    version: j.version || "",
    motd: j.motd || "",
    lastUpdate: j.lastUpdate
      ? new Date(j.lastUpdate).toLocaleString()
      : new Date().toLocaleString(),
  };
}


function getActive() {
  return SERVERS.find(s => s.id === activeId) || SERVERS[0];
}

// ====== INIT ======
(function init() {
  els.year.textContent = String(new Date().getFullYear());
  renderStatic();
  els.refreshBtn.addEventListener("click", refreshStatus);

  refreshStatus();
  // автообновление раз в 30 секунд
  setInterval(refreshStatus, 30000);
})();
