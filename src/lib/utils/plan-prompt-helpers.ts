import type { FixedScheduleItem } from "@/types";

/**
 * Helper to generate fixed schedule prompt
 */
export function getFixedSchedulePrompt(schedule?: FixedScheduleItem[]): string {
  if (!schedule || schedule.length === 0) return "";

  return `
    === FIXED SCHEDULE (USER BOOKINGS) ===
    The user has the following fixed reservations. You MUST incorporate these into the itinerary at the specified times.
    ${schedule.map(item => `- [${item.type}] ${item.name} ${item.date ? `(Date: ${item.date})` : ''} ${item.time ? `(Time: ${item.time})` : ''} ${item.notes ? `Note: ${item.notes}` : ''}`).join('\n')}
    ======================================
  `;
}

/**
 * Helper to generate budget context string
 */
export function getBudgetContext(budget: string): string {
  if (!budget) return "Budget: Not specified";

  // Handle range format: "range:50000:100000"
  if (budget.startsWith("range:")) {
    const parts = budget.split(":");
    if (parts.length >= 3) {
      const min = parseInt(parts[1], 10);
      const max = parseInt(parts[2], 10);
      const minStr = (min / 10000).toFixed(0);
      const maxStr = (max / 10000).toFixed(0);
      return `
    Budget: ${minStr}万円 〜 ${maxStr}万円 (${min.toLocaleString()} JPY - ${max.toLocaleString()} JPY)
    (Please suggest hotels, restaurants, and activities that fit within this specific budget range per person for the entire trip.)
      `;
    }
  }

  return `
    Budget Level: ${budget}
    (Budget Guidance for AI:
     - If Destination is Domestic (Japan):
       - Saving: ~30,000 JPY total (Hostels, cheap eats)
       - Standard: ~50,000 JPY total (Business hotels, standard meals)
       - High: ~100,000 JPY total (Ryokan/Nice hotels, good dining)
       - Luxury: ~200,000+ JPY total
     - If Destination is Overseas:
       - Adjust scale accordingly. Standard usually implies 150,000-300,000 JPY depending on region (Asia vs Europe).
     - Please suggest hotels, restaurants, and activities that fit this financial scale.)
  `;
}
