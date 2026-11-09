import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { expectDashboard, signIn, users } from './helpers';

/**
 * Phase 9: every page and every tab, in Lao and in English. A page fails when next-intl reports a
 * missing message, when a raw message key is shown, or (in English) when interface text such as
 * headings, menus, tabs, buttons, labels or table headings is still in Lao. Data typed by people
 * (names of departments, employees, holidays) may be in Lao in either language and is not checked.
 */
const PAGES = ['/dashboard', '/employees', '/departments', '/positions', '/recruitment', '/attendance', '/leave', '/payroll', '/payslips', '/performance', '/reports', '/users', '/settings', '/account'];

const LAO = /[຀-໿]/;
/** "settings.notifications.events.leave" and the like: what next-intl prints for a missing key. */
const RAW_KEY = /\b(common|nav|auth|errors|validation|dashboard|account|notifications|employees|departments|positions|attendance|leave|payroll|recruitment|performance|reports|users|settings)\.[a-zA-Z]+(\.[a-zA-Z_]+)*\b/;

/** Interface text in the main content, menus and header: not inside elements marked as Lao data or the language switch. */
const interfaceTexts = (page: Page) =>
  page.evaluate(() => {
    const selector = 'h1, h2, h3, legend, label, th, [role=tab], nav a, button, [role=menuitem]';
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => !el.closest('[lang="lo"]') && !el.closest('td') && el.offsetParent !== null)
      .map((el) => (el.innerText || '').trim())
      .filter(Boolean);
  });

async function sweep(page: Page, locale: 'lo' | 'en', problems: string[]) {
  const missing: string[] = [];
  page.on('console', (m) => {
    if (/MISSING_MESSAGE|Could not resolve/.test(m.text())) missing.push(m.text().slice(0, 160));
  });
  for (const path of PAGES) {
    await page.goto(`/${locale}${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    const tabs = page.getByRole('main').getByRole('tab');
    const count = await tabs.count();
    for (let i = 0; i <= count; i++) {
      if (i > 0) {
        await tabs.nth(i - 1).click();
        await page.waitForLoadState('networkidle');
      }
      const where = `${locale}${path}${i > 0 ? ` (tab ${i})` : ''}`;
      const body = await page.locator('body').innerText();
      const raw = body.match(RAW_KEY);
      if (raw) problems.push(`${where}: raw key "${raw[0]}"`);
      if (locale === 'en') {
        const lao = (await interfaceTexts(page)).filter((s) => LAO.test(s));
        for (const s of lao.slice(0, 5)) problems.push(`${where}: Lao text in the English interface: "${s.slice(0, 60)}"`);
      }
    }
  }
  for (const m of missing) problems.push(`${locale}: ${m}`);
}

/** Every key of a message file as "a.b.c" → text. */
const flatten = (o: Record<string, unknown>, prefix = ''): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
    if (v && typeof v === 'object') Object.assign(acc, flatten(v as Record<string, unknown>, `${prefix}${k}.`));
    else acc[`${prefix}${k}`] = String(v);
    return acc;
  }, {});
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort().join();

test('Lao and English message files have the same keys and the same {placeholders}', () => {
  const dir = path.join(__dirname, '../../src/i18n/messages');
  const files = readdirSync(path.join(dir, 'lo')).sort();
  expect(readdirSync(path.join(dir, 'en')).sort()).toEqual(files);
  const problems: string[] = [];
  for (const file of files) {
    const lo = flatten(JSON.parse(readFileSync(path.join(dir, 'lo', file), 'utf8')));
    const en = flatten(JSON.parse(readFileSync(path.join(dir, 'en', file), 'utf8')));
    for (const k of Object.keys(lo)) if (!(k in en)) problems.push(`${file}: "${k}" has no English text`);
    for (const k of Object.keys(en)) if (!(k in lo)) problems.push(`${file}: "${k}" has no Lao text`);
    for (const k of Object.keys(lo)) if (k in en && placeholders(lo[k]!) !== placeholders(en[k]!)) problems.push(`${file}: "${k}" placeholders differ`);
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test.describe('localisation sweep (Phase 9)', () => {
  test.setTimeout(180_000);

  for (const locale of ['en', 'lo'] as const) {
    test(`every page and tab in ${locale === 'en' ? 'English' : 'Lao'} has its text translated`, async ({ page }) => {
      // Sign-in opens in the account's own language; the sweep then visits each page in `locale`.
      await signIn(page, users.admin);
      await expectDashboard(page);
      const problems: string[] = [];
      await sweep(page, locale, problems);
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }

  test('switching language keeps the page and its filters, and is remembered at the next sign-in', async ({ page }) => {
    await signIn(page, users.hr);
    await expectDashboard(page);
    await page.goto('/lo/employees?status=ACTIVE');
    await expect(page.getByRole('heading', { level: 1, name: 'ພະນັກງານ' })).toBeVisible();
    const saved = page.waitForResponse((r) => r.url().endsWith('/auth/me') && r.request().method() === 'PATCH');
    await page.getByRole('group', { name: 'ພາສາ / Language' }).getByRole('button', { name: 'EN' }).click();
    expect((await saved).status()).toBe(200);
    await expect(page).toHaveURL(/\/en\/employees\?status=ACTIVE$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Employees' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // A new sign-in, started from the Lao page, opens in the language saved on the account.
    await page.context().clearCookies();
    await signIn(page, users.hr, undefined, 'lo');
    await expect(page).toHaveURL(/\/en\/dashboard$/);
    // Back to Lao, so the other tests find HR's account as they expect it.
    const back = page.waitForResponse((r) => r.url().endsWith('/auth/me') && r.request().method() === 'PATCH');
    await page.getByRole('group', { name: 'ພາສາ / Language' }).getByRole('button', { name: 'ລາວ' }).click();
    expect((await back).status()).toBe(200);
    await expect(page).toHaveURL(/\/lo\/dashboard$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'lo');
  });
});
