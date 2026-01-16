
import { test, expect } from '@playwright/test';

test('Verify Travel Planner Refactor', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes timeout for AI generation

  // 1. Go to homepage
  await page.goto('http://localhost:3000/ai-travel-planner/');

  // 2. Select initial choice: "決まっていない" (Undecided) -> Step 1
  await page.getByText('決まっていない').click();

  // 3. Step 1: Select "Domestic"
  await page.getByText('国内').click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 4. Step 2: Companions -> Solo
  await page.getByText('一人旅').click(); // Solo
  await page.getByRole('button', { name: '次へ' }).click();

  // 5. Step 3: Themes -> Select "Relaxing" (リラックス)
  await page.getByText('リラックス').click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 6. Step 4: Budget -> Select "Standard" (普通)
  await page.getByText('普通').click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 7. Step 5: Dates -> Check "Flexible" (時期は決まっていない)
  await page.getByText('時期は決まっていない').click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 8. Step 6: Pace -> Select "Relaxed" (ゆったり)
  await page.getByText('ゆったり').click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 9. Step 7: Free Text -> Skip (Just click "Generate Plan")
  await page.getByRole('button', { name: 'プランを作成する' }).click();

  // 10. Wait for Plan Generation
  // It should redirect to /plan?q=...
  // We wait for URL to contain '/plan'
  // 60s timeout for backend call
  await page.waitForURL(/\/plan\?q=.+/, { timeout: 90000 });

  // 11. Verify Result Page
  // Check for "Copy URL" button (share buttons)
  // The button has aria-label "Copy Link"
  await expect(page.getByLabel('Copy Link')).toBeVisible();

  // Check for X icon (link with label 'Share on X')
  await expect(page.getByLabel('Share on X')).toBeVisible();

  // Check title
  await expect(page.getByText('共有された旅行プラン')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'verification_result.png', fullPage: true });
});
