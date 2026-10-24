import fs from "fs";
import path from "path";

// Load .env.local safely without external packages
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const exists = fs.existsSync(envLocalPath);

console.log("=================================================");
console.log("SAFARIX PHASE 22C: ENVIRONMENT CONFIGURATION AUDIT");
console.log("=================================================");
console.log(`.env.local file exists: ${exists}`);

if (!exists) {
  console.error("FATAL: .env.local not found!");
  process.exit(1);
}

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const envConfig = parseEnv(envLocalPath);

// List of inspected variables with validation rules
const specs = [
  {
    key: "NEXT_PUBLIC_APP_URL",
    requiredInProd: true,
    validate: (v) => Boolean(v && (v.startsWith("http://") || v.startsWith("https://"))),
  },
  {
    key: "DATABASE_URL",
    requiredInProd: true,
    validate: (v) => Boolean(v && (v.startsWith("postgres://") || v.startsWith("postgresql://"))),
  },
  {
    key: "DIRECT_URL",
    requiredInProd: false,
    validate: (v) => Boolean(!v || v.startsWith("postgres://") || v.startsWith("postgresql://")),
    notApplicableReason: "Optional direct connection for pooled migrations; not required at runtime",
  },
  {
    key: "SESSION_SECRET",
    requiredInProd: false, // either SESSION_SECRET or NEXTAUTH_SECRET is required
    validate: (v) => Boolean(v && v.length >= 32),
  },
  {
    key: "NEXTAUTH_SECRET",
    requiredInProd: false,
    validate: (v) => Boolean(v && v.length >= 32),
  },
  {
    key: "GOOGLE_GENERATIVE_AI_API_KEY",
    requiredInProd: true,
    validate: (v) => Boolean(v && v.length > 10),
  },
  {
    key: "TRAVEL_DATA_MODE",
    requiredInProd: true,
    validate: (v) => v === "real",
  },
  {
    key: "GOOGLE_PLACES_API_KEY",
    requiredInProd: true,
    validate: (v) => Boolean(v && v.length > 10),
  },
  {
    key: "DUFFEL_ACCESS_TOKEN",
    requiredInProd: true,
    validate: (v) => Boolean(v && (v.startsWith("duffel_test_") || v.startsWith("duffel_live_"))),
    getInfo: (v) => {
      if (!v) return "missing";
      if (v.startsWith("duffel_test_")) return "token_type: duffel_test_ (Sandbox / Test Mode)";
      if (v.startsWith("duffel_live_")) return "token_type: duffel_live_ (Live Production)";
      return "token_type: unknown_prefix";
    },
  },
  {
    key: "DUFFEL_BASE_URL",
    requiredInProd: false,
    validate: (v) => Boolean(!v || v.startsWith("https://")),
    getInfo: (v) => v || "default (https://api.duffel.com)",
  },
  {
    key: "OSRM_BASE_URL",
    requiredInProd: false,
    validate: (v) => Boolean(!v || v.startsWith("http://") || v.startsWith("https://")),
    getInfo: (v) => v || "default (https://router.project-osrm.org)",
  },
  {
    key: "PEXELS_API_KEY",
    requiredInProd: false,
    validate: () => true,
    getInfo: (v) => (v ? "configured" : "intentionally_deferred (no_key)"),
  },
  {
    key: "UPSTASH_REDIS_REST_URL",
    requiredInProd: true,
    validate: (v) => Boolean(v && v.startsWith("https://")),
  },
  {
    key: "UPSTASH_REDIS_REST_TOKEN",
    requiredInProd: true,
    validate: (v) => Boolean(v && v.length > 10),
  },
  {
    key: "INTERNAL_API_SECRET",
    requiredInProd: true,
    validate: (v) => Boolean(v && v.length >= 16),
  },
];

console.log("\n--- Variable Configuration Summary (NO SECRETS PRINTED) ---");
const results = {};

for (const spec of specs) {
  const val = envConfig[spec.key];
  const isPresent = Boolean(val && val.trim().length > 0);
  let status = "MISSING";
  let note = "";

  if (spec.key === "DIRECT_URL" && !isPresent) {
    status = "NOT_APPLICABLE";
    note = spec.notApplicableReason;
  } else if (spec.key === "PEXELS_API_KEY" && !isPresent) {
    status = "NOT_APPLICABLE";
    note = "Deferred per Phase 22C instructions (optional photography)";
  } else if (isPresent) {
    const isValid = spec.validate(val);
    status = isValid ? "CONFIGURED" : "INVALID";
    if (spec.getInfo) {
      note = spec.getInfo(val);
    }
  }

  // Handle SESSION_SECRET vs NEXTAUTH_SECRET duality
  if (spec.key === "SESSION_SECRET" && !isPresent) {
    if (envConfig["NEXTAUTH_SECRET"] && envConfig["NEXTAUTH_SECRET"].length >= 32) {
      status = "NOT_APPLICABLE";
      note = "Satisfied by NEXTAUTH_SECRET";
    }
  }
  if (spec.key === "NEXTAUTH_SECRET" && !isPresent) {
    if (envConfig["SESSION_SECRET"] && envConfig["SESSION_SECRET"].length >= 32) {
      status = "NOT_APPLICABLE";
      note = "Satisfied by SESSION_SECRET";
    }
  }

  results[spec.key] = { status, note };
  console.log(`  ${spec.key.padEnd(30)}: [${status}] ${note ? `(${note})` : ""}`);
}

console.log("\n--- Git Secret Leak Check ---");
const gitignoreContent = fs.readFileSync(path.resolve(process.cwd(), ".gitignore"), "utf8");
const isExcluded = gitignoreContent.includes(".env.local");
console.log(`  .env.local in .gitignore: ${isExcluded ? "YES (EXCLUDED)" : "NO (LEAK RISK)"}`);

console.log("=================================================");
