import net from "net";
import fs from "fs";

const HOST = "185.248.101.123";
const PORT = 6305;

function tcpPing(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (online) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch {}
      resolve(online);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    socket.connect(port, host);
  });
}

const online = await tcpPing(HOST, PORT, 3000);

const out = {
  online,
  // Пока без данных протокола — оставляем 0/пусто
  playersOnline: 0,
  playersMax: 0,
  playerNames: [],
  version: "",
  motd: "",
  lastUpdate: new Date().toISOString()
};

fs.mkdirSync("status", { recursive: true });
fs.writeFileSync("status/hytale.json", JSON.stringify(out, null, 2), "utf8");

console.log("Wrote status/hytale.json:", out);
