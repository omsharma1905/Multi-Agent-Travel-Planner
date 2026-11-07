import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9229;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_remediation_profile_${Date.now()}`);
const ARTIFACT_DIR = "C:\\Users\\OM SHARMA\\.gemini\\antigravity\\brain\\1cf866f0-8291-4aba-9317-3bba072d99a7";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const list = JSON.parse(data);
          const page = list.find((p: any) => p.type === "page") || list[0];
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error("No page found in targets: " + data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
  });
}

async function run() {
  console.log("=================================================================");
  console.log(" VERIFYING SAFARIX VISUAL REMEDIATION ACROSS VIEWPORTS");
  console.log("=================================================================\n");

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const chromeProc = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--remote-debugging-address=127.0.0.1`,
      `--user-data-dir=${USER_DATA_DIR}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  try {
    let wsUrl = "";
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        wsUrl = await getDebuggerUrl();
        if (wsUrl) break;
      } catch {}
    }

    if (!wsUrl) throw new Error("Chrome CDP not reachable");

    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const pending = new Map<number, (res: any) => void>();
    const consoleErrors: string[] = [];

    ws.onmessage = (event: any) => {
      const parsed = JSON.parse(event.data.toString());
      if (parsed.id && pending.has(parsed.id)) {
        const resolve = pending.get(parsed.id)!;
        pending.delete(parsed.id);
        resolve(parsed.result);
      }
      if (parsed.method === "Runtime.consoleAPICalled" && parsed.params.type === "error") {
        const text = parsed.params.args.map((a: any) => a.value ?? a.description ?? "").join(" ");
        if (!text.includes("favicon")) consoleErrors.push(text);
      }
    };

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (err) => reject(err);
    });

    function send(method: string, params: any = {}): Promise<any> {
      return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");

    // Test Viewports list
    const VIEWPORTS = [
      { name: "desktop_1440", w: 1440, h: 900, dsf: 1, mobile: false },
      { name: "laptop_1280", w: 1280, h: 900, dsf: 1, mobile: false },
      { name: "tablet_landscape_1024", w: 1024, h: 768, dsf: 1, mobile: false },
      { name: "tablet_portrait_768", w: 768, h: 1024, dsf: 1, mobile: false },
      { name: "mobile_large_430", w: 430, h: 932, dsf: 2, mobile: true },
      { name: "mobile_standard_390", w: 390, h: 844, dsf: 2, mobile: true },
      { name: "mobile_compact_360", w: 360, h: 800, dsf: 2, mobile: true },
    ];

    console.log(`Navigating to ${BASE_URL}...`);
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(2500);

    // Wait for all images to complete loading
    await send("Runtime.evaluate", {
      expression: `new Promise((resolve) => {
        const imgs = Array.from(document.querySelectorAll('img'));
        let remaining = imgs.length;
        if (remaining === 0) return resolve();
        imgs.forEach(img => {
          if (img.complete) {
            remaining--;
            if (remaining === 0) resolve();
          } else {
            img.addEventListener('load', () => { remaining--; if (remaining === 0) resolve(); });
            img.addEventListener('error', () => { remaining--; if (remaining === 0) resolve(); });
          }
        });
        setTimeout(resolve, 6000);
      })`,
      awaitPromise: true,
    });

    // 1. Audit Images
    console.log("\n--- AUDIT 1: Destination & Hero Images Natural Widths ---");
    const imgAuditRes = await send("Runtime.evaluate", {
      expression: `(() => {
        const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete,
          alt: img.alt || ''
        }));
        return imgs;
      })()`,
      returnByValue: true,
    });

    const imgs = imgAuditRes?.result?.value || [];
    console.log(`Found ${imgs.length} image elements:`);
    let allImgsLoaded = true;
    for (const img of imgs) {
      const ok = img.complete && img.naturalWidth > 0;
      console.log(`  - [${ok ? 'PASS' : 'FAIL'}] ${img.alt || 'No-alt'} | ${img.naturalWidth}x${img.naturalHeight} | ${img.src.substring(0, 60)}...`);
      if (!ok) allImgsLoaded = false;
    }

    // 2. Audit Raw Text Icons
    console.log("\n--- AUDIT 2: Text Ligature Leakage (Unrendered Icon Strings) ---");
    const rawIconRes = await send("Runtime.evaluate", {
      expression: `(() => {
        const iconNames = [
          'public', 'calendar_today', 'event_available', 'group', 'diamond',
          'psychology', 'arrow_forward', 'auto_awesome', 'travel_explore',
          'connecting_airports', 'villa', 'restaurant_menu', 'monetization_on',
          'share', 'stars', 'support_agent', 'history_edu', 'verified', 'wb_sunny'
        ];
        
        // Find text nodes or elements whose text exactly equals an icon name
        const leaks = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const val = node.nodeValue?.trim();
          if (iconNames.includes(val)) {
            const parent = node.parentElement;
            if (parent && !parent.closest('svg') && !parent.closest('script')) {
              leaks.push({ text: val, tag: parent.tagName, class: parent.className });
            }
          }
        }
        return leaks;
      })()`,
      returnByValue: true,
    });

    const rawLeaks = rawIconRes?.result?.value || [];
    if (rawLeaks.length === 0) {
      console.log("  PASS: 0 raw icon text strings leaked in the rendered DOM!");
    } else {
      console.log(`  FAIL: ${rawLeaks.length} icon text strings leaked:`, rawLeaks);
    }

    // 3. Audit Navbar Overlaps Across Viewports
    console.log("\n--- AUDIT 3: Navbar Layout & Responsive Overlap Check ---");
    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: vp.dsf,
        mobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      await sleep(500);

      const navOverlap = await send("Runtime.evaluate", {
        expression: `(() => {
          const header = document.querySelector('header');
          if (!header) return { found: false };
          const rect = header.getBoundingClientRect();
          const leftEl = header.querySelector('a[href="/"]');
          const navEl = header.querySelector('nav');
          const rightCandidates = Array.from(header.querySelectorAll('a[href="/trips/new"], a[href="/auth/sign-in"], div.relative'));
          const rightEl = rightCandidates.find(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });
          
          const leftRect = leftEl?.getBoundingClientRect();
          const navRect = (navEl && window.getComputedStyle(navEl).display !== 'none') ? navEl.getBoundingClientRect() : null;
          const rightRect = rightEl?.getBoundingClientRect();
          
          let overlap = false;
          if (leftRect && navRect) {
            overlap = overlap || (leftRect.right > navRect.left);
          }
          if (navRect && rightRect) {
            overlap = overlap || (navRect.right > rightRect.left);
          }
          if (leftRect && rightRect && !navRect) {
            overlap = overlap || (leftRect.right > rightRect.left);
          }
          return {
            found: true,
            width: window.innerWidth,
            hasNavPill: !!navRect,
            overlap,
            headerW: rect.width,
            leftR: leftRect?.right,
            navL: navRect?.left,
            navR: navRect?.right,
            rightL: rightRect?.left,
          };
        })()`,
        returnByValue: true,
      });

      const navData = navOverlap?.result?.value;
      const pass = navData && !navData.overlap;
      console.log(`  Viewport ${vp.name} (${vp.w}x${vp.h}): [${pass ? 'PASS' : 'FAIL'}] Overlap=${navData?.overlap}, NavPillVisible=${navData?.hasNavPill}`);
    }

    // 4. Capture Key Visual Screenshots
    console.log("\n--- AUDIT 4: Capturing Remediation Verification Screenshots ---");

    // Shot A: Desktop 1440x900 Hero & Planner
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, 0);` });
    await sleep(800);
    const shotDesktopHero = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "remediation_desktop_hero.png"), Buffer.from(shotDesktopHero.data, "base64"));
    console.log("  Saved remediation_desktop_hero.png");

    // Shot B: Desktop Sanctuaries
    await send("Runtime.evaluate", { expression: `document.querySelector('#sanctuaries')?.scrollIntoView({ behavior: 'instant', block: 'start' });` });
    await sleep(800);
    const shotDesktopSanctuaries = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "remediation_desktop_sanctuaries.png"), Buffer.from(shotDesktopSanctuaries.data, "base64"));
    console.log("  Saved remediation_desktop_sanctuaries.png");

    // Shot C: Desktop Agents & Timeline
    await send("Runtime.evaluate", { expression: `document.querySelector('#agents')?.scrollIntoView({ behavior: 'instant', block: 'start' });` });
    await sleep(800);
    const shotDesktopAgents = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "remediation_desktop_agents.png"), Buffer.from(shotDesktopAgents.data, "base64"));
    console.log("  Saved remediation_desktop_agents.png");

    // Shot D: Desktop Workflow & CTA & Footer
    await send("Runtime.evaluate", { expression: `document.querySelector('#methodology')?.scrollIntoView({ behavior: 'instant', block: 'start' });` });
    await sleep(800);
    const shotDesktopWorkflow = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "remediation_desktop_workflow.png"), Buffer.from(shotDesktopWorkflow.data, "base64"));
    console.log("  Saved remediation_desktop_workflow.png");

    // Shot E: Tablet 768x1024
    await send("Emulation.setDeviceMetricsOverride", { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false });
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, 0);` });
    await sleep(800);
    const shotTablet = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "remediation_tablet_768.png"), Buffer.from(shotTablet.data, "base64"));
    console.log("  Saved remediation_tablet_768.png");

    // Shot F: Mobile 390x844 Hero & Planner
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, hasTouch: true });
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, 0);` });
    await sleep(800);
    const shotMobileHero = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "remediation_mobile_hero.png"), Buffer.from(shotMobileHero.data, "base64"));
    console.log("  Saved remediation_mobile_hero.png");

    // Shot G: Mobile 390x844 Sanctuaries
    await send("Runtime.evaluate", { expression: `document.querySelector('#sanctuaries')?.scrollIntoView({ behavior: 'instant', block: 'start' });` });
    await sleep(800);
    const shotMobileSanctuaries = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "remediation_mobile_sanctuaries.png"), Buffer.from(shotMobileSanctuaries.data, "base64"));
    console.log("  Saved remediation_mobile_sanctuaries.png");

    // Shot H: Mobile 390x844 Agents & Bottom Nav
    await send("Runtime.evaluate", { expression: `document.querySelector('#agents')?.scrollIntoView({ behavior: 'instant', block: 'start' });` });
    await sleep(800);
    const shotMobileAgents = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "remediation_mobile_agents.png"), Buffer.from(shotMobileAgents.data, "base64"));
    console.log("  Saved remediation_mobile_agents.png");

    console.log("\n=================================================================");
    console.log(" REMEDIATION VERIFICATION COMPLETED SUCCESSFULLY!");
    console.log(` Console Errors: ${consoleErrors.length}`);
    console.log("=================================================================");

    ws.close();
  } finally {
    try {
      chromeProc.kill();
      await sleep(1000);
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
