
import { test, expect } from '@playwright/test';

test.describe('Travel Plan Result View', () => {
    test('verify plan page shows request summary with full input', async ({ page }) => {
        // Full input Q string
        const q = "N4IgbiBcCMA0IEsB2VQBMogEwAYsBYBaHInaQaQZBIhgGZBT00GTUkeAFygG0QAJBAZ2YHsATgE8mIAGL9+GALrwAxpnn8ArgAcANgFMxAI0x8AhkjSHBGeGsyCtGwwA8tFkIMxp+AWy18EilhEgQMQ8AjgBpZABrQ0iVQgArBBA5EAALEKg4RDQMGHgAM1ZAgDl+AAJBFR5U5ABzEABfeBseVGzMZm9WeDQ+TDDhfgExXsVAgEEygHd+Ey1BfJUNMuZBBDUV8oGh-hHDYVbINnRMlkxxwTWwQw0xQ3ZQIpBoHEgcHDvzy4QwHR7MADCqS08kiZWQjRkDRSNnyhzYUIaQA";

        await page.goto(`http://localhost:3000/plan?q=${q}`);

        // Wait for the page to load
        await expect(page.getByText('旅行プラン結果')).toBeVisible();

        // Verify Summary Header
        await expect(page.getByText('目的地・エリア')).toBeVisible();

        // Verify specific inputs are visible and translated
        await expect(page.getByText('パートナー・夫婦')).toBeVisible(); // Companions
        await expect(page.getByText('普通', { exact: true })).toBeVisible(); // Budget
        await expect(page.getByText('ゆったり (1日1-2箇所)')).toBeVisible(); // Pace
        await expect(page.getByText('History')).toBeVisible(); // Theme
        await expect(page.getByText('Food')).toBeVisible(); // Theme
    });

    test('verify plan page hides missing inputs', async ({ page }) => {
        // Partial input Q string (generated via script)
        // companions: any, budget: any, pace: any
        const q = "N4IgbiBcCMA0IEsB2VQBMogEwAYsBYBaHAZmOhHgBcoBtEACQQGcqB7AJwE8QBdeAMaYAhkh7wARiLGUQAB2niQHTAGlRzYQllUIkELIC2e2vxAALY1BzwEaDDHgAzGvpABfeBwCmzVIgcQKl8qQjtZNFY1LjZ2COYhfQBBAAIqDgQ5NLYU1Ri4+HNtN3g0YS4-SFMvbydK03d3IA";

        await page.goto(`http://localhost:3000/plan?q=${q}`);

        // Wait for page load
        await expect(page.getByText('旅行プラン結果')).toBeVisible();

        // Verify Destination is present (since we set it)
        await expect(page.getByText('Kyoto').first()).toBeVisible();
        await expect(page.getByText('History')).toBeVisible();

        // Verify "Any" fields are HIDDEN
        // The headers for these sections should not exist in the DOM

        // Companions (同行者) -> Label is "誰と行く？"
        await expect(page.getByText('誰と行く？')).not.toBeVisible();

        // Budget (予算) -> Label is "予算感"
        await expect(page.getByText('予算感')).not.toBeVisible();

        // Pace (ペース) -> Label is "旅行のペース"
        await expect(page.getByText('旅行のペース')).not.toBeVisible();
    });

    test('verify plan page translates "anywhere" region correctly', async ({ page }) => {
        // Generated Q string for undecided destination, region: 'anywhere'
        const q = "N4IgbiBcCMA0IEsB2VQBMogEwAYsFYBaHAZmOhHgBcoBtEAOQEMqBXAJwFMQBdeAY0z8A9qwAOAG27wARpgDOVJkjRN2GeGMxcJTAB6cNIdpmUBPAO4ALTl0ogqESCABKnXXuQBzAARgEMtIgALZOtHwgVqFQOPAIaBiQOAC+8FzyqIiJIcL8ANaE6awSVITx9miKmACyuXk+ACKcVfCVgs61+Y3Ngq1MZhmQ4WmcAGaD4cnJQA";

        await page.goto(`http://localhost:3000/plan?q=${q}`);

        // Wait for page load
        await expect(page.getByText('旅行プラン結果')).toBeVisible();

        // Verify "anywhere" is displayed as "どこでも"
        await expect(page.getByText('どこでも')).toBeVisible();

        // Verify "Relaxing vibe" is displayed
        await expect(page.getByText('Relaxing vibe')).toBeVisible();

        // Verify "anywhere" (English) is NOT visible
        await expect(page.getByText('anywhere')).not.toBeVisible();
    });
});
