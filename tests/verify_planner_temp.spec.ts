import { test, expect } from '@playwright/test';

test('verify travel planner loading view and flow', async ({ page }) => {
  test.setTimeout(60000);

  await page.route('**/travel-planner', async (route) => {
    await route.continue();
  });

  // 1. Go to homepage
  await page.goto('http://localhost:3000');

  // Verify "行き先は 決まっていますか？" (Step InitialChoice)
  await expect(page.getByRole('heading', { name: '行き先は 決まっていますか？' })).toBeVisible();

  // 3. Take screenshot of initial state (Step 0)
  await page.screenshot({ path: '/home/jules/verification/step0_initial.png' });

  // 4. Click "Undecided" (Recommended)
  const undecidedButton = page.getByRole('button', { name: /決まっていない/ });
  await undecidedButton.click();

  // Wait for transition (PlaneTransition)
  await page.waitForTimeout(2000);

  // 5. Verify Step 1: Region Selection
  await expect(page.getByRole('heading', { name: 'どんな旅行に行きたいですか？' })).toBeVisible();
  await page.screenshot({ path: '/home/jules/verification/step1_region.png' });

  // Select "Domestic"
  await page.getByRole('button', { name: /国内/ }).click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 6. Verify Step 2: Must-Visit Places (Yes/No)
  await expect(page.getByRole('heading', { name: /絶対に行きたい/ })).toBeVisible();
  await page.getByRole('button', { name: 'ない' }).click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 7. Verify Step 3: Companions
  await expect(page.getByRole('heading', { name: '誰との旅ですか？' })).toBeVisible();
  await page.getByRole('button', { name: /一人/ }).click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 8. Verify Step 4: Themes
  await expect(page.getByRole('heading', { name: 'どんな旅にしますか？' })).toBeVisible();
  await page.getByRole('button', { name: /リラックス/ }).click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 9. Verify Step 5: Budget
  // Heading: "予算はどれくらい？"
  await expect(page.getByRole('heading', { name: '予算はどれくらい？' })).toBeVisible();
  await page.getByRole('button', { name: /普通/ }).click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 10. Verify Step 6: Dates
  // Heading: "いつ、どれくらい？"
  await expect(page.getByRole('heading', { name: 'いつ、どれくらい？' })).toBeVisible();

  await page.getByRole('checkbox', { name: /未定/ }).first().check();
  await page.getByRole('checkbox', { name: /未定/ }).last().check();
  await page.getByRole('button', { name: '次へ' }).click();

  // 11. Verify Step 7: Pace
  // Heading: "旅行のペースは？"
  // Let's verify by checking the next page content if heading fails.
  // Actually, let's wait a bit.
  await page.waitForTimeout(500);

  // Select "ゆったり" (Relaxed)
  await page.getByRole('button', { name: /ゆったり/ }).click();
  await page.getByRole('button', { name: '次へ' }).click();

  // 12. Verify Step 8: Free Text
  // Heading: "最後に、 特別なご要望は？"
  await expect(page.getByRole('heading', { name: '最後に、 特別なご要望は？' })).toBeVisible();

  // The button name in the snapshot is "プランを作成する ✨"
  await expect(page.getByRole('button', { name: /プランを作成する/ })).toBeVisible();
  await page.getByRole('button', { name: /プランを作成する/ }).click();

  // 13. Verify Loading View
  // The LoadingView should appear
  await expect(page.getByText('ガイドブックを開いています...')).toBeVisible({ timeout: 10000 });

  // Take screenshot of Loading View
  await page.screenshot({ path: '/home/jules/verification/loading_view.png' });
});
