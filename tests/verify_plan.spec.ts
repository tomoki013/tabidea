
import { test, expect } from '@playwright/test';

test('verify plan page shows request summary', async ({ page }) => {
    // Encoded string generated from previous step
    const q = "N4IgbiBcCMA0IEsB2VQBMogEwAYsBYBaHInaQaQZBIhgGZBT00GTUkeAFygG0QAJBAZ2YHsATgE8mIAGL9+GALrwAxpnn8ArgAcANgFMxAI0x8AhkjSHBGeGsyCtGwwA8tFkIMxp+AWy18EilhEgQMQ8AjgBpZABrQ0iVQgArBBA5EAALEKg4RDQMGHgAM1ZAgDl+AAJBFR5U5ABzEABfeBseVGzMZm9WeDQ+TDDhfgExXsVAgEEygHd+Ey1BfJUNMuZBBDUV8oGh-hHDYVbINnRMlkxxwTWwQw0xQ3ZQIpBoHEgcHDvzy4QwHR7MADCqS08kiZWQjRkDRSNnyhzYUIaQA";

    await page.goto(`http://localhost:3000/plan?q=${q}`);

    // Wait for the page to load
    await expect(page.getByText('旅行プラン結果')).toBeVisible();

    // Check for Request Summary elements
    await expect(page.getByText('Your Request')).toBeVisible();

    // Check specific parts of the request summary to avoid ambiguity
    // Destination in Summary
    const summaryCard = page.locator('.col-span-2', { hasText: 'Destination' }).first();
    // Or just look for the text inside the summary container if possible, but simpler is to use `first()` or stricter locators

    // We can scope to the request summary container if we had a test id or unique class.
    // The component has "Your Request" text.
    const requestSummary = page.locator('div').filter({ hasText: 'Your Request' }).last();
    // "Your Request" is in the h3 inside the div.

    // Let's rely on text being visible somewhere on the page, but use .first() if needed or more specific text.
    await expect(page.getByText('カップル')).toBeVisible(); // Couple
    await expect(page.getByText('普通 / ゆったり')).toBeVisible(); // Standard / Relaxed
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.getByText('Food')).toBeVisible();
    await expect(page.getByText('Kinkaku-ji')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: '/home/jules/verification/verification.png', fullPage: true });
});
