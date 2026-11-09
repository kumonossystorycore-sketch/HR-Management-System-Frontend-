import { expect, test } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');

test.describe('recruitment', () => {
  test('HR opens a vacancy, adds an applicant with a CV, interviews and hires them', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.getByRole('navigation', { name: 'ເມນູຫຼັກ' }).getByRole('link', { name: 'ການຮັບສະໝັກ' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ການຮັບສະໝັກ' })).toBeVisible();

    // Vacancy
    await page.getByRole('button', { name: 'ເພີ່ມຕຳແໜ່ງວ່າງ' }).first().click();
    let dialog = page.getByRole('dialog', { name: 'ເພີ່ມຕຳແໜ່ງວ່າງ' });
    await dialog.getByRole('textbox', { name: 'ຊື່ຕຳແໜ່ງທີ່ປະກາດ' }).fill('ນັກທົດສອບ E2E');
    await dialog.getByRole('combobox', { name: 'ພະແນກ' }).selectOption({ label: 'ທົດສອບ E2E' });
    await dialog.getByRole('combobox', { name: 'ຕຳແໜ່ງ' }).selectOption({ label: 'E2E tester' });
    await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ບັນທຶກຕຳແໜ່ງວ່າງແລ້ວ')).toBeVisible();
    await page.getByRole('button', { name: 'ເບິ່ງຜູ້ສະໝັກ ນັກທົດສອບ E2E' }).click();
    await expect(page.getByRole('tab', { name: 'ຜູ້ສະໝັກ' })).toHaveAttribute('aria-selected', 'true');

    // Applicant; the applicant's page opens after saving.
    await page.getByRole('button', { name: 'ເພີ່ມຜູ້ສະໝັກ' }).click();
    dialog = page.getByRole('dialog', { name: 'ເພີ່ມຜູ້ສະໝັກ' });
    await dialog.getByRole('textbox', { name: 'ຊື່ ແລະ ນາມສະກຸນ' }).fill('ສົມສັກ ທົດສອບ');
    await dialog.getByRole('textbox', { name: 'ອີເມວ' }).fill('applicant@e2e.test');
    await dialog.getByRole('textbox', { name: 'ເບີໂທ' }).fill('+856 20 9999 0000');
    await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click();
    const applicant = page.getByRole('dialog', { name: 'ສົມສັກ ທົດສອບ' });
    await expect(applicant).toContainText('ສະໝັກແລ້ວ');

    // A Word file is refused in the browser; a PDF is accepted.
    await applicant.locator('input[type=file]').setInputFiles({ name: 'cv.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK') });
    await expect(applicant.getByText('ໃຊ້ໄດ້ສະເພາະ PDF, JPEG ຫຼື PNG.')).toBeVisible();
    await applicant.locator('input[type=file]').setInputFiles({ name: 'CV ສົມສັກ.pdf', mimeType: 'application/pdf', buffer: PDF });
    await expect(page.getByText('ບັນທຶກ CV ແລ້ວ')).toBeVisible();
    await expect(applicant.getByRole('button', { name: 'ເປີດ CV CV ສົມສັກ.pdf' })).toBeVisible();

    // Interview with HR as interviewer, then record the result.
    await applicant.getByRole('button', { name: 'ນັດສຳພາດ' }).click();
    const schedule = page.getByRole('dialog', { name: 'ນັດສຳພາດ: ສົມສັກ ທົດສອບ' });
    await schedule.getByRole('combobox', { name: 'ຜູ້ສຳພາດ' }).selectOption({ label: 'ນາລີ ທົດສອບ · ທົດສອບ E2E' });
    await schedule.getByRole('textbox', { name: 'ສະຖານທີ່' }).fill('ຫ້ອງປະຊຸມ 2');
    await schedule.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ນັດສຳພາດແລ້ວ')).toBeVisible();
    await expect(applicant).toContainText('ສຳພາດ');
    await applicant.getByRole('button', { name: 'ບັນທຶກຜົນ' }).click();
    const result = page.getByRole('dialog', { name: 'ຜົນການສຳພາດ: ສົມສັກ ທົດສອບ' });
    await result.getByRole('textbox', { name: 'ຄວາມເຫັນ' }).fill('ຕອບຄຳຖາມໄດ້ດີ');
    await result.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ບັນທຶກຜົນແລ້ວ')).toBeVisible();

    // Accept, then hire.
    await applicant.getByRole('combobox', { name: 'ປ່ຽນເປັນ' }).selectOption('ACCEPTED');
    await applicant.getByRole('button', { name: 'ບັນທຶກ', exact: true }).click();
    await expect(page.getByText('ປ່ຽນສະຖານະແລ້ວ')).toBeVisible();
    await applicant.getByRole('button', { name: 'ຮັບເຂົ້າເປັນພະນັກງານ' }).click();
    const hire = page.getByRole('dialog', { name: 'ຮັບ ສົມສັກ ທົດສອບ ເຂົ້າເປັນພະນັກງານ' });
    await hire.getByRole('button', { name: 'ສ້າງພະນັກງານ' }).click();
    await expect(hire.getByText('ກະລຸນາເລືອກ ເພດ')).toBeVisible();
    await hire.getByRole('combobox', { name: 'ເພດ' }).selectOption('MALE');
    await hire.getByLabel(/^ວັນເກີດ/).fill('1999-09-09');
    await hire.getByRole('textbox', { name: 'ເງິນເດືອນພື້ນຖານ' }).fill('5000000');
    await hire.getByRole('button', { name: 'ສ້າງພະນັກງານ' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'ສົມສັກ ທົດສອບ' })).toBeVisible();
    await expect(page.getByText(/SYS-\d{4} · E2E tester · ທົດສອບ E2E/)).toBeVisible();
  });

  test('HR moves a pending interview, then cancels it', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.goto('/lo/recruitment');

    await page.getByRole('button', { name: 'ເພີ່ມຕຳແໜ່ງວ່າງ' }).first().click();
    let dialog = page.getByRole('dialog', { name: 'ເພີ່ມຕຳແໜ່ງວ່າງ' });
    await dialog.getByRole('textbox', { name: 'ຊື່ຕຳແໜ່ງທີ່ປະກາດ' }).fill('ນັກທົດສອບ E2E ສອງ');
    await dialog.getByRole('combobox', { name: 'ພະແນກ' }).selectOption({ label: 'ທົດສອບ E2E' });
    await dialog.getByRole('combobox', { name: 'ຕຳແໜ່ງ' }).selectOption({ label: 'E2E tester' });
    await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ບັນທຶກຕຳແໜ່ງວ່າງແລ້ວ')).toBeVisible();
    await page.getByRole('button', { name: 'ເບິ່ງຜູ້ສະໝັກ ນັກທົດສອບ E2E ສອງ' }).click();

    await page.getByRole('button', { name: 'ເພີ່ມຜູ້ສະໝັກ' }).click();
    dialog = page.getByRole('dialog', { name: 'ເພີ່ມຜູ້ສະໝັກ' });
    await dialog.getByRole('textbox', { name: 'ຊື່ ແລະ ນາມສະກຸນ' }).fill('ວິໄລ ທີສອງ');
    await dialog.getByRole('textbox', { name: 'ອີເມວ' }).fill('second-applicant@e2e.test');
    await dialog.getByRole('button', { name: 'ບັນທຶກ' }).click();
    const applicant = page.getByRole('dialog', { name: 'ວິໄລ ທີສອງ' });
    await applicant.getByRole('button', { name: 'ນັດສຳພາດ' }).click();
    const schedule = page.getByRole('dialog', { name: 'ນັດສຳພາດ: ວິໄລ ທີສອງ' });
    await schedule.getByRole('textbox', { name: 'ສະຖານທີ່' }).fill('ຫ້ອງປະຊຸມ 1');
    await schedule.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ນັດສຳພາດແລ້ວ')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(applicant).toBeHidden();

    // The interviews tab: move it to another place and time.
    await page.getByRole('tab', { name: 'ການສຳພາດ' }).click();
    const table = page.getByRole('table', { name: 'ການສຳພາດ' });
    const row = table.getByRole('row').filter({ hasText: 'ວິໄລ ທີສອງ' });
    await expect(row).toContainText('ຫ້ອງປະຊຸມ 1');
    await row.getByRole('button', { name: 'ແກ້ໄຂການນັດສຳພາດຂອງ ວິໄລ ທີສອງ' }).click();
    const edit = page.getByRole('dialog', { name: 'ແກ້ໄຂການນັດສຳພາດ: ວິໄລ ທີສອງ' });
    await expect(edit.getByRole('textbox', { name: 'ສະຖານທີ່' })).toHaveValue('ຫ້ອງປະຊຸມ 1');
    await edit.getByRole('textbox', { name: 'ສະຖານທີ່' }).fill('Google Meet');
    await edit.getByLabel(/^ເວລາ/).fill('14:30');
    await edit.getByRole('button', { name: 'ບັນທຶກ' }).click();
    await expect(page.getByText('ແກ້ໄຂການນັດແລ້ວ')).toBeVisible();
    await expect(row).toContainText('Google Meet');
    await expect(row).toContainText('14:30');

    // Cancel it: the row goes away.
    await row.getByRole('button', { name: 'ຍົກເລີກນັດສຳພາດ ວິໄລ ທີສອງ' }).click();
    const confirm = page.getByRole('dialog', { name: 'ຍົກເລີກນັດສຳພາດຂອງ ວິໄລ ທີສອງ?' });
    await confirm.getByRole('button', { name: 'ຍົກເລີກນັດ' }).click();
    await expect(page.getByText('ຍົກເລີກນັດແລ້ວ')).toBeVisible();
    await expect(table.getByRole('row').filter({ hasText: 'ວິໄລ ທີສອງ' })).toHaveCount(0);
  });
});
