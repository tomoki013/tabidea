/**
 * サンプルプラン用の旅程を生成するスクリプト（新生成フロー版）
 *
 * 使用方法:
 * npx tsx src/scripts/generate-sample-itineraries.ts <sample-id|all> [ja|en|all] [--force]
 *
 * 例:
 * npx tsx src/scripts/generate-sample-itineraries.ts all
 * npx tsx src/scripts/generate-sample-itineraries.ts all en
 * npx tsx src/scripts/generate-sample-itineraries.ts sapporo-otaru-family ja --force
 */

import * as path from "path";
import * as fs from "fs";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { samplePlans } from "../lib/sample-plans";
import { runComposePipeline } from "@/lib/services/itinerary/pipeline-orchestrator";
import type { Itinerary, UserInput } from "@/types";
import type { LanguageCode } from "@/lib/i18n/locales";

type GenerationLocale = LanguageCode | "all";

function resolveLocales(arg?: string): LanguageCode[] {
  if (!arg || arg === "all") return ["ja", "en"];
  if (arg === "ja" || arg === "en") return [arg];
  throw new Error(`Invalid locale argument: ${arg}. Expected "ja", "en", or "all".`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const target = args[0];

  let localeArg: GenerationLocale = "all";
  let force = false;

  for (const arg of args.slice(1)) {
    if (arg === "--force") {
      force = true;
      continue;
    }
    localeArg = arg as GenerationLocale;
  }

  return { target, localeArg, force };
}

function enableSampleApiKeysIfProvided() {
  const hasGoogleKey = Boolean(
    process.env.SAMPLE_GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
  const hasOpenAIKey = Boolean(
    process.env.SAMPLE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  );

  if (process.env.SAMPLE_GOOGLE_GENERATIVE_AI_API_KEY || process.env.SAMPLE_OPENAI_API_KEY) {
    process.env.USE_SAMPLE_AI_KEYS = "true";
    console.log("[sample-generation] Using sample-specific API key settings.");
  }

  // If only OpenAI key is available, force itinerary provider to OpenAI.
  if (!hasGoogleKey && hasOpenAIKey) {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_PROVIDER_ITINERARY = "openai";
    process.env.AI_DEFAULT_PROVIDER = "openai";
    console.log("[sample-generation] Gemini key not found. Forced provider: openai");
  }
}

function ensureOutputDir(locale: LanguageCode): string {
  const outputDir = path.join(process.cwd(), "src/data/itineraries", locale);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

async function generateForSample(
  sampleId: string,
  locale: LanguageCode
): Promise<Itinerary | null> {
  const sample = samplePlans.find((plan) => plan.id === sampleId);
  if (!sample) {
    console.error(`[sample-generation] Sample plan not found: ${sampleId}`);
    return null;
  }

  const input: UserInput = {
    ...sample.input,
    hasMustVisitPlaces: sample.input.hasMustVisitPlaces ?? false,
    mustVisitPlaces: sample.input.mustVisitPlaces ?? [],
  };

  console.log(`\n=== Generating [${locale}] itinerary for: ${sample.title} (${sample.id}) ===`);
  const result = await runComposePipeline(input, undefined, (event) => {
    if (event.type === "progress") {
      console.log(`  [${event.step}] ${event.message}`);
      return;
    }

    console.log(`  [${event.step}] day ${event.day} ready`);
  });

  if (!result.success || !result.itinerary) {
    console.error(`[sample-generation] Failed: ${sample.id} (${locale}) -> ${result.message}`);
    return null;
  }

  const itinerary = result.itinerary;
  const activityCount = itinerary.days.reduce((sum, day) => sum + day.activities.length, 0);
  console.log(`[sample-generation] Success: ${sample.id} (${locale})`);
  console.log(`  - ${itinerary.days.length} days`);
  console.log(`  - ${activityCount} total activities`);
  console.log(`  - model: ${itinerary.modelInfo?.modelName ?? "unknown"}`);

  return itinerary;
}

async function generateAndSave(sampleId: string, locale: LanguageCode, force: boolean): Promise<boolean> {
  const outputDir = ensureOutputDir(locale);
  const outputPath = path.join(outputDir, `${sampleId}.json`);

  if (!force && fs.existsSync(outputPath)) {
    console.log(`[sample-generation] Skip existing: ${sampleId} (${locale})`);
    return true;
  }

  const itinerary = await generateForSample(sampleId, locale);
  if (!itinerary) return false;

  fs.writeFileSync(outputPath, JSON.stringify(itinerary, null, 2), "utf-8");
  console.log(`[sample-generation] Saved: ${outputPath}`);
  return true;
}

async function main() {
  const { target, localeArg, force } = parseArgs();
  if (!target) {
    console.log("Available sample IDs:");
    samplePlans.forEach((plan) => console.log(`  - ${plan.id}: ${plan.title}`));
    console.log("\nUsage: npx tsx src/scripts/generate-sample-itineraries.ts <sample-id|all> [ja|en|all] [--force]");
    return;
  }

  const locales = resolveLocales(localeArg);
  enableSampleApiKeysIfProvided();

  const sampleIds = target === "all" ? samplePlans.map((plan) => plan.id) : [target];
  let successCount = 0;
  let failureCount = 0;

  for (const sampleId of sampleIds) {
    for (const locale of locales) {
      const ok = await generateAndSave(sampleId, locale, force);
      if (ok) {
        successCount += 1;
      } else {
        failureCount += 1;
      }
      console.log("[sample-generation] Waiting 3 seconds to avoid rate limiting...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Success: ${successCount}`);
  console.log(`Failed : ${failureCount}`);

  if (failureCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[sample-generation] Fatal error:", error);
  process.exitCode = 1;
});
