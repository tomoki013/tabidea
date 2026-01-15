import * as fs from "fs";
import * as path from "path";
import { Itinerary } from "../lib/types";

const jsonPath = path.join(__dirname, "../data/sample-itineraries.json");
const outputDir = path.join(__dirname, "../data/itineraries");

async function main() {
  if (!fs.existsSync(jsonPath)) {
    console.error("Source file not found:", jsonPath);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Reading monolithic JSON...");
  const data: Record<string, Itinerary> = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8")
  );

  console.log(`Found ${Object.keys(data).length} itineraries.`);

  for (const [id, itinerary] of Object.entries(data)) {
    const outputPath = path.join(outputDir, `${id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(itinerary, null, 2), "utf-8");
    console.log(`Saved ${id}.json`);
  }

  console.log("Migration complete.");
}

main().catch(console.error);
