import { expect, type Page } from '@playwright/test';

export const PASSWORD = process.env.E2E_PASSWORD ?? 'E2e-password-2026';
export const users = { hr: 'hr@e2e.test', staff: 'staff@e2e.test', temp: 'temp@e2e.test', admin: 'admin@e2e.test' } as const;

/** Signs in through the real form and waits for the next screen. */
export async function signIn(page: Page, email: string, password = PASSWORD, locale: 'lo' | 'en' = 'lo') {
  await page.goto(`/${locale}/login`);
  await page.getByRole('textbox', { name: locale === 'lo' ? 'ອີເມວ' : 'E-mail', exact: true }).fill(email);
  await page.getByRole('textbox', { name: locale === 'lo' ? 'ລະຫັດຜ່ານ' : 'Password', exact: true }).fill(password);
  await page.getByRole('button', { name: locale === 'lo' ? 'ເຂົ້າສູ່ລະບົບ' : 'Sign in' }).click();
}

export async function expectDashboard(page: Page, locale: 'lo' | 'en' = 'lo') {
  await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard$`));
  await expect(page.getByRole('heading', { level: 1, name: locale === 'lo' ? 'ພາບລວມ' : 'Dashboard' })).toBeVisible();
}
