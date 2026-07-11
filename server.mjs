import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const port = Number(process.argv[3] || 8787);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store, max-age=0"
  });
  res.end(body);
}

http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.resolve(root, `.${pathname}`);

  if (!file.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }

    send(res, 200, data, types[path.extname(file).toLowerCase()] || "application/octet-stream");
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`Serving ${root}`);
  console.log(`Local:  http://127.0.0.1:${port}/`);
  console.log(`iPhone: http://192.168.1.188:${port}/`);
});
