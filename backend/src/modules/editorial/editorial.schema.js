import { z } from 'zod';

const documentIdParams = z.object({ document_id: z.coerce.number().int().positive() });

export const editorialSchema = {
  promote: {
    params: documentIdParams,
    body: z.object({
      reviewerIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one reviewer.'),
    }),
  },

  repromote: {
    params: documentIdParams,
    body: z.object({
      editorIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one editor.'),
    }),
  },

  cancel: {
    params: documentIdParams,
  },

  action: {
    params: documentIdParams,
    body: z.object({
      action: z.enum(['APPROVED', 'REJECTED']),
      comments: z.string().trim().max(2000).optional(),
    }),
  },
};
