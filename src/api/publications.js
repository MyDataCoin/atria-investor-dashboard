/**
 * Publications — the investor news feed.
 *
 * Same route as the admin panel; the backend scopes by role, so an investor only
 * ever sees published items. The feed is a shared showcase: every published item
 * is visible to every investor, NOT filtered by portfolio. A personal feed
 * (/publications/me) is a separate backend task, agreed for later.
 *
 *   GET /publications        -> { items, page, pageSize, totalCount, totalPages }
 *   GET /publications/{id}   -> Publication
 *
 * Query filters: propertyId, generalOnly, type, page, pageSize (default 20, max 100).
 * Newest first. `propertyId` / `propertyName` may be null — that's a platform-wide
 * post not tied to any object, so the UI must render without them.
 * `attachments` is always [] for now; the field is reserved so the contract holds
 * when PDFs land.
 */
import { apiFetch } from './client';

/** Publication types the backend emits, with their Russian labels. */
export const PUBLICATION_TYPES = {
  financial_report: 'Финансовый отчёт',
  news_release: 'Новость',
  valuation_audit: 'Оценка и аудит',
  general_news: 'Новости платформы',
};

/** Human label for a type, tolerant of an unknown value from a newer backend. */
export function publicationTypeLabel(type) {
  return PUBLICATION_TYPES[type] ?? 'Публикация';
}

function mapPublication(dto) {
  return {
    id: dto.id,
    type: dto.type ?? 'general_news',
    title: dto.title ?? '',
    body: dto.body ?? '',
    // null => platform-wide post, not tied to a property.
    propertyId: dto.propertyId ?? null,
    propertyName: dto.propertyName ?? null,
    publishedAtUtc: dto.publishedAtUtc ?? dto.createdAtUtc ?? null,
    attachments: dto.attachments ?? [],
  };
}

/**
 * GET /publications — one page of the feed, newest first.
 *
 * @param {object} [opts]
 * @param {string} [opts.propertyId]   only posts about this object
 * @param {boolean} [opts.generalOnly] only platform-wide posts (no object)
 * @param {string} [opts.type]         one of PUBLICATION_TYPES' keys
 * @param {number} [opts.page]         1-based, default 1
 * @param {number} [opts.pageSize]     default 20, max 100
 * @returns {Promise<{items: object[], page: number, pageSize: number, totalCount: number, totalPages: number}>}
 */
export async function fetchPublications({ propertyId, generalOnly, type, page = 1, pageSize = 20, signal } = {}) {
  const qs = new URLSearchParams();
  if (propertyId) qs.set('propertyId', propertyId);
  if (generalOnly) qs.set('generalOnly', 'true');
  if (type) qs.set('type', type);
  qs.set('page', String(page));
  qs.set('pageSize', String(Math.min(pageSize, 100)));

  const dto = await apiFetch(`/publications?${qs}`, { signal });
  return {
    items: (dto?.items ?? []).map(mapPublication),
    page: dto?.page ?? page,
    pageSize: dto?.pageSize ?? pageSize,
    totalCount: dto?.totalCount ?? 0,
    totalPages: dto?.totalPages ?? 0,
  };
}

/** GET /publications/{id} — one post (used when opening from a notification). */
export async function fetchPublication(id, { signal } = {}) {
  return mapPublication(await apiFetch(`/publications/${id}`, { signal }));
}
