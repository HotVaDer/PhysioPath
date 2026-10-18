// Lets plain Node run the app's server modules from scripts (node --import ./scripts/app-loader.mjs …):
// resolves the "@/…" path alias and extensionless .ts imports the way Next.js does, and replaces
// "server-only" (a Next.js marker with no package installed) with an empty module.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EMPTY_MODULE = "data:text/javascript,export {}";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: EMPTY_MODULE, shortCircuit: true };
    let target = null;
    if (specifier.startsWith("@/")) target = path.join(ROOT, specifier.slice(2));
    else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith("file:"))
      target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (target && !path.extname(target)) {
      for (const ending of [".ts", ".tsx", "/index.ts"])
        if (existsSync(target + ending)) return { url: pathToFileURL(target + ending).href, shortCircuit: true };
    }
    if (target && specifier.startsWith("@/")) return { url: pathToFileURL(target).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
