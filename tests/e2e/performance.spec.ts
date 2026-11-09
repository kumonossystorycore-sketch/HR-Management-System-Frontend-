import { expect, test } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

test.describe('performance reviews', () => {
  test('HR opens a cycle, the manager scores and submits, the employee acknowledges', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.goto('/lo/performance?mine=all');
    await page.getByRole('button', { name: 'ເປີດຮອບການປະເມີນ' }).click();
    const cycle = page.getByRole('dialog', { name: 'ເປີດຮອບການປະເມີນ' });
    await cycle.getByRole('combobox', { name: 'ພະແນກ' }).selectOption({ label: 'ທົດສອບ E2E' });
    await cycle.getByRole('button', { name: 'ເປີດຮອບ' }).click();
    // HR manages the E2E department, so their own review is skipped (nobody reviews themselves).
    await expect(page.getByText('ສ້າງ 2 ການປະເມີນ', { exact: false })).toBeVisible();

    await page.getByRole('tab', { name: 'ທີ່ຕ້ອງປະເມີນ' }).click();
    await page.getByRole('button', { name: 'ປະເມີນ ບຸນມີ ທົດສອບ' }).click();
    const review = page.getByRole('dialog', { name: 'ການປະເມີນ ບຸນມີ ທົດສອບ' });
    await review.getByRole('button', { name: 'ສົ່ງການປະເມີນ' }).click();
    await expect(review.getByText('ກະລຸນາໃຫ້ຄະແນນທຸກຫົວຂໍ້ກ່ອນສົ່ງ.')).toBeVisible();
    for (const [criterion, score] of [['ຄຸນນະພາບວຽກ', 4], ['ການສື່ສານ', 5], ['ການເຮັດວຽກເປັນທີມ', 4], ['ຄວາມຮັບຜິດຊອບ', 3], ['ປະສິດທິພາບການເຮັດວຽກ', 4]] as const) {
      await review.getByRole('radiogroup', { name: criterion }).getByRole('radio', { name: new RegExp(`^${score} ·`) }).click();
    }
    await review.getByRole('textbox', { name: 'ຄວາມເຫັນຂອງຜູ້ປະເມີນ' }).fill('ເຮັດວຽກໄດ້ດີ, ຄວນພັດທະນາການວາງແຜນ.');
    await review.getByRole('button', { name: 'ບັນທຶກຮ່າງ' }).click();
    await expect(page.getByText('ບັນທຶກຮ່າງແລ້ວ')).toBeVisible();
    await review.getByRole('button', { name: 'ສົ່ງການປະເມີນ' }).click();
    await review.getByRole('button', { name: 'ສົ່ງການປະເມີນ' }).last().click();
    await expect(page.getByText('ສົ່ງການປະເມີນແລ້ວ')).toBeVisible();

    await page.context().clearCookies();
    await signIn(page, users.staff);
    await expectDashboard(page);
    await page.getByRole('navigation', { name: 'ເມນູຫຼັກ' }).getByRole('link', { name: 'ການປະເມີນຜົນ' }).click();
    const mine = page.getByRole('table', { name: /ການປະເມີນຂອງຂ້ອຍ/ });
    await expect(mine.getByRole('row').filter({ hasText: 'ນາລີ ທົດສອບ' })).toContainText('4 / 5');
    await mine.getByRole('button', { name: /ເປີດການປະເມີນ/ }).click();
    const mineDialog = page.getByRole('dialog', { name: 'ການປະເມີນ ບຸນມີ ທົດສອບ' });
    await expect(mineDialog.getByText('ເຮັດວຽກໄດ້ດີ, ຄວນພັດທະນາການວາງແຜນ.')).toBeVisible();
    await mineDialog.getByRole('textbox', { name: 'ຄຳຕອບຂອງພະນັກງານ' }).fill('ຂອບໃຈ, ຈະປັບປຸງ.');
    await mineDialog.getByRole('button', { name: 'ຮັບຊາບການປະເມີນ' }).click();
    await expect(page.getByText('ຮັບຊາບແລ້ວ', { exact: true }).first()).toBeVisible();
    await expect(mine.getByRole('row').filter({ hasText: 'ນາລີ ທົດສອບ' })).toContainText('ຮັບຊາບແລ້ວ');
  });
});
