export const ROLES = {
  AUTHOR: 'author',
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
  PUBLISHER: 'publisher',
  ADMIN: 'admin',
};

export const CONTENT_ROLES = [ROLES.AUTHOR, ROLES.EDITOR, ROLES.REVIEWER, ROLES.PUBLISHER];

export const ROLE_LABELS = {
  [ROLES.AUTHOR]: 'Author',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.REVIEWER]: 'Reviewer',
  [ROLES.PUBLISHER]: 'Publisher',
  [ROLES.ADMIN]: 'Admin',
};

export function isContentRole(role) {
  return CONTENT_ROLES.includes(role);
}
