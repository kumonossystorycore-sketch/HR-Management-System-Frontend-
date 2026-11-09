import { expect, test, type Page } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

/** A real 1×1 PNG. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const asHr = async (page: Page) => {
  await signIn(page, users.hr);
  await expectDashboard(page);
};

test.describe('employees (HR)', () => {
  test('list, search and open an employee', async ({ page }) => {
    await asHr(page);
    await page.getByRole('navigation', { name: 'ເມນູຫຼັກ' }).getByRole('link', { name: 'ພະນັກງານ', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ພະນັກງານ' })).toBeVisible();
    await expect(page.getByText(/ຄົນ · ເຮັດວຽກຢູ່ \d+ · ບໍ່ເຄື່ອນໄຫວ \d+/)).toBeVisible();

    await page.getByRole('searchbox', { name: 'ຄົ້ນຫາພະນັກງານ' }).fill('E2E-STAFF');
    await expect(page).toHaveURL(/search=E2E-STAFF/);
    const table = page.getByRole('table', { name: 'ລາຍຊື່ພະນັກງານ' });
    await expect(table.getByRole('row')).toHaveCount(2); // header + one person
    await table.getByRole('link', { name: 'ບຸນມີ ທົດສອບ E2E-STAFF' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'ບຸນມີ ທົດສອບ' })).toBeVisible();
    await expect(page.getByText('E2E-STAFF · E2E tester · ທົດສອບ E2E')).toBeVisible();
    await expect(page.getByText('ຫົວໜ້າ: ນາລີ ທົດສອບ', { exact: false })).toBeVisible();
    // HR may see salaries.
    await expect(page.getByText('6,000,000 ກີບ')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ບັນຊີເຂົ້າລະບົບ' })).toBeVisible();
    await expect(page.getByText('staff@e2e.test')).toBeVisible();
    await page.getByRole('tab', { name: 'ການເຂົ້າວຽກ' }).click();
    await expect(page.getByText('30 ມື້ຜ່ານມາ', { exact: false })).toBeVisible();
  });

  test('add an employee: validation, a duplicate e-mail, then save and delete', async ({ page }) => {
    await asHr(page);
    await page.goto('/lo/employees/new');
    await expect(page.getByRole('heading', { level: 1, name: 'ເພີ່ມພະນັກງານ' })).toBeVisible();

    await page.getByRole('button', { name: 'ບັນທຶກ', exact: true }).click();
    await expect(page.getByText(/ກະລຸນາແກ້ໄຂ \d+ ຊ່ອງກ່ອນບັນທຶກ/)).toBeVisible();
    await expect(page.getByText('ກະລຸນາໃສ່ ຊື່', { exact: true })).toBeVisible();

    await page.getByRole('textbox', { name: 'ຊື່', exact: true }).fill('ທົດລອງ');
    await page.getByRole('textbox', { name: 'ນາມສະກຸນ', exact: true }).fill('ເພີ່ມໃໝ່');
    await page.getByRole('combobox', { name: 'ເພດ' }).selectOption('MALE');
    await page.getByLabel(/^ວັນເກີດ/).fill('1998-03-14');
    await page.getByRole('textbox', { name: 'ເບີໂທ', exact: true }).fill('+856 20 5555 1234');
    await page.getByRole('textbox', { name: 'ອີເມວ', exact: true }).fill('staff-employee@e2e.test');
    await page.getByRole('combobox', { name: 'ພະແນກ' }).selectOption({ label: 'ທົດສອບ E2E' });
    await page.getByRole('combobox', { name: 'ຕຳແໜ່ງ' }).selectOption({ label: 'E2E tester' });
    await page.getByRole('textbox', { name: 'ເງິນເດືອນພື້ນຖານ' }).fill('5500000');
    await page.getByRole('button', { name: 'ບັນທຶກ', exact: true }).click();
    // The address is already used by another employee: the error lands on the field.
    await expect(page.getByText('ຂໍ້ມູນນີ້ມີຢູ່ໃນລະບົບແລ້ວ. ກະລຸນາໃຊ້ຄ່າອື່ນ.')).toBeVisible();

    await page.getByRole('textbox', { name: 'ອີເມວ', exact: true }).fill('new-employee@e2e.test');
    await page.getByRole('button', { name: 'ບັນທຶກ', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ທົດລອງ ເພີ່ມໃໝ່' })).toBeVisible();
    await expect(page.getByText('ເພີ່ມພະນັກງານແລ້ວ')).toBeVisible();
    await expect(page.getByText(/^SYS-\d{4} · E2E tester/)).toBeVisible();

    // Edit one field.
    await page.getByRole('link', { name: 'ແກ້ໄຂ' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ແກ້ໄຂຂໍ້ມູນພະນັກງານ' })).toBeVisible();
    await page.getByRole('textbox', { name: 'ຊື່ຜູ້ຕິດຕໍ່' }).fill('ແມ່ ທົດລອງ');
    await page.getByRole('button', { name: 'ບັນທຶກການປ່ຽນແປງ' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ທົດລອງ ເພີ່ມໃໝ່' })).toBeVisible();
    await expect(page.getByText('ແມ່ ທົດລອງ')).toBeVisible();

    // No history yet, so it is deleted for good.
    await page.getByRole('button', { name: 'ລຶບ', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'ລຶບ ທົດລອງ ເພີ່ມໃໝ່?' });
    await dialog.getByRole('button', { name: 'ລຶບພະນັກງານ' }).click();
    await expect(page).toHaveURL(/\/lo\/employees$/);
    await expect(page.getByText('ລຶບພະນັກງານແລ້ວ')).toBeVisible();
  });
});

test.describe('employee photo (HR)', () => {
  test('upload a photo on the edit page, see it, then remove it', async ({ page }) => {
    await asHr(page);
    await page.goto('/lo/employees?search=E2E-TEMP');
    await page.getByRole('link', { name: 'ແກ້ໄຂ ສົມພອນ ທົດສອບ' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ແກ້ໄຂຂໍ້ມູນພະນັກງານ' })).toBeVisible();
    // Not a picture: refused in the browser before upload.
    await page.locator('input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(page.getByText('ໃຊ້ໄດ້ສະເພາະຮູບ JPEG, PNG ຫຼື WebP.')).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({ name: 'face.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByText('ບັນທຶກຮູບແລ້ວ')).toBeVisible();
    // Shown from a local blob: the photo needs the access token, so it is never a plain link.
    await expect(page.locator('main img[src^="blob:"]')).toBeVisible();
    await page.getByRole('button', { name: 'ລຶບຮູບ' }).click();
    await expect(page.getByText('ລຶບຮູບແລ້ວ')).toBeVisible();
    await expect(page.locator('main img[src^="blob:"]')).toHaveCount(0);
  });
});

test.describe('departments and positions (HR)', () => {
  test('create a department and a position, then delete both', async ({ page }) => {
    await asHr(page);
    await page.goto('/lo/departments');
    await expect(page.getByRole('heading', { level: 1, name: 'ພະແນກ' })).toBeVisible();
    await page.getByRole('button', { name: 'ເພີ່ມພະແນກ' }).first().click();
    let dialog = page.getByRole('dialog', { name: 'ເພີ່ມພະແນກ' });
    await dialog.getByRole('textbox', { name: 'ລະຫັດພະແນກ' }).fill('e2ex');
    await dialog.getByRole('textbox', { name: 'ຊື່ພະແນກ' }).fill('ທົດສອບ E2E ຊົ່ວຄາວ');
    await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ສ້າງພະແນກແລ້ວ')).toBeVisible();

    // The same code again is refused on the field.
    await page.getByRole('button', { name: 'ເພີ່ມພະແນກ' }).first().click();
    dialog = page.getByRole('dialog', { name: 'ເພີ່ມພະແນກ' });
    await dialog.getByRole('textbox', { name: 'ລະຫັດພະແນກ' }).fill('E2EX');
    await dialog.getByRole('textbox', { name: 'ຊື່ພະແນກ' }).fill('ຊ້ຳ');
    await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(dialog.getByText('ຂໍ້ມູນນີ້ມີຢູ່ໃນລະບົບແລ້ວ. ກະລຸນາໃຊ້ຄ່າອື່ນ.')).toBeVisible();
    await dialog.getByRole('button', { name: 'ຍົກເລີກ' }).click();

    await page.goto('/lo/positions');
    await page.getByRole('button', { name: 'ເພີ່ມຕຳແໜ່ງ' }).first().click();
    dialog = page.getByRole('dialog', { name: 'ເພີ່ມຕຳແໜ່ງ' });
    await dialog.getByRole('combobox', { name: 'ພະແນກ' }).selectOption({ label: 'ທົດສອບ E2E ຊົ່ວຄາວ' });
    await dialog.getByRole('textbox', { name: 'ຊື່ຕຳແໜ່ງ' }).fill('ນັກທົດສອບຊົ່ວຄາວ');
    await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ສ້າງຕຳແໜ່ງແລ້ວ')).toBeVisible();

    await page.getByRole('searchbox', { name: 'ຄົ້ນຫາຕຳແໜ່ງ' }).fill('ຊົ່ວຄາວ');
    await page.getByRole('button', { name: 'ລຶບ ນັກທົດສອບຊົ່ວຄາວ' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ລຶບຕຳແໜ່ງ' }).click();
    await expect(page.getByText('ລຶບຕຳແໜ່ງແລ້ວ')).toBeVisible();

    await page.goto('/lo/departments?search=E2EX');
    await page.getByRole('button', { name: 'ລຶບ ທົດສອບ E2E ຊົ່ວຄາວ' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ລຶບພະແນກ' }).click();
    await expect(page.getByText('ລຶບພະແນກແລ້ວ')).toBeVisible();
  });

  test('a department with employees cannot be deleted', async ({ page }) => {
    await asHr(page);
    await page.goto('/lo/departments?search=E2E');
    await page.getByRole('button', { name: 'ລຶບ ທົດສອບ E2E', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ລຶບພະແນກ' }).click();
    await expect(page.getByText('ຍັງມີພະນັກງານຢູ່ໃນພະແນກນີ້. ກະລຸນາຍ້າຍພະນັກງານອອກກ່ອນ.')).toBeVisible();
  });
});

test.describe('my contact details', () => {
  test('an employee updates their own phone on My account', async ({ page }) => {
    await signIn(page, users.staff);
    await expectDashboard(page);
    await page.goto('/lo/account');
    const card = page.getByRole('region', { name: 'ຂໍ້ມູນຕິດຕໍ່ຂອງຂ້ອຍ' });
    const phone = card.getByRole('textbox', { name: 'ເບີໂທ', exact: true });
    await expect(phone).toHaveValue('+856 20 0000 0000');
    await phone.fill('abc');
    await card.getByRole('button', { name: 'ບັນທຶກການປ່ຽນແປງ' }).click();
    await expect(card.getByText('ໃສ່ເບີໂທເປັນຕົວເລກ', { exact: false })).toBeVisible();
    await phone.fill('+856 20 7777 8888');
    await card.getByRole('button', { name: 'ບັນທຶກການປ່ຽນແປງ' }).click();
    await expect(page.getByText('ບັນທຶກຂໍ້ມູນຕິດຕໍ່ແລ້ວ')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('region', { name: 'ຂໍ້ມູນຕິດຕໍ່ຂອງຂ້ອຍ' }).getByRole('textbox', { name: 'ເບີໂທ', exact: true })).toHaveValue('+856 20 7777 8888');
  });
});
