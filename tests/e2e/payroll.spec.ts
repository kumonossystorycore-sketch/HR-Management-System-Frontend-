import { expect, test, type Page } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

const PERIOD = '/lo/payroll?periodYear=2031&periodMonth=1';

const as = async (page: Page, email: string) => {
  await page.context().clearCookies();
  await signIn(page, email);
  await expectDashboard(page);
};

test.describe('payroll and payslips', () => {
  test('HR prepares a month, Super Admin approves, HR pays, the employee gets the payslip', async ({ page }) => {
    await as(page, users.hr);
    await page.goto('/lo/payroll');
    await expect(page.getByRole('heading', { level: 1, name: 'ເງິນເດືອນ' })).toBeVisible();
    await page.getByRole('button', { name: 'ສ້າງງວດເງິນເດືອນ' }).first().click();
    const gen = page.getByRole('dialog', { name: 'ສ້າງງວດເງິນເດືອນ' });
    await gen.getByRole('combobox', { name: 'ເດືອນ' }).selectOption('1');
    await gen.getByRole('spinbutton', { name: 'ປີ' }).fill('2031');
    await gen.getByRole('combobox', { name: 'ພະແນກ' }).selectOption({ label: 'ທົດສອບ E2E' });
    await gen.getByRole('button', { name: 'ສ້າງງວດ' }).click();
    await expect(page.getByText('ສ້າງ 3 ລາຍການ', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'ງວດ 01/2031' })).toBeVisible();

    // One person's items: an allowance and a deduction change the net.
    await page.getByRole('button', { name: 'ລາຍລະອຽດເງິນເດືອນຂອງ ບຸນມີ ທົດສອບ' }).click();
    const row = page.getByRole('dialog', { name: /ເງິນເດືອນ ບຸນມີ ທົດສອບ/ });
    await row.getByRole('textbox', { name: 'ລາຍລະອຽດ' }).fill('ຄ່າເດີນທາງ');
    await row.getByRole('textbox', { name: 'ຈຳນວນເງິນ' }).fill('500000');
    await row.getByRole('button', { name: 'ເພີ່ມ', exact: true }).click();
    await expect(row.getByText('6,500,000 ກີບ')).toBeVisible();
    await row.getByRole('combobox', { name: 'ປະເພດ' }).selectOption('DEDUCTION');
    await row.getByRole('textbox', { name: 'ລາຍລະອຽດ' }).fill('ຂາດວຽກ 1 ມື້');
    await row.getByRole('textbox', { name: 'ຈຳນວນເງິນ' }).fill('200000');
    await row.getByRole('button', { name: 'ເພີ່ມ', exact: true }).click();
    await expect(row.getByText('6,300,000 ກີບ')).toBeVisible();
    await row.getByRole('button', { name: 'ປິດ' }).click();

    await page.getByRole('button', { name: 'ສົ່ງໃຫ້ອະນຸມັດ' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ສົ່ງໃຫ້ອະນຸມັດ' }).click();
    await expect(page.getByText('ສົ່ງໃຫ້ອະນຸມັດແລ້ວ (3 ຄົນ)')).toBeVisible();
    // HR can't approve its own run.
    await expect(page.getByRole('button', { name: 'ອະນຸມັດ', exact: true })).toHaveCount(0);

    await as(page, users.admin);
    await page.goto(PERIOD);
    await page.getByRole('button', { name: 'ອະນຸມັດ', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ອະນຸມັດ', exact: true }).click();
    await expect(page.getByText('ອະນຸມັດແລ້ວ (3 ຄົນ)')).toBeVisible();

    await as(page, users.hr);
    await page.goto(PERIOD);
    await page.getByRole('button', { name: 'ໝາຍວ່າຈ່າຍແລ້ວ' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ໝາຍວ່າຈ່າຍແລ້ວ' }).click();
    await expect(page.getByText('ໝາຍວ່າຈ່າຍແລ້ວ (3 ຄົນ)')).toBeVisible();

    await as(page, users.staff);
    await page.getByRole('navigation', { name: 'ເມນູຫຼັກ' }).getByRole('link', { name: 'ສະລິບເງິນເດືອນ' }).click();
    const slips = page.getByRole('table', { name: 'ສະລິບເງິນເດືອນຂອງຂ້ອຍ' });
    await expect(slips.getByRole('row').filter({ hasText: '01/2031' })).toContainText('6,300,000 ກີບ');
    await slips.getByRole('button', { name: 'ເບິ່ງສະລິບງວດ 01/2031' }).click();
    const slip = page.getByRole('dialog', { name: 'ສະລິບເງິນເດືອນ ງວດ 01/2031' });
    await expect(slip.getByText('ຄ່າເດີນທາງ')).toBeVisible();
    await expect(slip.getByText('−200,000')).toBeVisible();
    const download = page.waitForEvent('download');
    await slip.getByRole('button', { name: 'ດາວໂຫຼດ PDF' }).click();
    expect((await download).suggestedFilename()).toBe('payslip_E2E-STAFF_2031-01.pdf');
  });
});
