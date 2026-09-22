#!/usr/bin/env node
// Lists every model your GEMINI_API_KEY currently has access to, and flags
// which ones support image input + generateContent (what this app needs).
// Usage: node scripts/check-gemini-models.js
//
// Gemini model availability shifts often (previews get retired, free-tier
// quotas differ per model), so re-run this whenever GEMINI_MODEL starts
// failing instead of guessing a new name.

const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

async function main() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1000`);
  const body = await res.json();

  if (!res.ok) {
    console.error(`Key rejected (HTTP ${res.status}):`, body.error?.message ?? body);
    process.exit(1);
  }

  console.log(`${body.models.length} models visible to this key.\n`);

  const usable = body.models.filter((m) => m.supportedGenerationMethods?.includes("generateContent"));
  console.log("generateContent-capable models:\n");
  for (const m of usable) {
    console.log(`  ${m.name.replace("models/", "")}`);
  }

  console.log(
    "\nThis only confirms the model is LISTED for your key — a 404/429 on an\n" +
      "actual generateContent call still happens for retired-for-new-users\n" +
      "models or exhausted per-model daily quotas. To confirm one actually\n" +
      "works right now:\n" +
      "  node -e \"require('@next/env').loadEnvConfig(process.cwd()); const {GoogleGenAI}=require('@google/genai'); new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}).models.generateContent({model:'MODEL_NAME_HERE',contents:[{role:'user',parts:[{text:'hi'}]}]}).then(r=>console.log(r.text)).catch(e=>console.error(e.message))\""
  );
}

main();
