/**
 * Screenshot capture script using Playwright.
 *
 * Usage:
 *   node capture.mjs [options]
 *
 * Options:
 *   --url <url>          Single URL to capture (e.g. http://localhost:3000/)
 *   --urls <json>        JSON array of { name, url } objects for batch capture
 *   --out <dir>          Output directory (default: ./screenshots)
 *   --width <px>         Viewport width (default: 1440)
 *   --height <px>        Viewport height (default: 900)
 *   --full-page          Capture full scrollable page (default: true)
 *   --wait <ms>          Wait after page load in ms (default: 500)
 *   --wait-selector <sel> Wait for CSS selector before capturing
 *
 * Examples:
 *   node capture.mjs --url http://localhost:3000 --out docs/screenshots
 *   node capture.mjs --urls '[{"name":"home","url":"http://localhost:3000"},{"name":"saved","url":"http://localhost:3000/saved"}]' --out docs/screenshots
 */

import { chromium } from "playwright";
import path from "path";
import fs from "fs";

// Parse CLI args
const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const has = (flag) => args.includes(flag);

const singleUrl = get("--url");
const urlsJson = get("--urls");
const outDir = get("--out") || "./screenshots";
const width = parseInt(get("--width") || "1440");
const height = parseInt(get("--height") || "900");
const fullPage = !has("--no-full-page");
const waitMs = parseInt(get("--wait") || "500");
const waitSelector = get("--wait-selector");

if (!singleUrl && !urlsJson) {
  console.error("Error: specify --url or --urls");
  process.exit(1);
}

// Build target list
let targets;
if (singleUrl) {
  const name = get("--name") || "screenshot";
  targets = [{ name, url: singleUrl }];
} else {
  targets = JSON.parse(urlsJson);
}

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width, height } });

const results = [];

for (const target of targets) {
  const page = await context.newPage();
  try {
    await page.goto(target.url, { waitUntil: "networkidle", timeout: 30000 });
    if (waitSelector) {
      await page.waitForSelector(waitSelector, { timeout: 10000 });
    }
    if (waitMs > 0) await page.waitForTimeout(waitMs);

    const filename = `${target.name}.png`;
    const filepath = path.join(outDir, filename);
    await page.screenshot({ path: filepath, fullPage });

    const stat = fs.statSync(filepath);
    console.log(`✓ ${filename} (${(stat.size / 1024).toFixed(1)}KB)`);
    results.push({ name: target.name, url: target.url, file: filepath, ok: true });
  } catch (err) {
    console.error(`✗ ${target.name}: ${err.message}`);
    results.push({ name: target.name, url: target.url, ok: false, error: err.message });
  } finally {
    await page.close();
  }
}

await browser.close();

const ok = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\nDone: ${ok} succeeded, ${fail} failed → ${path.resolve(outDir)}`);

if (fail > 0) process.exit(1);
