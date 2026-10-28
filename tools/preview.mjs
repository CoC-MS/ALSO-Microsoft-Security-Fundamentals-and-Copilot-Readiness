import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, resolve, sep } from "node:path";

const root = fileURLToPath(new URL("../site/", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".zip": "application/zip",
  ".json": "application/json; charset=utf-8",
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const path = resolve(root, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);
    if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const content = await readFile(path);
    response.writeHead(200, {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    }).end(content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      response.writeHead(404).end("Not found");
    } else if (error instanceof URIError) {
      response.writeHead(400).end("Invalid path");
    } else {
      console.error("Preview request failed:", error);
      response.writeHead(500).end("Preview request failed");
    }
  }
});
server.on("error", (error) => {
  console.error("Preview server failed:", error);
  process.exitCode = 1;
});
server.listen(Number(process.env.PORT ?? 4173), "127.0.0.1", () => {
  console.log(`Readiness guide: http://127.0.0.1:${server.address().port}`);
});
