import { expect, test } from '@playwright/test';

test('home loads and shows validated book title', async ({ page }) => {
  await page.goto('/#/');
  await expect(
    page.getByRole('main').getByText('Infor M3 Analytics Administration Guide 11.2.1', {
      exact: true,
    }),
  ).toBeVisible({ timeout: 30_000 });
});
