import { z } from 'zod';

export const draftSchema = {
  promote: {
    params: z.object({ document_id: z.coerce.number().int().positive() }),
    body: z.object({
      editorIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one editor.'),
    }),
  },
};
