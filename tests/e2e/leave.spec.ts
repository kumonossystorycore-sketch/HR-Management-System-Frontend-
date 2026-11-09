import { expect, test } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');

test.describe('leave', () => {
  test('an employee requests leave with a document; HR approves it and the balance drops', async ({ page }) => {
    await signIn(page, users.staff);
    await expectDashboard(page);
    await page.getByRole('navigation', { name: 'ເມນູຫຼັກ' }).getByRole('link', { name: 'ການລາພັກ' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ການລາພັກ' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /ວັນພັກປີ \d{4}/ })).toBeVisible();
    await expect(page.getByText('ຈາກ 15 ວັນ')).toBeVisible();

    await page.getByRole('button', { name: 'ຂໍລາພັກ' }).click();
    const dialog = page.getByRole('dialog', { name: 'ຂໍລາພັກ' });
    const type = dialog.getByRole('combobox', { name: 'ປະເພດການລາ' });
    // Sick leave needs a document: caught before anything is sent.
    await type.selectOption({ label: (await type.locator('option', { hasText: 'ລາປ່ວຍ' }).textContent())! });
    await dialog.getByLabel(/^ແຕ່ວັນທີ/).fill('2026-12-14');
    await dialog.getByLabel(/^ຫາວັນທີ/).fill('2026-12-15');
    await dialog.getByRole('textbox', { name: 'ເຫດຜົນ' }).fill('ໄປຢາມພໍ່ແມ່');
    await dialog.getByRole('button', { name: 'ສົ່ງຄຳຮ້ອງ' }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'ຕ້ອງແນບເອກະສານ' })).toBeVisible();

    // Annual leave, with an optional document attached.
    await type.selectOption({ label: (await type.locator('option', { hasText: 'ລາພັກປະຈຳປີ' }).textContent())! });
    await dialog.locator('input[type=file]').setInputFiles({ name: 'ໃບນັດ.pdf', mimeType: 'application/pdf', buffer: PDF });
    await expect(dialog.getByText('ໃບນັດ.pdf')).toBeVisible();
    await dialog.getByRole('button', { name: 'ສົ່ງຄຳຮ້ອງ' }).click();
    await expect(page.getByText('ສົ່ງຄຳຮ້ອງລາພັກແລ້ວ (2 ວັນ)', { exact: false })).toBeVisible();
    const mine = page.getByRole('table', { name: 'ຄຳຮ້ອງລາພັກຂອງຂ້ອຍ' });
    await expect(mine.getByRole('row').filter({ hasText: '14/12/2026' })).toContainText('ລໍຖ້າອະນຸມັດ');
    await expect(mine.getByRole('button', { name: 'ເປີດເອກະສານ ໃບນັດ.pdf' })).toBeVisible();

    // HR decides. A rejection needs a reason; then approve instead.
    await page.context().clearCookies();
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.goto('/lo/leave');
    await page.getByRole('tab', { name: 'ລໍຖ້າອະນຸມັດ' }).click();
    const pending = page.getByRole('table', { name: 'ຄຳຮ້ອງທີ່ລໍຖ້າອະນຸມັດ' });
    await pending.getByRole('button', { name: 'ບໍ່ອະນຸມັດຄຳຮ້ອງຂອງ ບຸນມີ ທົດສອບ' }).click();
    let decide = page.getByRole('dialog', { name: 'ບໍ່ອະນຸມັດການລາຂອງ ບຸນມີ ທົດສອບ?' });
    await decide.getByRole('button', { name: 'ບໍ່ອະນຸມັດ', exact: true }).click();
    await expect(decide.getByText('ກະລຸນາບອກເຫດຜົນ (ຢ່າງໜ້ອຍ 3 ຕົວ)')).toBeVisible();
    await decide.getByRole('button', { name: 'ຍົກເລີກ' }).click();

    await pending.getByRole('button', { name: 'ອະນຸມັດຄຳຮ້ອງຂອງ ບຸນມີ ທົດສອບ', exact: true }).click();
    decide = page.getByRole('dialog', { name: 'ອະນຸມັດການລາຂອງ ບຸນມີ ທົດສອບ?' });
    await expect(decide).toContainText('2 ວັນ');
    await decide.getByRole('button', { name: 'ອະນຸມັດ', exact: true }).click();
    await expect(page.getByText('ອະນຸມັດແລ້ວ', { exact: true })).toBeVisible();

    await page.context().clearCookies();
    await signIn(page, users.staff);
    await expectDashboard(page);
    await page.goto('/lo/leave');
    await expect(page.getByRole('table', { name: 'ຄຳຮ້ອງລາພັກຂອງຂ້ອຍ' }).getByRole('row').filter({ hasText: '14/12/2026' })).toContainText('ອະນຸມັດແລ້ວ');
    await expect(page.getByText('ໃຊ້ແລ້ວ 2 ວັນ')).toBeVisible();
  });
});
