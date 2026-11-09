import { expect, test } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

test.describe('app shell', () => {
  test('the menu follows the role: an employee sees payslips, not payroll, users or the employee list', async ({ page }) => {
    await signIn(page, users.staff);
    await expectDashboard(page);
    const nav = page.getByRole('navigation', { name: 'ເມນູຫຼັກ' });
    await expect(nav.getByRole('link', { name: 'ສະລິບເງິນເດືອນ' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'ເງິນເດືອນ', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'ຜູ້ໃຊ້ ແລະ ສິດ' })).toHaveCount(0);
    // Lists that would show only their own record are left out too.
    await expect(nav.getByRole('link', { name: 'ພະນັກງານ', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'ການລາພັກ' })).toBeVisible();
    // Typing the address of a hidden module still shows no data.
    await page.goto('/lo/users');
    await expect(page.getByRole('heading', { name: 'ທ່ານບໍ່ມີສິດເຂົ້າໜ້ານີ້' })).toBeVisible();
    // The employee dashboard shows only their own cards.
    await page.goto('/lo/dashboard');
    await expect(page.getByRole('heading', { name: 'ຂອງທ່ານ' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'ພະນັກງານປັດຈຸບັນ' })).toHaveCount(0);
  });

  test('switching to English changes the URL, the html lang and the saved preference', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.getByRole('button', { name: 'EN' }).click();
    await expectDashboard(page, 'en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Employees' })).toBeVisible();

    // The account remembers it: signing in from the Lao page lands in English.
    await page.getByRole('button', { name: /ນາລີ ທົດສອບ/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await signIn(page, users.hr);
    await expectDashboard(page, 'en');
    await page.getByRole('button', { name: 'ລາວ' }).click();
    await expectDashboard(page, 'lo');
  });

  test('every menu entry opens its own screen and marks itself as the current page', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    const nav = page.getByRole('navigation', { name: 'ເມນູຫຼັກ' });
    for (const name of ['ພະນັກງານ', 'ພະແນກ', 'ຕຳແໜ່ງ', 'ການຮັບສະໝັກ', 'ການເຂົ້າວຽກ', 'ການລາພັກ', 'ເງິນເດືອນ', 'ການປະເມີນຜົນ', 'ລາຍງານ', 'ຜູ້ໃຊ້ ແລະ ສິດ', 'ການຕັ້ງຄ່າ']) {
      await nav.getByRole('link', { name, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('my account shows my details and changes my password', async ({ page }) => {
    await signIn(page, users.staff);
    await expectDashboard(page);
    await page.getByRole('button', { name: /ບຸນມີ ທົດສອບ/ }).click();
    await page.getByRole('menuitem', { name: 'ບັນຊີຂອງຂ້ອຍ' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ບັນຊີຂອງຂ້ອຍ' })).toBeVisible();
    await expect(page.getByText('E2E-STAFF')).toBeVisible();
    await page.getByRole('textbox', { name: 'ລະຫັດຜ່ານປັດຈຸບັນ', exact: true }).fill('Wrong-current-1');
    await page.getByRole('textbox', { name: 'ລະຫັດຜ່ານໃໝ່', exact: true }).fill('Another-pass-12');
    await page.getByRole('textbox', { name: 'ຢືນຢັນລະຫັດຜ່ານໃໝ່', exact: true }).fill('Another-pass-12');
    await page.getByRole('button', { name: 'ປ່ຽນລະຫັດຜ່ານ' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ.' })).toBeVisible();
  });

  test('unknown addresses show a not-found page', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.goto('/lo/no-such-page');
    await expect(page.getByRole('heading', { name: 'ບໍ່ພົບໜ້ານີ້' })).toBeVisible();
    await page.goto('/lo/leave/no-such-page');
    await expect(page.getByRole('heading', { name: 'ບໍ່ພົບໜ້ານີ້' })).toBeVisible();
  });
});
