import { expect, test } from '@playwright/test';

async function capture(page, sex: 'M' | 'F', snapshotName: string) {
  await page.goto(`/visual/combined?sex=${sex}`);
  await page.waitForLoadState('networkidle');

  const root = page.getByTestId('combined-visual-root');
  await expect(root).toBeVisible();
  await expect(root).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    scale: 'css',
  });
}

test('boys combined chart visual regression', async ({ page }) => {
  await capture(page, 'M', 'boys-combined-chart.png');
});

test('girls combined chart visual regression', async ({ page }) => {
  await capture(page, 'F', 'girls-combined-chart.png');
});
