import { z } from 'zod';
import { ROLES } from '../../shared/constants/enums.js';

const roleEnum = z.enum([ROLES.AUTHOR, ROLES.EDITOR, ROLES.REVIEWER, ROLES.PUBLISHER, ROLES.ADMIN]);
const userIdParams = z.object({ user_id: z.coerce.number().int().positive() });

export const adminSchema = {
  getById: { params: userIdParams },
  deleteById: { params: userIdParams },

  createUser: {
    body: z.object({
      fullName: z.string().trim().min(1).max(100),
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(8, 'Password must be at least 8 characters.'),
      role: roleEnum,
      ssoId: z.string().trim().max(100).optional(),
    }),
  },

  updateUser: {
    params: userIdParams,
    body: z
      .object({
        fullName: z.string().trim().min(1).max(100).optional(),
        email: z.string().trim().toLowerCase().email().optional(),
        ssoId: z.string().trim().max(100).nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .refine((data) => Object.keys(data).length > 0, { message: 'Provide at least one field to update.' }),
  },

  updateRole: {
    params: userIdParams,
    body: z.object({ role: roleEnum }),
  },
};
