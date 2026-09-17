import { z } from 'zod';

const documentIdParams = z.object({ document_id: z.coerce.number().int().positive() });

export const publicationSchema = {
  repromote: {
    params: documentIdParams,
    body: z.object({
      publisherIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one publisher.'),
    }),
  },

  cancel: {
    params: documentIdParams,
  },

  // Publisher's decision. APPROVED = publish (documents.stage -> LIVE).
  // REJECTED = unpublish (stage stays PUBLICATION - see publication.service.js).
  action: {
    params: documentIdParams,
    body: z.object({
      action: z.enum(['APPROVED', 'REJECTED']),
      comments: z.string().trim().max(2000).optional(),
    }),
  },
};
