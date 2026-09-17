import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address.');
const password = z.string().min(8, 'Password must be at least 8 characters.');

export const authSchema = {
  register: {
    body: z.object({
      fullName: z.string().trim().min(1, 'Full name is required.').max(100),
      email,
      password,
    }),
  },

  login: {
    body: z.object({
      email,
      password: z.string().min(1, 'Password is required.'),
    }),
  },

  refresh: {
    body: z.object({
      refreshToken: z.string().min(1, 'refreshToken is required.'),
    }),
  },

  logout: {
    body: z.object({
      refreshToken: z.string().min(1, 'refreshToken is required.'),
    }),
  },

  validate: {
    body: z.object({
      accessToken: z.string().min(1, 'accessToken is required.'),
    }),
  },

  forgotPassword: {
    body: z.object({
      email,
    }),
  },

  resetPassword: {
    body: z.object({
      token: z.string().min(1, 'token is required.'),
      newPassword: password,
    }),
  },
};
