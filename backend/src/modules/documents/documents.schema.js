import { z } from 'zod';

const documentIdParams = z.object({ document_id: z.coerce.number().int().positive() });

export const documentsSchema = {
  create: {
    body: z.object({
      category: z.string().trim().min(1, 'Category is required.').max(100),
      title: z.string().trim().min(1, 'Title is required.').max(250),
      content: z.string().trim().min(1, 'Content is required.'),
    }),
  },

  update: {
    params: documentIdParams,
    body: z
      .object({
        title: z.string().trim().min(1).max(250).optional(),
        content: z.string().trim().min(1).optional(),
      })
      .refine((data) => data.title !== undefined || data.content !== undefined, {
        message: 'Provide at least a title or content to update.',
      }),
  },

  getById: { params: documentIdParams },
  deleteById: { params: documentIdParams },
};
