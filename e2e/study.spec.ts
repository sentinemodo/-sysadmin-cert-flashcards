import { expect, test } from '@playwright/test';

test('study: reveal and grade one card', async ({ page }) => {
  await page.goto('/#/study');
  await expect(page.getByRole('heading', { name: 'Study — pick chapter' })).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('a[href*="ch01-about"]').first().click();
  await expect(page.getByRole('button', { name: 'Reveal answer' })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await page.getByRole('button', { name: 'Good' }).click();
  await expect(
    page.getByRole('heading', { name: 'Chapter 1: About this guide' }),
  ).toBeVisible({ timeout: 15_000 });
});
