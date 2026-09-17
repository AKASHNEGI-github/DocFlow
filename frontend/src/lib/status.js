/**
 * Maps backend enum values to display labels and to the color tokens
 * defined in styles/global.css's @theme block (--color-status-*). Kept
 * as data, not scattered inline, so every list/badge in the app agrees
 * on the same label + color for the same status.
 */
export const STATUS_META = {
  NONE: { label: 'Draft', colorKey: 'none' },
  PENDING: { label: 'Pending', colorKey: 'pending' },
  APPROVED: { label: 'Approved', colorKey: 'approved' },
  REJECTED: { label: 'Rejected', colorKey: 'rejected' },
  CANCELLED: { label: 'Cancelled', colorKey: 'cancelled' },
};

export const STAGE_META = {
  DRAFT: { label: 'Draft' },
  EDITORIAL: { label: 'Editorial' },
  REVIEW: { label: 'Review' },
  PUBLICATION: { label: 'Publication' },
  LIVE: { label: 'Live' },
};

// The pipeline in order, for the stage-tracker component.
export const STAGE_ORDER = ['DRAFT', 'EDITORIAL', 'REVIEW', 'PUBLICATION', 'LIVE'];

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.NONE;
}

export function stageMeta(stage) {
  return STAGE_META[stage] || STAGE_META.DRAFT;
}
