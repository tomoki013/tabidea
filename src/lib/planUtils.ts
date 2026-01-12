export function extractDuration(dates: string): number {
  // Support "X日間" format (e.g., "3日間")
  const daysMatch = dates.match(/(\d+)日間/);
  if (daysMatch) {
    return parseInt(daysMatch[1], 10);
  }

  // Support "X泊Y日" format (e.g., "2泊3日")
  const nightsDaysMatch = dates.match(/(\d+)泊(\d+)日/);
  if (nightsDaysMatch) {
    return parseInt(nightsDaysMatch[2], 10);
  }

  return 0;
}

export function splitDaysIntoChunks(totalDays: number): { start: number; end: number }[] {
  const chunks: { start: number; end: number }[] = [];
  let currentDay = 1;
  const CHUNK_SIZE = 2;

  while (currentDay <= totalDays) {
    const end = Math.min(currentDay + CHUNK_SIZE - 1, totalDays);
    chunks.push({ start: currentDay, end });
    currentDay = end + 1;
  }

  return chunks;
}
