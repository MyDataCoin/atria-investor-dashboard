/**
 * Notifications for the current user.
 *
 * The backend raises a notification itself whenever something is published — the
 * app never sends one. For a publication notification, `entityId` is the
 * publication's id, so the feed can open that post directly.
 *
 *   GET  /notifications/me       -> Notification[]  (newest first)
 *   POST /notifications/{id}/read -> 204
 */
import { apiFetch } from './client';

function mapNotification(dto) {
  return {
    id: dto.id,
    template: dto.template ?? null,
    title: dto.title ?? '',
    body: dto.body ?? '',
    isRead: !!dto.isRead,
    createdAtUtc: dto.createdAtUtc ?? null,
    // For publication notifications this is the publication id; null otherwise.
    entityId: dto.entityId ?? null,
  };
}

/** GET /notifications/me — every notification for the caller. */
export async function fetchNotifications({ signal } = {}) {
  const dtos = await apiFetch('/notifications/me', { signal });
  return (dtos ?? []).map(mapNotification);
}

/** POST /notifications/{id}/read — marks one notification read. */
export async function markNotificationRead(id) {
  await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}
