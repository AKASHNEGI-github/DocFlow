import { z } from 'zod';

export const deletionSchema = {
  request: {
    params: z.object({ document_id: z.coerce.number().int().positive() }),
    body: z.object({
      reason: z.string().trim().min(1, 'A reason is required.').max(2000),
      editorId: z.coerce.number().int().positive(),
      reviewerId: z.coerce.number().int().positive(),
      publisherId: z.coerce.number().int().positive(),
    }),
  },

  cancel: {
    params: z.object({ delete_request_id: z.coerce.number().int().positive() }),
  },

  action: {
    params: z.object({ delete_request_id: z.coerce.number().int().positive() }),
    body: z.object({
      action: z.enum(['APPROVED', 'REJECTED']),
      comments: z.string().trim().max(2000).optional(),
    }),
  },
};
