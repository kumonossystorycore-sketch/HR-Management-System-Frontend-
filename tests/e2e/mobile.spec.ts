import { expect, test } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

test('on a phone the menu opens as a drawer and closes after choosing a page', async ({ page }) => {
  await signIn(page, users.hr);
  await expectDashboard(page);
  await expect(page.getByRole('navigation', { name: 'ເມນູຫຼັກ' })).toBeHidden();
  await page.getByRole('button', { name: 'ເປີດເມນູ' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('navigation', { name: 'ເມນູຫຼັກ' })).toBeVisible();
  await drawer.getByRole('link', { name: 'ການລາພັກ' }).click();
  await expect(page).toHaveURL(/\/lo\/leave$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Nothing overflows sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
