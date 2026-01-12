export function extractDuration(dates: string): number {
  const match = dates.match(/(\d+)日間/);
  return match ? parseInt(match[1]) : 0;
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
