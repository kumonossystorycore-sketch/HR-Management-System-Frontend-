import { z } from 'zod';

/**
 * Form rules, mirroring the API (Phase 1 password policy: 8+ characters, a letter and a digit).
 * Messages are translation keys in the `validation` namespace.
 */
export const passwordRule = z
  .string()
  .min(8, 'passwordMin')
  .max(128, 'passwordMin')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'passwordMix');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
  password: z.string().min(1, 'required'),
});

export const forgotSchema = z.object({ email: z.string().trim().min(1, 'required').pipe(z.email('email')) });

export const resetSchema = z
  .object({ newPassword: passwordRule, confirmPassword: z.string().min(1, 'required') })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'passwordMatch', path: ['confirmPassword'] });

export const changeSchema = z
  .object({ currentPassword: z.string().min(1, 'required'), newPassword: passwordRule, confirmPassword: z.string().min(1, 'required') })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'passwordMatch', path: ['confirmPassword'] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: 'passwordSame', path: ['newPassword'] });

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
export type ChangeValues = z.infer<typeof changeSchema>;
