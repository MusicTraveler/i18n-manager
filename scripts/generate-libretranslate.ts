#!/usr/bin/env tsx

import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "dotenv";
import { generate } from "openapi-typescript-codegen";

// Load environment variables
config();

const LIBRETRANSLATE_URL =
  process.env.LIBRETRANSLATE_URL ||
  process.env.NEXT_PUBLIC_LIBRETRANSLATE_URL ||
  "https://libre-translate-production.up.railway.app";

const OUTPUT_DIR = path.join(process.cwd(), "src/lib/libretranslate");

// Clean up existing directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}

// Generate the client
generate({
  input: `${LIBRETRANSLATE_URL}/spec`,
  output: OUTPUT_DIR,
  httpClient: "fetch",
  clientName: "LibreTranslateClient",
  useOptions: true,
  useUnionTypes: true,
  exportCore: true,
  exportSchemas: true,
  exportServices: true,
  exportModels: true,
}).then(() => {
  console.log("✅ LibreTranslate client generated successfully!");
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}).catch((error) => {
  console.error("❌ Failed to generate LibreTranslate client:", error);
  process.exit(1);
});

