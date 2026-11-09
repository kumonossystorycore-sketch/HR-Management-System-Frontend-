import type account from './i18n/messages/lo/account.json';
import type attendance from './i18n/messages/lo/attendance.json';
import type auth from './i18n/messages/lo/auth.json';
import type common from './i18n/messages/lo/common.json';
import type dashboard from './i18n/messages/lo/dashboard.json';
import type departments from './i18n/messages/lo/departments.json';
import type employees from './i18n/messages/lo/employees.json';
import type errors from './i18n/messages/lo/errors.json';
import type leave from './i18n/messages/lo/leave.json';
import type nav from './i18n/messages/lo/nav.json';
import type notifications from './i18n/messages/lo/notifications.json';
import type payroll from './i18n/messages/lo/payroll.json';
import type performance from './i18n/messages/lo/performance.json';
import type positions from './i18n/messages/lo/positions.json';
import type recruitment from './i18n/messages/lo/recruitment.json';
import type reports from './i18n/messages/lo/reports.json';
import type settings from './i18n/messages/lo/settings.json';
import type users from './i18n/messages/lo/users.json';
import type validation from './i18n/messages/lo/validation.json';
import type { routing } from './i18n/routing';

/** Typed translations: a missing or misspelled key is a TypeScript error. */
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: {
      account: typeof account;
      attendance: typeof attendance;
      auth: typeof auth;
      common: typeof common;
      dashboard: typeof dashboard;
      departments: typeof departments;
      employees: typeof employees;
      errors: typeof errors;
      leave: typeof leave;
      nav: typeof nav;
      notifications: typeof notifications;
      payroll: typeof payroll;
      performance: typeof performance;
      positions: typeof positions;
      recruitment: typeof recruitment;
      reports: typeof reports;
      settings: typeof settings;
      users: typeof users;
      validation: typeof validation;
    };
  }
}
