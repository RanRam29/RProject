/**
 * Shared Prisma `select` shapes for User model.
 *
 * These constants eliminate duplicated select objects across services.
 * Each shape maps to a specific UI context — use the narrowest shape
 * that satisfies the caller's needs.
 */

/** Presence/activity display — avatarUrl for badges, no email */
export const USER_SELECT_BRIEF = {
  id: true,
  displayName: true,
  avatarUrl: true,
} as const;

/** Task/project/comment contexts — the dominant pattern (30+ sites) */
export const USER_SELECT_STANDARD = {
  id: true,
  displayName: true,
  email: true,
} as const;

/** Comment authors, task history — adds avatarUrl for inline display */
export const USER_SELECT_WITH_AVATAR = {
  id: true,
  displayName: true,
  email: true,
  avatarUrl: true,
} as const;

/** Permission checks — adds systemRole for admin/RBAC decisions */
export const USER_SELECT_WITH_ROLE = {
  id: true,
  displayName: true,
  email: true,
  systemRole: true,
} as const;
