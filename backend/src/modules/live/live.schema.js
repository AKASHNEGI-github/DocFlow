import { z } from 'zod';

export const liveSchema = {
  upgrade: {
    params: z.object({ document_id: z.coerce.number().int().positive() }),
    body: z.object({
      title: z.string().trim().min(1, 'Title is required.').max(250),
      content: z.string().trim().min(1, 'Content is required.'),
    }),
  },
};
