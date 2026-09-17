import { z } from 'zod';
import { ROLES } from '../../shared/constants/enums.js';

const roleEnum = z.enum([ROLES.AUTHOR, ROLES.EDITOR, ROLES.REVIEWER, ROLES.PUBLISHER, ROLES.ADMIN]);

export const usersSchema = {
  list: {
    query: z.object({
      role: roleEnum.optional(),
    }),
  },

  getById: {
    params: z.object({
      user_id: z.coerce.number().int().positive(),
    }),
  },

  updateMe: {
    body: z
      .object({
        fullName: z.string().trim().min(1).max(100).optional(),
        email: z.string().trim().toLowerCase().email().optional(),
      })
      .refine((data) => data.fullName !== undefined || data.email !== undefined, {
        message: 'Provide at least one field to update.',
      }),
  },

  changePassword: {
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required.'),
      newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    }),
  },
};
