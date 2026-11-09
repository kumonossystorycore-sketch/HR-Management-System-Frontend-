import { expect, test } from '@playwright/test';
import { expectDashboard, PASSWORD, signIn, users } from './helpers';

test.describe('sign-in', () => {
  test('a signed-out visitor is sent to sign in and comes back afterwards', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/lo\/login\?next=%2Fdashboard/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'lo');
    await expect(page.getByRole('heading', { level: 1, name: 'ເຂົ້າສູ່ລະບົບ' })).toBeVisible();
  });

  test('empty fields and a malformed e-mail are caught in the form', async ({ page }) => {
    await page.goto('/lo/login');
    await page.getByRole('button', { name: 'ເຂົ້າສູ່ລະບົບ' }).click();
    await expect(page.getByText('ກະລຸນາໃສ່ ອີເມວ')).toBeVisible();
    await expect(page.getByText('ກະລຸນາໃສ່ ລະຫັດຜ່ານ')).toBeVisible();
    await page.getByRole('textbox', { name: 'ອີເມວ', exact: true }).fill('not-an-email');
    await page.getByRole('button', { name: 'ເຂົ້າສູ່ລະບົບ' }).click();
    await expect(page.getByText('ກະລຸນາໃສ່ອີເມວໃຫ້ຖືກຮູບແບບ')).toBeVisible();
  });

  test('a wrong password shows the API message in Lao and clears the field', async ({ page }) => {
    await signIn(page, users.staff, 'Wrong-password-1');
    await expect(page.getByRole('alert').filter({ hasText: 'ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ.' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'ລະຫັດຜ່ານ', exact: true })).toHaveValue('');
  });

  test('HR signs in, stays signed in after a reload, and no token is kept in browser storage', async ({ page, context }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await expect(page.getByRole('navigation', { name: 'ເມນູຫຼັກ' }).getByRole('link', { name: 'ເງິນເດືອນ' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'ພະນັກງານທີ່ເຮັດວຽກຢູ່' })).toBeVisible();

    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(storage).not.toMatch(/eyJ/); // no JWT anywhere
    const cookie = (await context.cookies()).find((c) => c.name === 'hrms_rt');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Strict');
    expect(cookie?.path).toBe('/api/v1/auth');

    await page.reload();
    await expectDashboard(page);
  });

  test('signing out ends the session; the dashboard then asks to sign in again', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.getByRole('button', { name: /ນາລີ ທົດສອບ/ }).click();
    await page.getByRole('menuitem', { name: 'ອອກຈາກລະບົບ' }).click();
    await expect(page).toHaveURL(/\/lo\/login/);
    await page.goto('/lo/dashboard');
    await expect(page).toHaveURL(/\/lo\/login\?next=%2Fdashboard/);
  });

  test('a temporary password must be changed before anything else', async ({ page }) => {
    await signIn(page, users.temp);
    await expect(page).toHaveURL(/\/lo\/change-password$/);
    await page.goto('/lo/dashboard');
    await expect(page).toHaveURL(/\/lo\/change-password$/);

    await page.getByRole('textbox', { name: 'ລະຫັດຜ່ານຊົ່ວຄາວ', exact: true }).fill(PASSWORD);
    await page.getByRole('textbox', { name: 'ລະຫັດຜ່ານໃໝ່', exact: true }).fill('short');
    await page.getByRole('textbox', { name: 'ຢືນຢັນລະຫັດຜ່ານໃໝ່', exact: true }).fill('different1');
    await page.getByRole('button', { name: 'ປ່ຽນລະຫັດຜ່ານ' }).click();
    await expect(page.getByText('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 8 ຕົວ')).toBeVisible();
    await expect(page.getByText('ລະຫັດຜ່ານທັງສອງບໍ່ກົງກັນ')).toBeVisible();

    await page.getByRole('textbox', { name: 'ລະຫັດຜ່ານໃໝ່', exact: true }).fill('My-own-password-1');
    await page.getByRole('textbox', { name: 'ຢືນຢັນລະຫັດຜ່ານໃໝ່', exact: true }).fill('My-own-password-1');
    await page.getByRole('button', { name: 'ປ່ຽນລະຫັດຜ່ານ' }).click();
    await expectDashboard(page);
  });
});

test.describe('password reset', () => {
  test('asking for a link gives the same answer for any address', async ({ page }) => {
    await page.goto('/lo/login');
    await page.getByRole('link', { name: 'ລືມລະຫັດຜ່ານ?' }).click();
    await expect(page).toHaveURL(/\/lo\/forgot-password$/);
    await page.getByRole('textbox', { name: 'ອີເມວ', exact: true }).fill('nobody@e2e.test');
    await page.getByRole('button', { name: 'ສົ່ງລິ້ງ' }).click();
    await expect(page.getByRole('heading', { name: 'ກວດເບິ່ງອີເມວຂອງທ່ານ' })).toBeVisible();
    await expect(page.getByText('nobody@e2e.test')).toBeVisible();
  });

  test('a reset page without its token explains what to do', async ({ page }) => {
    await page.goto('/lo/reset-password');
    await expect(page.getByRole('alert').filter({ hasText: 'ລິ້ງນີ້ບໍ່ຄົບຖ້ວນ' })).toBeVisible();
    await page.goto('/lo/reset-password?token=not-a-real-token-value-123');
    await page.getByRole('textbox', { name: 'ລະຫັດຜ່ານໃໝ່', exact: true }).fill('Brand-new-pass1');
    await page.getByRole('textbox', { name: 'ຢືນຢັນລະຫັດຜ່ານໃໝ່', exact: true }).fill('Brand-new-pass1');
    await page.getByRole('button', { name: 'ບັນທຶກລະຫັດຜ່ານໃໝ່' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'ລິ້ງນີ້ໃຊ້ບໍ່ໄດ້ ຫຼື ໝົດອາຍຸແລ້ວ' })).toBeVisible();
  });
});
