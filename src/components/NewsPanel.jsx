import React, { useEffect, useState, useCallback } from 'react';
import {
  Newspaper, Loader2, Building, Globe, ChevronLeft, ChevronRight, X, Calendar, AlertTriangle,
} from 'lucide-react';
import {
  fetchPublications,
  fetchPublication,
  publicationTypeLabel,
  PUBLICATION_TYPES,
} from '../api/publications';
import { fetchNotifications, markNotificationRead } from '../api/notifications';

// Per-type chip styling. Unknown types fall back to the neutral style, so a new
// backend type never breaks the card.
const TYPE_STYLE = {
  financial_report: 'bg-sky-50 text-sky-700 border-sky-200',
  news_release: 'bg-[#A38D6D]/10 text-[#A38D6D] border-[#A38D6D]/25',
  valuation_audit: 'bg-violet-50 text-violet-700 border-violet-200',
  general_news: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PAGE_SIZE = 20;

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function TypeChip({ type }) {
  return (
    <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${TYPE_STYLE[type] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {publicationTypeLabel(type)}
    </span>
  );
}

/**
 * Scope chip. `propertyName` is null for platform-wide posts, so we render an
 * explicit "Платформа" badge rather than leaving a hole in the layout.
 */
function ScopeChip({ propertyName }) {
  const general = !propertyName;
  return (
    <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border bg-gray-50 text-gray-500 border-gray-200 flex items-center gap-1 min-w-0">
      {general ? <Globe size={10} className="shrink-0" /> : <Building size={10} className="shrink-0" />}
      <span className="truncate">{general ? 'Платформа' : propertyName}</span>
    </span>
  );
}

export default function NewsPanel({ properties = [] }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [scope, setScope] = useState('all'); // 'all' | 'general' | <propertyId>
  const [type, setType] = useState('');

  // Detail + notification badge
  const [active, setActive] = useState(null);
  const [unread, setUnread] = useState([]);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPublications({
        page,
        pageSize: PAGE_SIZE,
        type: type || undefined,
        generalOnly: scope === 'general' || undefined,
        propertyId: scope !== 'all' && scope !== 'general' ? scope : undefined,
        signal,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.totalCount);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Не удалось загрузить новости.');
    } finally {
      setLoading(false);
    }
  }, [page, type, scope]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  // Unread publication notifications — the backend raises them on publish.
  const loadNotifications = useCallback(async () => {
    try {
      const all = await fetchNotifications();
      setUnread(all.filter((n) => !n.isRead && n.entityId));
    } catch {
      /* the badge is a nicety — never block the feed on it */
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Reset to page 1 whenever a filter changes.
  const changeScope = (v) => { setScope(v); setPage(1); };
  const changeType = (v) => { setType(v); setPage(1); };

  const openPost = async (post) => {
    setActive(post);
    // Mark any notification pointing at this publication as read.
    const related = unread.filter((n) => n.entityId === post.id);
    if (related.length) {
      await Promise.allSettled(related.map((n) => markNotificationRead(n.id)));
      setUnread((prev) => prev.filter((n) => n.entityId !== post.id));
    }
  };

  // Opening straight from a notification: we only have the publication id.
  const openFromNotification = async (n) => {
    try {
      const post = await fetchPublication(n.entityId);
      await openPost(post);
    } catch {
      setError('Не удалось открыть публикацию.');
    }
  };

  const isNew = (id) => unread.some((n) => n.entityId === id);

  return (
    <div className="space-y-8 max-w-5xl text-left font-montserrat">
      {/* Headline */}
      <div className="flex items-start justify-between gap-4">
        <div className="border-l-2 border-[#A38D6D] pl-6 py-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">Новости и отчёты</span>
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2 leading-tight">Лента публикаций</h3>
        </div>
        {unread.length > 0 && (
          <span className="shrink-0 bg-[#A38D6D] text-white text-[9px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full">
            {unread.length} новых
          </span>
        )}
      </div>

      {/* Unread notifications strip */}
      {unread.length > 0 && (
        <div className="bg-[#FAF8F3] border border-[#A38D6D]/20 rounded-sm p-4 space-y-2">
          <span className="text-[9px] uppercase tracking-widest font-bold text-[#A38D6D]">Новые уведомления</span>
          <ul className="space-y-1">
            {unread.slice(0, 5).map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openFromNotification(n)}
                  className="w-full text-left text-xs text-gray-700 hover:text-[#A38D6D] cursor-pointer flex items-center justify-between gap-3 py-1"
                >
                  <span className="truncate">{n.title || 'Новая публикация'}</span>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">{fmtDate(n.createdAtUtc)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={scope}
          onChange={(e) => changeScope(e.target.value)}
          className="text-xs p-2.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#A38D6D] cursor-pointer"
        >
          <option value="all">Все публикации</option>
          <option value="general">Только общие (платформа)</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => changeType(e.target.value)}
          className="text-xs p-2.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:border-[#A38D6D] cursor-pointer"
        >
          <option value="">Все типы</option>
          {Object.entries(PUBLICATION_TYPES).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>

        {!loading && !error && (
          <span className="text-[10px] text-gray-400 font-mono ml-auto">
            {totalCount} {totalCount === 1 ? 'публикация' : 'публикаций'}
          </span>
        )}
      </div>

      {/* Feed */}
      <div className="bg-white border border-gray-100 rounded-sm shadow-xs">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-[#A38D6D]" /></div>
        ) : error ? (
          <div className="py-16 text-center space-y-2">
            <AlertTriangle className="mx-auto text-rose-500" size={26} />
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-gray-400 space-y-3">
            <Newspaper className="mx-auto text-gray-300" size={32} />
            <p className="text-sm font-serif">Публикаций пока нет.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => openPost(p)}
                  className="w-full text-left px-6 py-5 hover:bg-[#FAF8F3]/60 transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeChip type={p.type} />
                    <ScopeChip propertyName={p.propertyName} />
                    {isNew(p.id) && (
                      <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#A38D6D] text-white">
                        Новое
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-mono ml-auto shrink-0">{fmtDate(p.publishedAtUtc)}</span>
                  </div>
                  <h4 className="font-serif text-base font-bold text-gray-900">{p.title}</h4>
                  {/* line-clamp keeps the preview to 2 lines; full text is in the detail view */}
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 whitespace-pre-line">{p.body}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-[#A38D6D] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft size={14} /> Назад
          </button>
          <span className="text-xs text-gray-400 font-mono">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-[#A38D6D] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Вперёд <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Detail */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setActive(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-white border border-gray-100 rounded-sm shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <TypeChip type={active.type} />
                  <ScopeChip propertyName={active.propertyName} />
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="shrink-0 text-gray-400 hover:text-gray-900 cursor-pointer"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900">{active.title}</h3>
              <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                <Calendar size={11} className="text-[#A38D6D]" /> {fmtDate(active.publishedAtUtc)}
              </p>
            </div>

            {/* whitespace-pre-line preserves the plain-text line breaks from the backend */}
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{active.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
