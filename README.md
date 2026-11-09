# SYSTORY HRMS web app

Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4 themed with the SYSTORY design system,
shadcn/ui-style components on Radix, next-intl (Lao first, English), TanStack Query, React Hook Form + Zod, Recharts.

## Run it

```bash
# from the repository root, after the backend is set up (backend/README.md)
cp frontend/.env.example frontend/.env.local   # NEXT_PUBLIC_API_URL points at the API
npm install
npm run dev:api        # API on http://localhost:4000
npm run dev:web        # web app on http://localhost:3000 → /lo/login
```

Sign in with the seeded Super Admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `backend/.env`); the app asks for a new
password first.

| Command (in `frontend/`) | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint (next/core-web-vitals) and TypeScript |
| `npm run test:e2e` | Playwright browser tests against the real API (build first). Uses the accounts from `npm run e2e:fixture -w backend` |

First time on a new machine: `npx playwright install chromium`.

## How it is put together

```
src/
  app/[locale]/(auth)/         login, forgot-password, reset-password, change-password (Phase 2 login layout)
  app/[locale]/(dashboard)/    signed-in screens inside the Sidebar + AppHeader shell
    dashboard/                 home screen from GET /dashboard
    account/                   my details, my contact details, language, password, sign out everywhere
    employees/                 list · new · [id] (overview, attendance) · [id]/edit
    departments/, positions/   lists with create/edit/delete dialogs; department manager
    attendance/                check in/out with live clock and this week; team records, corrections, absences, CSV
    leave/                     my balances and requests (with documents), approvals, all requests + CSV, leave types
    payroll/                   periods → one month: items per person, submit → approve → paid, CSV, payslip PDFs
    payslips/                  an employee's own released payslips, breakdown and PDF
    recruitment/               vacancies, applicants (CV upload, status, interviews), hiring into an employee
    performance/               my reviews, reviews to write (scores 1–5, submit), all reviews + review cycles
    reports/                   headcount, attendance, leave and payroll reports with Excel/CSV export
    users/                     accounts (invite or temporary password, reset), roles and their permission matrix
    settings/                  company, working time, policies, public holidays, audit log
    [module]/[[...rest]]/      any unknown address inside the app → the app's own not-found page
  components/ui/               Button, Input, Select, Textarea, Checkbox, FormField, Dialog, ConfirmDialog, Tabs,
                               DataTable (cards on phones), Pagination, SearchInput, PersonCell, StatusBadge, …
  components/layout/           Sidebar, AppHeader, LanguageSwitch, NotificationsMenu, PageHeader, RequirePermission, nav-config
  features/auth/               AuthProvider, RequireAuth, forms, services, permission helpers
  features/dashboard/          dashboard view and its four Recharts charts (charts.tsx)
  features/employees/          list, detail, create/edit form (+ optional invitation), status and delete dialogs, self-edit
  features/organization/       departments and positions
  features/attendance/         my attendance, team records, correction and absence dialogs
  features/leave/              leave tabs, request dialog with upload, approve/reject/cancel, leave types, open year
  features/payroll/            periods, period detail and workflow, per-person items, payslips
  features/recruitment/        vacancies, applicants, applicant dialog, interviews, hire dialog
  features/performance/        review lists, review dialog (scoring, submit, acknowledge), cycles
  features/reports/            one generic report table for every report the API returns
  features/admin/              users, roles, settings, holidays, audit log
  hooks/use-list-params.ts     list filters and page kept in the URL (bookmarkable, Back restores them)
  lib/form-errors.ts           puts API errors (DUPLICATE, VALIDATION_ERROR) on the right form fields
  lib/download.ts              Excel/CSV/PDF downloads through the API client (the token is sent, never put in a URL)
  lib/upload.ts, open-file.ts  uploads (file as the body) and opening protected files in a new tab
  lib/photos.ts                employee photos fetched with the token and shown from a local blob URL
  i18n/                        routing (lo, en), messages/{lo,en}/*.json — typed: a missing key fails the build
  lib/api-client.ts            Axios client: in-memory access token, one shared refresh, error codes
  proxy.ts                     Next 16 proxy (was middleware.ts): locale prefix on every URL
```

### Sessions

- The access token lives **only in memory**. The refresh token is an httpOnly cookie the API sets for `/api/v1/auth`;
  JavaScript never sees it. On load the app calls `POST /auth/refresh` to restore the session.
- On a `401 TOKEN_EXPIRED` the client refreshes once (shared by all requests in flight) and replays the request.
  If the session is gone (signed out elsewhere, password reset, account disabled), every screen returns to sign-in.
- A user with a temporary password only reaches `/change-password` until they choose their own.
- Menus and buttons follow the user's permissions (`features/auth/permissions.ts`), for convenience only:
  the API checks every request. Pages are wrapped in `RequirePermission`, which explains a missing permission
  instead of showing a broken screen. Salary appears only when the API returns it (holders of `payroll:read`).

### Design

- Colours, type scale, radii and shadows come from `src/app/globals.css`, generated from the design system's tokens.
- Noto Sans Lao is self-hosted (`@fontsource/noto-sans-lao`), weights 400–700: no request to Google.
- Dates are DD/MM/YYYY and times 24-hour in Asia/Vientiane; money is `1,284,500 ກີບ` in Lao and `LAK 1,284,500` in English (`lib/format.ts`).

### Charts and printing (Phase 8)

- The dashboard draws four charts with Recharts from `GET /dashboard` (real rows, shaped by the caller's scope): attendance of the
  last 14 working days (stacked by status), head count by employment status, head count by department, and applicants and hires
  for the last 6 months. Every chart has a legend when it has two series or more, a hover tooltip and a **table view** of the same
  numbers (the button on each card), so meaning never depends on colour alone. Bars are drawn at once for people who ask their
  system for reduced motion.
- Reports have a **Print** button. On paper the menu, tabs and filter controls are hidden and the chosen department, period or year
  is written above the table (`print:` classes in `app-shell.tsx`, `app-header.tsx` and `reports-view.tsx`).
- A pending interview can be moved or cancelled from the interviews tab (`PUT` / `DELETE /interviews/{id}`); one with a recorded
  result is kept for the record.
- `tests/e2e/workflow.spec.ts` checks, against the real API, that the dashboard cards and the chart tables agree, that employees get
  no company charts, and that printing hides the controls.
- Settings has a **company logo** (uploaded at once, PNG or JPEG up to 1 MB, shown on PDF payslips) and a **Notifications** tab that
  switches each kind of in-app notification on or off for the whole company (`features/admin/logo-field.tsx`, `settings-view.tsx`).

### Languages (Phase 9)

- Lao is the default; every URL carries its language (`/lo/…`, `/en/…`). The switch in the header keeps the page and its filters
  and saves the choice on the account, so the next sign-in and e-mails use it.
- All text lives in `src/i18n/messages/{lo,en}/*.json`. Types come from the Lao files, so a missing Lao key fails the build;
  `tests/e2e/i18n.spec.ts` checks that both languages have the same keys and `{placeholders}`, then opens every page and tab in
  both languages and fails on a missing message, a raw key on screen, or Lao interface text in English.
- Stored codes (statuses, gender, audit actions) are always shown by name; downloads (Excel, CSV, PDF) are requested in the
  language on screen.
- Lao text uses Noto Sans Lao with line heights of 1.6 or more, so tone marks and vowels above and below are never clipped.

