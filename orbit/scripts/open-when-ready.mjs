// Opens the browser as soon as the ORBIT server accepts connections (instead of a fixed delay).
import { exec } from "node:child_process";
import net from "node:net";

const port = Number(process.env.PORT ?? 3000);
const url = `http://localhost:${port}`;
const deadline = Date.now() + 10 * 60_000;

function open() {
  const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`;
  exec(cmd);
}

(function wait() {
  const s = net.connect(port, "127.0.0.1", () => {
    s.end();
    open();
  });
  s.on("error", () => {
    if (Date.now() < deadline) setTimeout(wait, 600);
  });
})();
