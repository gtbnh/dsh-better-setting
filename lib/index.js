/**
 * Better Setting — host half.
 *
 * The plugin is UI-only: every feature lives in `lib/client.js`, which the
 * Client runner loads from the `dsh.client` manifest section. This half exists
 * so the bundle patch has a mountable plugin row (the Loader imports the
 * package entry).
 *
 * The file also carries a tiny diagnostic sink: while the plugin is being
 * debugged, every mount attempt appends one line to
 * `%TEMP%\dsh-better-setting-host.log`. It never throws, so it cannot stop the
 * plugin from loading.
 */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LOG_PATH = join(tmpdir(), "dsh-better-setting-host.log");

function log(line) {
  try {
    appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`);
  } catch (_error) {
    // Diagnostics are best effort; never break the plugin for a log write.
  }
}

log("lib/index.js evaluated");

/** Loader-visible plugin name. */
export const name = "better-setting";

/** Called once the Loader has mounted the plugin row. */
export function apply(ctx) {
  log("apply() called");
  try {
    const injected = ctx && ctx.fiber && Array.isArray(ctx.fiber.inject) ? ctx.fiber.inject : null;
    log(`apply() inject=${injected ? JSON.stringify(injected) : "n/a"}`);
  } catch (error) {
    log(`apply() diagnostic failed: ${String((error && error.message) || error)}`);
  }
}
