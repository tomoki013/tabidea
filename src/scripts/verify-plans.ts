
import { samplePlans } from "../lib/sample-plans";

console.log(`Total sample plans: ${samplePlans.length}`);

// Check for duplicates
const ids = new Set<string>();
const duplicates: string[] = [];

samplePlans.forEach(p => {
  if (ids.has(p.id)) {
    duplicates.push(p.id);
  }
  ids.add(p.id);
});

if (duplicates.length > 0) {
  console.error("Duplicate IDs found:", duplicates);
  process.exit(1);
} else {
  console.log("No duplicate IDs found.");
}

// Check new plans are overseas
const fanPlans = samplePlans.filter(p => p.id.startsWith("fan-"));
const overseasPlans = samplePlans.filter(p => p.input.region === "overseas");

console.log(`Total Fan plans: ${fanPlans.length}`);
console.log(`Total Overseas plans: ${overseasPlans.length}`);

if (samplePlans.length < 350) {
    console.error("Total plans count looks too low!");
    process.exit(1);
}

console.log("Verification passed!");
