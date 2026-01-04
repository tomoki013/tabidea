import { test, expect } from '@playwright/test';

test('verify request summary toggle and content', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');

  // Choose "Undecided" (決まっていない) to proceed to Step 1
  // We use user-visible text matching
  await page.getByRole('button', { name: /決まっていない/ }).click();

  // Wait for transition (the app has a delay)
  await page.waitForTimeout(2000);

  // We should be on Step 1. Check for the summary toggle button.
  // The button has title="選択内容を確認"
  const summaryButton = page.locator('button[title="選択内容を確認"]');
  await expect(summaryButton).toBeVisible();

  // Click to open summary
  await summaryButton.click();

  // Check if summary overlay appears
  const overlay = page.locator('text=現在のリクエスト');
  await expect(overlay).toBeVisible();

  // Check default content inside the summary
  // Destination logic: "おまかせ" should be visible if destination is undecided and no vibe entered
  await expect(page.locator('text=おまかせ')).toBeVisible();
  await expect(page.locator('text=ひとり')).toBeVisible(); // Companions default

  // Take screenshot of the open summary
  await page.screenshot({ path: '/home/jules/verification/summary_overlay.png' });

  // Close the overlay
  await page.getByRole('button', { name: '閉じる' }).click();
  await expect(overlay).not.toBeVisible();
});
