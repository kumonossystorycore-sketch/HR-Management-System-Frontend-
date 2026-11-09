# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

HR and administrators manage workforce records and HR operations. Department managers handle department-scoped workflows, including leave approvals and performance reviews. Employees use self-service for their account, attendance, leave requests, and released payslips.

## Product Purpose

SYSTORY HRMS brings HR and employee self-service workflows into one web application for HR/administrators, department managers, and employees. Measurable success criteria have not yet been established.

## Positioning

The product's distinctive market position has not been established. Do not claim a unique advantage, customer outcome, or regulatory compliance until confirmed.

## Operating Context

- Access is scoped by role and permission to the user's own records, department, or company-wide records. The API enforces authorization; frontend visibility rules are not a security boundary.
- Core workflows cover workforce and organization records, recruitment and hiring, attendance, leave, payroll and payslips, performance reviews, reports, and company administration.
- The application supports Lao and English, with Lao as the default. Locale is represented in URLs and language-specific downloads.
- Display conventions use LAK and Asia/Vientiane time; dates are DD/MM/YYYY and times use a 24-hour clock.

## Capabilities and Constraints

- Employee self-service includes profile/contact details, attendance check-in/out, leave balances and requests, performance review acknowledgement, and released payslips.
- Administrative workflows include employee and organization management, recruitment, leave approvals, payroll preparation/approval/payment, performance cycles, reports, user roles and permissions, policies, holidays, notifications, and audit logs.
- Salary and other sensitive records are permission-scoped. The backend is authoritative for access checks.
- The existing implementation is a Next.js/React/TypeScript frontend backed by an Express/TypeScript API and MySQL/Prisma. The repository uses npm workspaces.
- Target organization size and market, applicable HR/legal requirements, unique positioning, and measurable success criteria remain open decisions. Do not imply legal or payroll compliance that has not been confirmed.

## Brand Commitments

- Product name: SYSTORY HRMS.
- The current product supports Lao and English, with Lao as the default.

## Evidence on Hand

- Product workflows and setup: `frontend/README.md` and `backend/README.md`.
- API contract: `backend/docs/openapi.json` and `backend/docs/postman_collection.json`.
- Locale content: `frontend/src/i18n/messages/lo/` and `frontend/src/i18n/messages/en/`.
- Existing logo asset: `frontend/public/logo/systory-logo.png`.
- No customer testimonials, case studies, adoption metrics, or third-party compliance evidence were provided. Do not fabricate them.

## Product Principles

- Enforce access according to role and record scope, especially for salary and other sensitive data.
- Connect HR administration workflows with useful employee self-service.
- Support Lao and English as first-class product languages, including localized downloads.
- Keep HR decisions and changes traceable through the product's audit and approval workflows.