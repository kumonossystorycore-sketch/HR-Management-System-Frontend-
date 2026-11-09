import { expect, test, type Page } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

/** The number shown on a stat card of the dashboard, found by its label. */
const cardNumber = async (page: Page, label: string) => {
  const text = await page.getByRole('region', { name: label, exact: true }).locator('p.text-stat').innerText();
  return Number(text.replace(/[^\d]/g, ''));
};

test.describe('integration: dashboard, charts and reports on real data', () => {
  test('HR sees the four charts, and the chart tables agree with the cards', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);

    // Every chart is either drawn from data or says there is none yet (the fixture may have no attendance or hires).
    for (const name of ['ພາບລວມການມາວຽກ', 'ສະຖານະພະນັກງານ', 'ພະນັກງານຕາມພະແນກ', 'ສະຖິຕິການຮັບສະໝັກລາຍເດືອນ']) {
      const card = page.getByRole('region', { name, exact: true });
      await expect(card).toBeVisible();
      await expect(card.locator('.recharts-surface').or(card.getByText('ຍັງບໍ່ມີຂໍ້ມູນ')).first()).toBeVisible();
    }
    await expect(page.getByRole('region', { name: 'ສະຖານະພະນັກງານ', exact: true }).locator('.recharts-surface')).toBeVisible();
    // Two series or more always come with a legend.
    const recruitment = page.getByRole('region', { name: 'ສະຖິຕິການຮັບສະໝັກລາຍເດືອນ', exact: true });
    if (await recruitment.locator('.recharts-surface').count()) await expect(recruitment.locator('.recharts-legend-wrapper')).toContainText('ຮັບເຂົ້າເຮັດວຽກ');

    // The same numbers as a table; head count by status must equal the cards (one source: the database).
    const status = page.getByRole('region', { name: 'ສະຖານະພະນັກງານ' });
    await status.getByRole('button', { name: 'ສະແດງເປັນຕາຕະລາງ' }).click();
    const table = status.getByRole('table', { name: 'ສະຖານະພະນັກງານ' });
    const count = async (label: string) => Number((await table.getByRole('row').filter({ hasText: label }).getByRole('cell').innerText()).replace(/[^\d]/g, ''));
    const active = (await count('ເຮັດວຽກຢູ່')) + (await count('ທົດລອງງານ'));
    const inactive = (await count('ລາອອກ')) + (await count('ເລີກຈ້າງ'));
    expect(active).toBeGreaterThan(0);
    expect(await cardNumber(page, 'ພະນັກງານທີ່ເຮັດວຽກຢູ່')).toBe(active);
    expect(await cardNumber(page, 'ພະນັກງານທີ່ອອກແລ້ວ')).toBe(inactive);
    expect(await cardNumber(page, 'ພະນັກງານທັງໝົດ')).toBe(active + inactive);
    await status.getByRole('button', { name: 'ສະແດງເປັນແຜນພູມ' }).click();
    await expect(status.locator('.recharts-surface')).toBeVisible();

    // Departments card and the department table agree too.
    const departments = page.getByRole('region', { name: 'ພະນັກງານຕາມພະແນກ' });
    await departments.getByRole('button', { name: 'ສະແດງເປັນຕາຕະລາງ' }).click();
    const rows = await departments.getByRole('table').getByRole('row').count();
    expect(await cardNumber(page, 'ພະແນກ')).toBeGreaterThanOrEqual(rows - 1);
  });

  test('an employee sees only personal cards, no company charts', async ({ page }) => {
    await signIn(page, users.staff);
    await expectDashboard(page);
    await expect(page.getByRole('heading', { name: 'ຂອງທ່ານ', exact: true })).toBeVisible();
    await expect(page.locator('.recharts-surface')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'ສະຖານະພະນັກງານ' })).toHaveCount(0);
  });

  test('a report can be printed: controls are hidden on paper, the chosen filters are written out', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed += 1;
      };
    });
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.goto('/lo/reports');
    const print = page.getByRole('button', { name: 'ພິມລາຍງານ' });
    await expect(print).toBeEnabled();
    await print.click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);

    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('tablist')).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'ເມນູຫຼັກ' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'ພິມລາຍງານ' })).toBeHidden();
    await expect(page.getByText(/^ພິມເມື່ອ \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'ທຸກພະແນກ' })).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
    await expect(page.getByRole('tablist')).toBeVisible();
  });
});
