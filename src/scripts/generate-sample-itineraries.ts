/**
 * サンプルプラン用の旅程を生成するスクリプト
 *
 * 使用方法:
 * npx tsx src/scripts/generate-sample-itineraries.ts <sample-id>
 * npx tsx src/scripts/generate-sample-itineraries.ts all
 */

import * as path from "path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { generateItinerary } from "../lib/itinerary-generator";
import { samplePlans } from "../lib/sample-plans";
import { Itinerary, UserInput } from "../lib/types";
import * as fs from "fs";

async function generateItineraryForSample(
  sampleId: string
): Promise<Itinerary | null> {
  const sample = samplePlans.find((p) => p.id === sampleId);
  if (!sample) {
    console.error(`Sample plan not found: ${sampleId}`);
    return null;
  }

  console.log(`\n=== Generating itinerary for: ${sample.title} ===`);

  const input: UserInput = {
    ...sample.input,
    hasMustVisitPlaces: sample.input.hasMustVisitPlaces ?? false,
    mustVisitPlaces: sample.input.mustVisitPlaces ?? [],
  };

  const result = await generateItinerary(input, {
    topK: 1,
    fetchHeroImage: true,
    verbose: true,
  });

  if (result.success && result.itinerary) {
    console.log(`✅ Itinerary generated successfully!`);
    console.log(`   - ${result.itinerary.days.length} days`);
    console.log(
      `   - ${result.itinerary.days.reduce(
        (sum, d) => sum + d.activities.length,
        0
      )} total activities`
    );
    return result.itinerary;
  } else {
    console.error(`❌ Failed to generate itinerary: ${result.error}`);
    return null;
  }
}

async function main() {
  const sampleId = process.argv[2];

  if (!sampleId) {
    console.log("Available sample IDs:");
    samplePlans.forEach((p) => console.log(`  - ${p.id}: ${p.title}`));
    console.log(
      "\nUsage: npx tsx src/scripts/generate-sample-itineraries.ts <sample-id>"
    );
    console.log(
      "       npx tsx src/scripts/generate-sample-itineraries.ts all"
    );
    return;
  }

  const outputDir = path.join(__dirname, "../data/itineraries");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (sampleId === "all") {
    // Generate for all samples
    for (const sample of samplePlans) {
      const outputPath = path.join(outputDir, `${sample.id}.json`);
      if (fs.existsSync(outputPath)) {
        console.log(`Skipping existing itinerary for: ${sample.title} (${sample.id})`);
        continue;
      }

      const itinerary = await generateItineraryForSample(sample.id);
      if (itinerary) {
        fs.writeFileSync(
          outputPath,
          JSON.stringify(itinerary, null, 2),
          "utf-8"
        );
        console.log(`✅ Saved to: ${outputPath}`);
      }

      // Add delay to avoid rate limiting
      console.log("Waiting 3 seconds before next generation...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } else {
    // Generate for single sample
    const itinerary = await generateItineraryForSample(sampleId);

    if (itinerary) {
      // Output JSON to console
      console.log("\n=== Generated Itinerary JSON ===");
      console.log(JSON.stringify(itinerary, null, 2));

      // Save to file
      const outputPath = path.join(outputDir, `${sampleId}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(itinerary, null, 2), "utf-8");
      console.log(`\n✅ Saved to: ${outputPath}`);
    }
  }
}

main().catch(console.error);
