import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

const site = new URL("../site/", import.meta.url);
const html = await readFile(new URL("index.html", site), "utf8");
const script = await readFile(new URL("site.js", site), "utf8");
const stylesheet = await readFile(new URL("styles.css", site), "utf8");

test("all local links and assets resolve, including under a project Pages path", async () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "IDs must be unique");
  for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (value.startsWith("#")) {
      assert.ok(ids.includes(value.slice(1)), `Missing anchor ${value}`);
    } else if (!value.startsWith("https://")) {
      assert.ok(!value.startsWith("/"), `Root-relative path breaks project Pages: ${value}`);
      const file = await stat(new URL(value, site));
      assert.ok(file.isFile() && file.size > 0, `Missing/empty asset ${value}`);
    }
  }
});

test("document structure and supplied configuration are present", () => {
  assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /Gettings started with Business Premium and up/);
  assert.doesNotMatch(html, /next steps|go further|advanced-panel/i);
  assert.doesNotMatch(html, /class="hero-meta"|A practical security foundation|class="matrix-tag"|class="license-note"/);
  const matrix = html.split('<table class="readiness-matrix">')[1].split("</table>")[0];
  assert.equal([...matrix.matchAll(/<th scope="col">/g)].length, 3);
  assert.equal([...matrix.matchAll(/<td>/g)].length, 10);
  assert.match(html, /<h2 id="readiness-title">Build your security foundation first\.<\/h2>/);
  assert.match(matrix, /With E5\/ Defender and Purview Suite/);
  assert.match(matrix, /Intune Plan 1 with Intune Plan 2 or Intune Suite/);
  assert.match(matrix, /firmware-over-the-air updates for supported Android devices, Enterprise App Management, Endpoint Privilege Management, and more/);
  assert.match(html, /id="defender-identity"/);
  assert.match(html, /id="cloud-apps"/);
  assert.match(html, /id="risky-cloud-apps"/);
  assert.match(html, /id="app-governance"/);
  const cloudAppsChapter = html.split('<section class="guide-section section-width" id="apps-e5"')[1].split("</section>")[0];
  assert.deepEqual([...cloudAppsChapter.matchAll(/<article class="step" id="([^"]+)">/g)].map((match) => match[1]), ["cloud-apps", "risky-cloud-apps", "app-governance"]);
  assert.deepEqual([...cloudAppsChapter.matchAll(/class="step-marker">(\d+)</g)].map((match) => Number(match[1])), [1, 2, 3]);
  const cloudApps = html.split('<article class="step" id="cloud-apps">')[1].split("</article>")[0];
  assert.match(cloudApps, /href="https:\/\/security\.microsoft\.com\/securitysettings\/endpoints\/integration"/);
  const riskyCloudApps = html.split('<article class="step" id="risky-cloud-apps">')[1].split("</article>")[0];
  assert.match(riskyCloudApps, /After completing the integration in Step 1/);
  assert.match(riskyCloudApps, /ALSO Defender for Cloud Apps package as a ready-to-review starting point/);
  assert.match(riskyCloudApps, /href="https:\/\/learn\.microsoft\.com\/en-us\/defender-cloud-apps\/governance-discovery">Learn more: Govern discovered apps - Microsoft Defender for Cloud Apps/);
  const appGovernance = html.split('<article class="step" id="app-governance">')[1].split("</article>")[0];
  assert.match(appGovernance, /<h3>Configure app governance, review OAuth apps and set up alerts<\/h3>/);
  assert.match(appGovernance, /href="https:\/\/security\.microsoft\.com\/cloudapps\/settings"/);
  assert.match(appGovernance, /href="https:\/\/security\.microsoft\.com\/cloudapps\/settings">Turn on App Governance/);
  assert.match(appGovernance, /https:\/\/learn\.microsoft\.com\/en-us\/defender-cloud-apps\/app-governance-get-started/);
  assert.match(html, /id="access-reviews"/);
  const identity = html.split('<section class="guide-section section-width" id="identity"')[1].split("</section>")[0];
  const identitySteps = [...identity.matchAll(/<article class="step" id="([^"]+)">/g)].map((match) => match[1]);
  assert.deepEqual(identitySteps, ["security-defaults", "user-settings", "admin-role-review", "break-glass", "authentication", "sharing", "data-access-governance", "sspr", "identity-policies"]);
  assert.deepEqual([...identity.matchAll(/class="step-marker">(\d+)</g)].map((match) => Number(match[1])), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const adminRoleReview = identity.split('<article class="step" id="admin-role-review">')[1].split("</article>")[0];
  assert.match(adminRoleReview, /resourceType\/tenant\/provider\/aadroles/);
  assert.match(adminRoleReview, /active and eligible assignments across Azure and Microsoft Entra roles/);
  assert.match(adminRoleReview, /href="downloads\/Need4Admin-main\.zip" download/);
  assert.equal([...html.matchAll(/id="sharing"/g)].length, 1);
  assert.match(identity, /https:\/\/learn.microsoft.com\/en-us\/sharepoint\/data-access-governance-reports/);
  assert.match(identity, /Some core capabilities are included in Microsoft 365 E5\. Full capabilities require a separate SharePoint Advanced Management license\./);
  assert.doesNotMatch(identity, /also included in a Microsoft 365 Copilot license/);
  const data = html.split('<section class="guide-section section-width" id="data"')[1].split("</section>")[0];
  const dataSteps = [...data.matchAll(/<article class="step" id="([^"]+)">/g)].map((match) => match[1]);
  assert.deepEqual(dataSteps, ["purview-baseline", "classification"]);
  assert.deepEqual([...data.matchAll(/class="step-marker">(\d+)</g)].map((match) => Number(match[1])), [1, 2]);
  assert.match(data, /<h2 id="data-title">Data security and governance<\/h2>/);
  const copilotPreparation = html.split('<section class="guide-section section-width" id="copilot-preparation"')[1].split("</section>")[0];
  const preparationSteps = [...copilotPreparation.matchAll(/<article class="step" id="([^"]+)">/g)].map((match) => match[1]);
  assert.deepEqual(preparationSteps, ["restricted-content-discovery", "copilot-settings", "copilot-adoption-guidance"]);
  assert.deepEqual([...copilotPreparation.matchAll(/class="step-marker">(\d+)</g)].map((match) => Number(match[1])), [1, 2, 3]);
  assert.match(copilotPreparation, /https:\/\/learn.microsoft.com\/en-us\/sharepoint\/restricted-content-discovery/);
  assert.match(copilotPreparation, /href="https:\/\/admin\.cloud\.microsoft\/#\/copilot\/settings\/ViewAll"/);
  assert.match(copilotPreparation, /<h2 id="copilot-preparation-title">Copilot preparation &amp; adoption<\/h2>/);
  assert.match(html, /<a href="#copilot-preparation"><span>05<\/span> Copilot preparation &amp; adoption<\/a>/);
  const copilotSettings = copilotPreparation.split('<article class="step" id="copilot-settings">')[1].split("</article>")[0];
  assert.doesNotMatch(copilotSettings, /microsoft-365-copilot-setup/);
  assert.match(copilotSettings, /href="https:\/\/learn\.microsoft\.com\/en-us\/microsoft-365\/copilot\/configure-copilot-admin-center">Learn more: Configure Microsoft Copilot settings in the Microsoft 365 admin center/);
  const copilotAdoptionGuidance = copilotPreparation.split('<article class="step" id="copilot-adoption-guidance">')[1].split("</article>")[0];
  assert.match(copilotAdoptionGuidance, /<h3>Review the Microsoft Copilot adoption guidance<\/h3>/);
  assert.match(copilotAdoptionGuidance, /This article provides an overview of the steps and resources that can help you enable and start using Microsoft Copilot in your organization\./);
  assert.match(copilotAdoptionGuidance, /href="https:\/\/learn.microsoft.com\/en-us\/copilot\/microsoft-365\/microsoft-365-copilot-setup"/);
  assert.match(copilotAdoptionGuidance, /Learn about Microsoft Copilot adoption/);
  assert.doesNotMatch(html, /Validate the foundation in the real world/);
  assert.doesNotMatch(data, /microsoft-365-copilot-setup/);
  assert.match(html, /eligible, time-bound PIM/);
  for (const policy of [
    "CA000", "CA105", "CA002", "CA004", "CA003", "CA203", "CA005",
    "CA204", "CA109", "CA107", "CA108", "CA110", "CA205", "CA208", "CA211",
  ]) assert.match(html, new RegExp(`<code>${policy}</code>`));
  assert.match(html, /CA107<\/code><\/td><td><code>CA205/);
  assert.match(html, /CA108<\/code><\/td><td><code>CA208/);
  assert.match(html, /CA110<\/code><\/td><td><code>CA211/);
  assert.equal([...html.matchAll(/<details class="visual-reference">/g)].length, 6);
  assert.match(html, /Review the default user permissions and external collaboration settings/);
  assert.match(html, /href="https:\/\/entra\.microsoft\.com\/#view\/Microsoft_AAD_IAM\/AllowlistPolicyBlade"/);
  assert.doesNotMatch(html, /ExternalCollaborationMenuBlade/);
  assert.match(html, /assets\/external-collaboration\.png/);
  for (const [, attributes] of html.matchAll(/<img\s+([^>]+)>/g)) {
    assert.match(attributes, /\balt="[^"]+"/);
    assert.match(attributes, /\bwidth="\d+"/);
    assert.match(attributes, /\bheight="\d+"/);
  }
  const userSettings = html.split('<table class="settings-table">')[1].split("</table>")[0];
  assert.equal([...userSettings.matchAll(/<tr><td>/g)].length, 8);
  assert.match(html, /Registering user is added[\s\S]*?setting-value">None/);
  assert.match(html, /SPF, DKIM &amp; DMARC/);
  assert.match(html, /Authenticator phone sign-in[\s\S]*?not phishing-resistant/);
  assert.match(html, /Entra ID P2/);
  assert.doesNotMatch(html, /rollout-note|not a one-click deployment/);
  assert.match(html, /authentication context/);
  assert.doesNotMatch(html, /C:\\|OneDrive - ALSO|localhost|TODO|href=""/);
  assert.equal([...html.matchAll(/class="package-card"/g)].length, 8);
  assert.equal([...html.matchAll(/class="package-card" href="downloads\/[^"]+" download/g)].length, 7);
  assert.doesNotMatch(html, /The supplied ALSO Fundamentals exports, packaged by task/);
  assert.match(html, /tenant-bound onboarding profile/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  assert.match(stylesheet, /@media print/);
});

function browser() {
  const events = {};
  const attributes = new Map();
  const links = ["overview", "identity", "endpoints", "collaboration", "data", "copilot-preparation", "packages"].map((id) => ({
    hash: `#${id}`,
    setAttribute: (name, value) => attributes.set(`${id}:${name}`, value),
    removeAttribute: (name) => attributes.delete(`${id}:${name}`),
  }));
  const chapters = Object.fromEntries(links.map((link, index) => [link.hash, {
    top: index * 1000,
    getBoundingClientRect() { return { top: this.top }; },
  }]));
  const references = [{ open: false }, { open: true }];
  const window = {
    addEventListener(name, callback) { events[name] = callback; },
    requestAnimationFrame(callback) { callback(); },
  };
  const document = {
    querySelector(selector) {
      if (selector === ".chapter-nav") return { getBoundingClientRect: () => ({ bottom: 130 }) };
      return chapters[selector];
    },
    querySelectorAll(selector) { return selector === ".chapter-nav a" ? links : references; },
  };
  runInNewContext(script, { document, window });
  return { events, attributes, chapters, references,  };
}

test("active chapter follows scroll and print restores expanded reference states", () => {
  const page = browser();
  assert.equal(page.attributes.get("overview:aria-current"), "location");
  page.chapters["#identity"].top = 150;
  page.events.scroll();
  assert.equal(page.attributes.get("identity:aria-current"), "location");
  assert.equal(page.attributes.has("overview:aria-current"), false);
  page.chapters["#endpoints"].top = 150;
  page.events.resize();
  assert.equal(page.attributes.get("endpoints:aria-current"), "location");
  page.events.beforeprint();
  assert.deepEqual(page.references.map((reference) => reference.open), [true, true]);
  page.events.afterprint();
  assert.deepEqual(page.references.map((reference) => reference.open), [false, true]);
});

function zipEntries(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  assert.ok(end >= 0, "Missing ZIP end-of-directory record");
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = new Map();
  for (let index = 0; index < count; index += 1) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    assert.ok(!entries.has(name), `Duplicate ZIP entry: ${name}`);
    assert.ok(!name.includes("\\") && !name.startsWith("/") && !name.split("/").includes(".."));
    assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50);
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    assert.ok(method === 0 || method === 8, `Unsupported compression: ${method}`);
    const content = method === 8 ? inflateRawSync(compressed) : compressed;
    assert.equal(content.length, uncompressedSize);
    entries.set(name, content);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

test("seven downloadable archives preserve the 109 included source exports recorded in the manifest", async () => {
  const manifest = JSON.parse(await readFile(new URL("downloads/manifest.json", site), "utf8"));
  const expected = {
    "conditional-access": 50, "app-protection": 2, "device-compliance": 27,
    "defender-onboarding": 10, "defender-security": 7, "device-security": 3, "browser-protection": 10,
  };
  assert.equal(manifest.packages.length, 7);
  assert.equal(manifest.packages.reduce((sum, item) => sum + item.fileCount, 0), 109);
  const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
  for (const item of manifest.packages) {
    assert.equal(item.fileCount, expected[item.id]);
    assert.equal(item.files.length, item.fileCount);
    assert.ok(html.includes(`href="downloads/${item.archive}" download`));
    const bytes = await readFile(new URL(`downloads/${item.archive}`, site));
    assert.equal(bytes.length, item.bytes);
    assert.equal(sha256(bytes), item.sha256);
    const entries = zipEntries(bytes);
    assert.equal(entries.size, item.fileCount);
    let disabledPolicies = 0;
    for (const entry of item.files) {
      const content = entries.get(entry.path);
      assert.ok(content, `Missing archive entry: ${entry.path}`);
      assert.equal(content.length, entry.bytes);
      assert.equal(sha256(content), entry.sha256);
      const json = JSON.parse(content.toString(content[0] === 255 ? "utf16le" : "utf8").replace(/^\uFEFF/, ""));
      if (item.id === "conditional-access" && entry.path.startsWith("ConditionalAccess/")) {
        assert.equal(json.state, "disabled");
        if (entry.path.includes("CA201")) {
          assert.deepEqual(json.conditions.userRiskLevels, ["high"]);
          assert.deepEqual(json.grantControls.builtInControls, ["block"]);
        }
        if (entry.path.includes("CA210")) {
          assert.deepEqual(json.conditions.signInRiskLevels, ["high"]);
          assert.deepEqual(json.grantControls.builtInControls, ["block"]);
        }
        disabledPolicies += 1;
      }
    }
    if (item.id === "conditional-access") {
      assert.equal(disabledPolicies, 22);
      const table = html.split('<table class="policy-table">')[1].split("</table>")[0];
      const listed = [...table.matchAll(/<code>(CA\d+)<\/code>/g)].map((match) => match[1]);
      const packaged = item.files.filter((file) => file.path.startsWith("ConditionalAccess/"))
        .map((file) => file.path.match(/-(CA\d+)-/)[1]);
      assert.deepEqual([...listed].sort(), packaged.sort());
      assert.equal(listed.length, new Set(listed).size);
      const tiers = [...table.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].map((match) => match[1]);
      assert.equal(tiers.length, 2);
      for (const [index, prefix] of ["BP-", "E5-"].entries()) {
        const tierPolicies = [...tiers[index].matchAll(/<code>(CA\d+)<\/code>/g)].map((match) => match[1]);
        const tierExports = item.files.filter((file) => file.path.startsWith(`ConditionalAccess/${prefix}`))
          .map((file) => file.path.match(/-(CA\d+)-/)[1]);
        assert.deepEqual(tierPolicies, tierExports.sort());
      }
      assert.ok(!packaged.includes("CA101"));
      assert.ok(item.files.some((file) => file.path === "MigrationTable.json"));
      assert.equal(item.files.filter((file) => file.path.startsWith("Groups/")).length, 26);
      const contextBytes = entries.get("AuthenticationContext/Tier 0 Admins.json");
      assert.ok(contextBytes, "Missing Tier 0 Admins authentication context");
      const context = JSON.parse(contextBytes.toString(contextBytes[0] === 255 ? "utf16le" : "utf8").replace(/^\uFEFF/, ""));
      assert.equal(context.id, "c1");
      assert.equal(context.displayName, "Tier 0 Admins");
      const roleActivation = item.files.find((file) => file.path.startsWith("ConditionalAccess/") && file.path.includes("CA106"));
      const policyBytes = entries.get(roleActivation.path);
      const policy = JSON.parse(policyBytes.toString(policyBytes[0] === 255 ? "utf16le" : "utf8").replace(/^\uFEFF/, ""));
      assert.ok(policy.conditions.applications.includeAuthenticationContextClassReferences.includes(context.id));
    }
    if (item.id === "defender-security") {
      assert.equal(item.sourceFolder, "defender security settings");
      assert.ok(item.files.every((file) => !file.path.includes("LAPS")));
    }
    if (item.id === "device-security") {
      assert.equal(item.sourceFolder, "device security settings");
      const laps = item.files.filter((file) => file.path.startsWith("SettingsCatalog/") && file.path.includes("LAPS"));
      assert.equal(laps.length, 2);
      assert.ok(laps.some((file) => file.path.includes("24H2")));
      assert.ok(laps.some((file) => file.path.includes("v3.1")));
      assert.equal(item.files.filter((file) => file.path.startsWith("SettingsCatalog/") && file.path.includes("BitLocker")).length, 1);
      assert.match(item.title, /BitLocker and LAPS/);
      const step = html.split('<article class="step" id="local-admin">')[1].split("</article>")[0];
      assert.match(step, /href="downloads\/device-security.zip" download/);
      assert.doesNotMatch(step, /href="downloads\/defender-security.zip"/);
      assert.match(step, /Windows 11 24H2\+/);
    }
  }
});
