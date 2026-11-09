import { expect, test } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

test.describe('attendance', () => {
  test('an employee checks in and out once; HR corrects the record with a reason', async ({ page }) => {
    await signIn(page, users.staff);
    await expectDashboard(page);
    await page.getByRole('navigation', { name: 'ເມນູຫຼັກ' }).getByRole('link', { name: 'ການເຂົ້າວຽກ' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ການເຂົ້າວຽກ' })).toBeVisible();
    await expect(page.getByText('ຍັງບໍ່ລົງເວລາ')).toBeVisible();
    await expect(page.getByRole('timer', { name: 'ເວລາປັດຈຸບັນ (ເວລາວຽງຈັນ)' })).toHaveText(/^\d{2}:\d{2}:\d{2}$/);

    await page.getByRole('button', { name: 'ລົງເວລາເຂົ້າວຽກ' }).click();
    await expect(page.getByText(/^ລົງເວລາເຂົ້າວຽກແລ້ວ ເວລາ \d{2}:\d{2}$/)).toBeVisible();
    await expect(page.getByText(/^ເຂົ້າວຽກ \d{2}:\d{2}/)).toBeVisible();
    await page.getByRole('button', { name: 'ລົງເວລາອອກວຽກ' }).click();
    await expect(page.getByText('ທ່ານລົງເວລາຄົບແລ້ວສຳລັບມື້ນີ້.')).toBeVisible();
    await expect(page.getByRole('button', { name: /ລົງເວລາ(ເຂົ້າ|ອອກ)ວຽກ/ })).toHaveCount(0);
    // This week's list shows today's record.
    await expect(page.getByRole('heading', { name: 'ອາທິດນີ້' })).toBeVisible();

    // HR finds it in the records and corrects it.
    await page.context().clearCookies();
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.goto('/lo/attendance?view=records');
    await page.getByRole('searchbox', { name: 'ພະນັກງານ' }).fill('E2E-STAFF');
    const row = page.getByRole('table', { name: 'ບັນທຶກການເຂົ້າວຽກ' }).getByRole('row').filter({ hasText: 'ບຸນມີ ທົດສອບ' });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: /ແກ້ໄຂບັນທຶກຂອງ ບຸນມີ ທົດສອບ/ }).click();
    const dialog = page.getByRole('dialog', { name: 'ແກ້ໄຂບັນທຶກການເຂົ້າວຽກ' });
    await dialog.getByLabel(/^ເວລາເຂົ້າ/).fill('08:00');
    await dialog.getByLabel(/^ເວລາອອກ/).fill('17:00');
    await dialog.getByRole('button', { name: 'ບັນທຶກການແກ້ໄຂ' }).click();
    await expect(dialog.getByText('ກະລຸນາບອກເຫດຜົນ (ຢ່າງໜ້ອຍ 3 ຕົວ)')).toBeVisible();
    await dialog.getByRole('textbox', { name: 'ເຫດຜົນຂອງການແກ້ໄຂ' }).fill('ລືມລົງເວລາ, ຫົວໜ້າຢືນຢັນ');
    await dialog.getByRole('button', { name: 'ບັນທຶກການແກ້ໄຂ' }).click();
    await expect(page.getByText('ແກ້ໄຂບັນທຶກແລ້ວ')).toBeVisible();
    await expect(row.getByText('ແກ້ໄຂແລ້ວ')).toBeVisible();
    await expect(row.getByRole('cell', { name: '08:00', exact: true })).toBeVisible();
    await expect(row.getByRole('cell', { name: '8:00', exact: true })).toBeVisible(); // 9 h minus the 60-minute break
  });
});
