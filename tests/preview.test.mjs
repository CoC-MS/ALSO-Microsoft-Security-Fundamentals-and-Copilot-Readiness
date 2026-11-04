import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

test("local preview supports direct language routes, reloads, downloads, and safe paths", async (t) => {
  const child = spawn(process.execPath, [fileURLToPath(new URL("../tools/preview.mjs", import.meta.url))], {
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill());
  const base = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`Preview exited: ${code}`)));
    child.stderr.on("data", (chunk) => reject(new Error(chunk.toString())));
    child.stdout.on("data", (chunk) => {
      const url = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (url) resolve(url[0]);
    });
  });
  for (const locale of ["en", "de", "fr", "es", "ru", "it", "pl"]) {
    const path = locale === "en" ? "/" : `/${locale}/`;
    for (let reload = 0; reload < 2; reload++) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), new RegExp(`<html lang="${locale}">`));
    }
    if (locale !== "en") {
      const redirect = await fetch(`${base}/${locale}`, { redirect: "manual" });
      assert.equal(redirect.status, 308);
      assert.equal(redirect.headers.get("location"), `/${locale}/`);
    }
  }
  const download = await fetch(`${base}/downloads/conditional-access.zip`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), "application/zip");
  assert.ok((await download.arrayBuffer()).byteLength > 0);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
  assert.equal((await fetch(`${base}/%ZZ`)).status, 400);
  assert.equal((await fetch(`${base}/..%2fREADME.md`)).status, 403);
  const exited = once(child, "exit");
  child.kill();
  await exited;
});
