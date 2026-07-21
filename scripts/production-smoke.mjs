#!/usr/bin/env node

const frontendUrl = requiredUrl("FRONTEND_URL");
const apiUrl = requiredUrl("API_URL");

const checks = [
  { name: "frontend home", url: frontendUrl },
  { name: "frontend browse", url: new URL("/browse", frontendUrl).toString() },
  { name: "frontend login", url: new URL("/login", frontendUrl).toString() },
  { name: "api health", url: new URL("/health", apiUrl).toString() },
  { name: "api ready", url: new URL("/ready", apiUrl).toString() },
  { name: "api contract", url: new URL("/openapi.json", apiUrl).toString() },
];

let failures = 0;

for (const check of checks) {
  try {
    const response = await fetch(check.url, {
      method: "GET",
      headers: { "X-Request-ID": `smoke-${Date.now()}` },
    });

    if (!response.ok) {
      failures += 1;
      console.error(`[FAIL] ${check.name}: ${response.status} ${response.statusText}`);
      continue;
    }

    const requestId = response.headers.get("x-request-id");
    console.log(`[OK] ${check.name}${requestId ? ` requestId=${requestId}` : ""}`);
  } catch (error) {
    failures += 1;
    console.error(
      `[FAIL] ${check.name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (failures > 0) {
  console.error(`Production smoke failed: ${failures} check(s) failed.`);
  process.exit(1);
}

console.log("Production smoke passed.");

function requiredUrl(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required.`);
    process.exit(1);
  }

  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && process.env.ALLOW_INSECURE_SMOKE !== "true") {
    console.error(`${name} must use HTTPS. Set ALLOW_INSECURE_SMOKE=true only for local testing.`);
    process.exit(1);
  }

  return parsed.toString().replace(/\/$/, "");
}
