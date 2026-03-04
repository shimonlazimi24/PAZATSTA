#!/usr/bin/env npx tsx
/**
 * Post-deploy health check. Validates production serves static assets correctly.
 * Run: APP_URL=https://pazatsta.vercel.app npx tsx scripts/healthcheck-prod.ts
 * Or: npm run healthcheck:prod
 *
 * Exits 0 on success, 1 on failure.
 */
function getAppUrl(): string | null {
  const url = process.env.APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (url && url.startsWith("http")) return url.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel !== "undefined") return `https://${vercel}`;
  return null;
}
const APP_URL = getAppUrl();

interface Check {
  name: string;
  pass: boolean;
  message: string;
}

const checks: Check[] = [];

async function fetchWithDetails(
  url: string
): Promise<{ status: number; contentType: string; ok: boolean }> {
  const res = await fetch(url, { redirect: "follow" });
  const contentType = res.headers.get("content-type") ?? "";
  return {
    status: res.status,
    contentType: contentType.split(";")[0].trim(),
    ok: res.ok,
  };
}

async function main() {
  if (!APP_URL || !APP_URL.startsWith("http")) {
    console.error("❌ Set APP_URL (e.g. APP_URL=https://pazatsta.vercel.app npm run healthcheck:prod)");
    process.exit(1);
  }

  const base = APP_URL;
  console.log(`\n🔍 Health check: ${base}\n`);

  // 1. /api/health
  try {
    const res = await fetch(`${base}/api/health`);
    const ct = res.headers.get("content-type") ?? "";
    const isJson = ct.includes("application/json");
    let body: { ok?: boolean; version?: string } = {};
    if (isJson) {
      try {
        body = (await res.json()) as { ok?: boolean; version?: string };
      } catch {
        body = {};
      }
    }
    const healthOk = res.ok && isJson && body?.ok === true;
    checks.push({
      name: "/api/health",
      pass: healthOk,
      message: healthOk
        ? `200, ok=true, version=${body.version ?? "?"}`
        : !isJson
          ? `status=${res.status}, got ${ct || "non-JSON"} (deploy may not include /api/health yet)`
          : `status=${res.status}, body.ok=${body?.ok}`,
    });
  } catch (e) {
    checks.push({
      name: "/api/health",
      pass: false,
      message: (e as Error).message,
    });
  }

  // 2. /login returns 200
  try {
    const { status } = await fetchWithDetails(`${base}/login`);
    checks.push({
      name: "GET /login",
      pass: status === 200,
      message: `status=${status}`,
    });
  } catch (e) {
    checks.push({
      name: "GET /login",
      pass: false,
      message: (e as Error).message,
    });
  }

  // 3. /verify returns 200 (or redirects)
  try {
    const res = await fetch(`${base}/verify?email=test%40example.com&role=student`, {
      redirect: "manual",
    });
    const ok = res.status === 200 || (res.status >= 300 && res.status < 400);
    checks.push({
      name: "GET /verify",
      pass: ok,
      message: `status=${res.status}`,
    });
  } catch (e) {
    checks.push({
      name: "GET /verify",
      pass: false,
      message: (e as Error).message,
    });
  }

  // 4. Parse /login HTML for asset URLs, then verify each
  try {
    const html = await fetch(`${base}/login`).then((r) => r.text());
    const cssUrls = Array.from(
      html.matchAll(/href="([^"]*\/_next\/static\/css\/[^"]+\.css)"/g),
      (m) => m[1]
    );
    const jsUrls = Array.from(
      html.matchAll(/src="([^"]*\/_next\/static\/chunks\/[^"]+\.js)"/g),
      (m) => m[1]
    );

    const resolve = (url: string) =>
      url.startsWith("http") ? url : `${base}${url.startsWith("/") ? "" : "/"}${url}`;

    let assetsOk = true;
    for (const url of [...cssUrls, ...jsUrls].slice(0, 5)) {
      const full = resolve(url);
      const { status, contentType } = await fetchWithDetails(full);
      const expectedType = url.includes(".css") ? "text/css" : "application/javascript";
      const correctType = contentType.includes("text/css") || contentType.includes("javascript");
      const notHtml = !contentType.includes("text/html");
      const pass = status === 200 && correctType && notHtml;
      if (!pass) assetsOk = false;
      checks.push({
        name: `Asset ${url.split("/").pop()?.slice(0, 30) ?? url}`,
        pass,
        message: pass
          ? `200, ${contentType}`
          : `status=${status}, contentType=${contentType} (expected ${expectedType}, NOT text/html)`,
      });
    }

    if (cssUrls.length === 0 && jsUrls.length === 0) {
      checks.push({
        name: "Assets in /login HTML",
        pass: false,
        message: "No /_next/static/* URLs found in HTML",
      });
    }
  } catch (e) {
    checks.push({
      name: "Parse /login assets",
      pass: false,
      message: (e as Error).message,
    });
  }

  // Summary
  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);

  for (const c of checks) {
    console.log(c.pass ? `  ✅ ${c.name}: ${c.message}` : `  ❌ ${c.name}: ${c.message}`);
  }

  console.log(`\n${passed}/${checks.length} checks passed\n`);

  if (failed.length > 0) {
    console.error("Failed checks:");
    failed.forEach((c) => console.error(`  - ${c.name}: ${c.message}`));
    process.exit(1);
  }

  console.log("✅ All health checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
