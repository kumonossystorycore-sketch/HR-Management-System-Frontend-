import { expect, test } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

test.describe('reports', () => {
  test('HR sees the headcount report and exports it to Excel', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.getByRole('navigation', { name: 'ເມນູຫຼັກ' }).getByRole('link', { name: 'ລາຍງານ' }).click();
    const table = page.getByRole('table', { name: 'ລາຍງານຈຳນວນພະນັກງານ' });
    await expect(table.getByRole('row').filter({ hasText: 'ທົດສອບ E2E' })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ສົ່ງອອກ Excel' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    await page.getByRole('tab', { name: 'ເງິນເດືອນ' }).click();
    await expect(page.getByRole('combobox', { name: 'ປີ' })).toBeVisible();
  });
});

test.describe('users, roles and settings (Super Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, users.admin);
    await expectDashboard(page);
  });

  test('create a user by invitation, then reset their password', async ({ page }) => {
    await page.goto('/lo/users');
    await page.getByRole('button', { name: 'ເພີ່ມຜູ້ໃຊ້' }).click();
    const dialog = page.getByRole('dialog', { name: 'ເພີ່ມຜູ້ໃຊ້' });
    await dialog.getByRole('textbox', { name: 'ອີເມວເຂົ້າລະບົບ' }).fill('new-user@e2e.test');
    await expect(dialog.getByRole('checkbox', { name: 'ພະນັກງານ' })).toBeChecked();
    await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ສ້າງຜູ້ໃຊ້ ແລະ ສົ່ງອີເມວເຊີນແລ້ວ')).toBeVisible();

    // Reset the new account (other tests sign in with the fixture accounts' passwords).
    await page.getByRole('searchbox', { name: 'ຄົ້ນຫາຜູ້ໃຊ້' }).fill('new-user@e2e.test');
    await page.getByRole('button', { name: 'ຕັ້ງລະຫັດຜ່ານໃໝ່ໃຫ້ new-user@e2e.test' }).click();
    const reset = page.getByRole('dialog', { name: 'ຕັ້ງລະຫັດຜ່ານໃໝ່ໃຫ້ new-user@e2e.test' });
    await expect(reset.getByRole('textbox', { name: 'ລະຫັດຜ່ານຊົ່ວຄາວ' })).toHaveValue(/^(?=.*[A-Za-z])(?=.*\d).{12}$/);
    await reset.getByRole('button', { name: 'ຕັ້ງລະຫັດຜ່ານ' }).click();
    await expect(page.getByText('ຕັ້ງລະຫັດຜ່ານໃໝ່ແລ້ວ')).toBeVisible();
  });

  test('Super Admin role is read-only; a custom role is created and deleted', async ({ page }) => {
    await page.goto('/lo/users?view=roles');
    await page.getByRole('button', { name: 'ເບິ່ງ ຜູ້ດູແລລະບົບສູງສຸດ' }).click();
    const view = page.getByRole('dialog');
    await expect(view.getByText('ບົດບາດ Super Admin ປ່ຽນບໍ່ໄດ້', { exact: false })).toBeVisible();
    await expect(view.getByRole('combobox')).toHaveCount(0);
    await view.getByRole('button', { name: 'ປິດ' }).first().click();

    await page.getByRole('button', { name: 'ເພີ່ມບົດບາດ' }).click();
    const role = page.getByRole('dialog', { name: 'ເພີ່ມບົດບາດ' });
    await role.getByRole('textbox', { name: 'ຊື່ບົດບາດ' }).fill('E2E ຜູ້ສັງເກດ');
    await role.getByRole('combobox', { name: 'ເບິ່ງໜ້າພາບລວມ' }).selectOption('DEPARTMENT');
    await role.getByRole('combobox', { name: 'ເບິ່ງລາຍງານ' }).selectOption('DEPARTMENT');
    await role.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ບັນທຶກບົດບາດແລ້ວ')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'E2E ຜູ້ສັງເກດ' })).toContainText('2 ສິດ');
    await page.getByRole('button', { name: 'ລຶບ E2E ຜູ້ສັງເກດ' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ລຶບ' }).click();
    await expect(page.getByText('ລຶບບົດບາດແລ້ວ')).toBeVisible();
  });

  test('settings: work hours are validated and saved; holidays; the change shows in the audit log', async ({ page }) => {
    await page.goto('/lo/settings?view=work');
    const grace = page.getByRole('spinbutton', { name: /^ມາຊ້າໄດ້ບໍ່ເກີນ/ });
    const before = await grace.inputValue();
    await page.getByLabel(/^ເວລາເລີກວຽກ/).fill('07:00');
    await page.getByRole('button', { name: 'ບັນທຶກການຕັ້ງຄ່າ' }).click();
    await expect(page.getByText('ຂໍ້ມູນໃນຊ່ອງນີ້ບໍ່ຖືກຕ້ອງ.')).toBeVisible();
    await page.getByLabel(/^ເວລາເລີກວຽກ/).fill('17:00');
    await grace.fill(String(Number(before) + 1));
    await page.getByRole('button', { name: 'ບັນທຶກການຕັ້ງຄ່າ' }).click();
    await expect(page.getByText('ບັນທຶກການຕັ້ງຄ່າແລ້ວ')).toBeVisible();
    // Put it back so the shared development database keeps its policy.
    await page.getByRole('spinbutton', { name: /^ມາຊ້າໄດ້ບໍ່ເກີນ/ }).fill(before);
    await page.getByRole('button', { name: 'ບັນທຶກການຕັ້ງຄ່າ' }).click();
    await expect(page.getByText('ບັນທຶກການຕັ້ງຄ່າແລ້ວ').last()).toBeVisible();

    await page.getByRole('tab', { name: 'ວັນພັກລັດຖະການ' }).click();
    await page.getByRole('combobox', { name: 'ປີ' }).selectOption(String(new Date().getFullYear() + 2));
    await page.getByRole('button', { name: 'ເພີ່ມວັນພັກ' }).click();
    const holiday = page.getByRole('dialog', { name: 'ເພີ່ມວັນພັກ' });
    await holiday.getByLabel(/^ວັນທີ/).fill(`${new Date().getFullYear() + 2}-03-03`);
    await holiday.getByRole('textbox', { name: 'ຊື່ພາສາລາວ' }).fill('ວັນທົດສອບ');
    await holiday.getByRole('textbox', { name: 'ຊື່ພາສາອັງກິດ' }).fill('E2E holiday');
    await holiday.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ບັນທຶກວັນພັກແລ້ວ')).toBeVisible();
    await page.getByRole('button', { name: 'ລຶບ ວັນທົດສອບ' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ລຶບ ວັນທົດສອບ' }).click();
    await expect(page.getByText('ລຶບວັນພັກແລ້ວ')).toBeVisible();

    await page.getByRole('tab', { name: 'ປະຫວັດການກວດສອບ' }).click();
    await page.getByRole('combobox', { name: 'ລາຍການ' }).selectOption('CompanySetting');
    const row = page.getByRole('table', { name: 'ປະຫວັດການກວດສອບ' }).getByRole('row').filter({ hasText: 'admin@e2e.test' }).first();
    await row.getByRole('button', { name: /ເບິ່ງລາຍລະອຽດ ແກ້ໄຂ/ }).click();
    await expect(page.getByRole('dialog').getByRole('rowheader', { name: 'lateGraceMinutes' })).toBeVisible();
  });

  test('settings: the company logo is uploaded and removed; a kind of notification is switched off and on', async ({ page }) => {
    // A real 1×1 PNG.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await page.goto('/lo/settings');
    await expect(page.getByText('ຍັງບໍ່ມີໂລໂກ້')).toBeVisible();
    await page.getByLabel('ໂລໂກ້ບໍລິສັດ', { exact: true }).setInputFiles({ name: 'logo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    await expect(page.getByText('ໃຊ້ໄດ້ສະເພາະ PNG ຫຼື JPEG.')).toBeVisible();
    await page.getByLabel('ໂລໂກ້ບໍລິສັດ', { exact: true }).setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByText('ບັນທຶກໂລໂກ້ແລ້ວ')).toBeVisible();
    await expect(page.getByRole('img', { name: 'ໂລໂກ້ບໍລິສັດ' })).toBeVisible();
    await page.getByRole('button', { name: 'ລຶບໂລໂກ້' }).click();
    await expect(page.getByText('ລຶບໂລໂກ້ແລ້ວ')).toBeVisible();
    await expect(page.getByText('ຍັງບໍ່ມີໂລໂກ້')).toBeVisible();

    await page.getByRole('tab', { name: 'ການແຈ້ງເຕືອນ' }).click();
    const requested = page.getByRole('checkbox', { name: /^ມີຄຳຮ້ອງລາພັກໃໝ່/ });
    await expect(requested).toBeChecked();
    await requested.uncheck();
    await page.getByRole('button', { name: 'ບັນທຶກການຕັ້ງຄ່າ' }).click();
    await expect(page.getByText('ບັນທຶກການຕັ້ງຄ່າແລ້ວ')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: /^ມີຄຳຮ້ອງລາພັກໃໝ່/ })).not.toBeChecked();
    // Back on, so the other tests still get their notifications.
    await page.getByRole('checkbox', { name: /^ມີຄຳຮ້ອງລາພັກໃໝ່/ }).check();
    await page.getByRole('button', { name: 'ບັນທຶກການຕັ້ງຄ່າ' }).click();
    await expect(page.getByText('ບັນທຶກການຕັ້ງຄ່າແລ້ວ').last()).toBeVisible();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: /^ມີຄຳຮ້ອງລາພັກໃໝ່/ })).toBeChecked();
  });
});
