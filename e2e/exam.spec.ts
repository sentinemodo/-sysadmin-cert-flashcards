import { expect, test } from '@playwright/test';

test('exam: complete short chapter exam', async ({ page }) => {
  await page.goto('/#/exam');
  await expect(page.getByRole('heading', { name: 'Exam — pick chapter' })).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('a[href*="ch01-about"]').first().click();

  for (let i = 0; i < 2; i += 1) {
    await expect(page.getByRole('button', { name: 'Reveal answer' })).toBeVisible({
      timeout: 15_000,
    });
    const revealHeight = await page
      .getByRole('button', { name: 'Reveal answer' })
      .evaluate((el) => (el as any).getBoundingClientRect().height);
    expect(revealHeight).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'Reveal answer' }).click();
    await page.getByRole('button', { name: 'Good' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Exam result' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/2 \/ 2 correct/)).toBeVisible();
});
