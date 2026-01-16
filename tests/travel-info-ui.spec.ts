import { test, expect } from '@playwright/test';

test('Travel Info Page UI Verification', async ({ page }) => {
  // Navigate to page
  await page.goto('http://localhost:3000/travel-info');

  // Verify Search Button exists and has correct text
  const searchButton = page.getByRole('button', { name: '検索する' });
  await expect(searchButton).toBeVisible();

  // Verify background icons are NOT present
  // The removed icons were in containers with specific classes.
  // We check that these containers are no longer attached to the DOM.

  // Top right passport icon container
  const bgPassport = page.locator('div.absolute.top-20.right-10.opacity-5');
  await expect(bgPassport).not.toBeAttached();

  // Bottom left globe icon container
  const bgGlobe = page.locator('div.absolute.bottom-40.left-10.opacity-5');
  await expect(bgGlobe).not.toBeAttached();

  // Floating plane icon container (top left)
  // Note: tailwind classes with brackets need escaping in CSS selectors or just match partial
  // The class was: absolute top-0 left-[10%] sm:left-[20%] text-primary/40 hidden sm:block
  // We can look for the text-primary/40 which is unique to that element in that section
  const bgPlane = page.locator('div.text-primary\\/40.hidden.sm\\:block');
  await expect(bgPlane).not.toBeAttached();

  // Floating stamp icon container (top right)
  // Class was: absolute top-10 right-[15%] text-stone-400 hidden sm:block
  // We look for text-stone-400 which is relatively unique in that context or combination
  const bgStamp = page.locator('div.text-stone-400.hidden.sm\\:block.absolute.top-10');
  await expect(bgStamp).not.toBeAttached();

  // Verify functional flow
  // 1. Fill destination
  await page.getByLabel('目的地を決める').fill('Tokyo');

  // 2. Click Search
  await searchButton.click();

  // 3. Verify navigation
  // It should navigate to /travel-info/Tokyo?categories=...
  // We wait for URL to contain Tokyo
  await expect(page).toHaveURL(/\/travel-info\/Tokyo/);
});
