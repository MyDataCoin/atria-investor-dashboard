/**
 * Support / help-desk tickets — investor side.
 *
 * This module targets the SHARED backend contract so investor tickets and the
 * separate admin panel meet server-side (see docs/support-tickets-api.md). Both
 * apps hit the same `/support/*` endpoints; the JWT role decides scope (an
 * investor sees only their own tickets, an admin sees all) and message author.
 *
 *   GET    /support/tickets               -> Ticket[]   (role-scoped)
 *   GET    /support/tickets/{id}          -> Ticket
 *   POST   /support/tickets               -> Ticket      { subject, category, body }
 *   POST   /support/tickets/{id}/messages -> Message      { body }
 *   POST   /support/tickets/{id}/close    -> 204
 *
 * The backend endpoints are LIVE, so this module talks to them by default and
 * every ticket is shared with the admin panel. The old browser-local behaviour
 * remains only as an escape hatch: set `VITE_TICKETS_API=0` to force it (e.g. for
 * offline demos). localStorage tickets are per-browser and never reach an admin.
 */
import { apiFetch } from './client';

const flag = import.meta.env.VITE_TICKETS_API;
const USE_API = flag !== '0' && flag !== 'false';

export const TICKET_CATEGORIES = ['Платежи', 'Инвестиции', 'Документы', 'Другое'];

/** Normalize a backend Ticket DTO into the shape the UI already consumes. */
function mapTicketDto(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    subject: dto.subject ?? '',
    category: dto.category ?? TICKET_CATEGORIES[TICKET_CATEGORIES.length - 1],
    status: dto.status ?? 'open',
    createdAtUtc: dto.createdAtUtc,
    updatedAtUtc: dto.updatedAtUtc,
    messages: (dto.messages ?? []).map(mapMessageDto),
  };
}

/** Normalize a backend Message DTO. `author` is 'investor' | 'support'. */
function mapMessageDto(dto) {
  return {
    id: dto.id,
    author: dto.author === 'support' || dto.author === 'admin' ? 'support' : 'investor',
    body: dto.body ?? '',
    createdAtUtc: dto.createdAtUtc,
  };
}

/* ---------------------------------------------------------------------------
 * Real backend (VITE_TICKETS_API=1) — investor and admin share these routes.
 * ------------------------------------------------------------------------- */

const api = {
  async fetchTickets({ signal } = {}) {
    const dtos = await apiFetch('/support/tickets', { signal });
    return (dtos ?? [])
      .map(mapTicketDto)
      .sort((a, b) => new Date(b.updatedAtUtc) - new Date(a.updatedAtUtc));
  },
  async fetchTicket(id, { signal } = {}) {
    return mapTicketDto(await apiFetch(`/support/tickets/${id}`, { signal }));
  },
  async createTicket({ subject, category, body }) {
    const dto = await apiFetch('/support/tickets', {
      method: 'POST',
      body: { subject: subject.trim(), category, body: body.trim() },
    });
    return mapTicketDto(dto);
  },
  async addMessage(id, body) {
    const dto = await apiFetch(`/support/tickets/${id}/messages`, {
      method: 'POST',
      body: { body: body.trim() },
    });
    return mapMessageDto(dto);
  },
  async closeTicket(id) {
    await apiFetch(`/support/tickets/${id}/close`, { method: 'POST' });
    return api.fetchTicket(id);
  },
};

/* ---------------------------------------------------------------------------
 * Local fallback — browser-only, per-device. Used until the backend is live.
 * These tickets are NOT visible to admins by design (localStorage can't be).
 * ------------------------------------------------------------------------- */

const KEY = 'atria_support_tickets';

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

const local = {
  async fetchTickets() {
    return read().sort((a, b) => new Date(b.updatedAtUtc) - new Date(a.updatedAtUtc));
  },
  async fetchTicket(id) {
    return read().find((t) => t.id === id) ?? null;
  },
  async createTicket({ subject, category, body }) {
    const now = new Date().toISOString();
    const ticket = {
      id: uid(),
      subject: subject.trim(),
      category,
      status: 'open',
      createdAtUtc: now,
      updatedAtUtc: now,
      messages: [{ id: uid(), author: 'investor', body: body.trim(), createdAtUtc: now }],
    };
    const list = read();
    list.unshift(ticket);
    write(list);
    return ticket;
  },
  async addMessage(id, body) {
    const list = read();
    const ticket = list.find((t) => t.id === id);
    if (!ticket) throw new Error('Тикет не найден.');
    const now = new Date().toISOString();
    const message = { id: uid(), author: 'investor', body: body.trim(), createdAtUtc: now };
    ticket.messages.push(message);
    ticket.updatedAtUtc = now;
    ticket.status = 'open';
    write(list);
    return message;
  },
  async closeTicket(id) {
    const list = read();
    const ticket = list.find((t) => t.id === id);
    if (!ticket) throw new Error('Тикет не найден.');
    ticket.status = 'closed';
    ticket.updatedAtUtc = new Date().toISOString();
    write(list);
    return ticket;
  },
};

/* Pick the backend once, at module load. */
const backend = USE_API ? api : local;

/** True when tickets are shared with admins through the live backend. */
export const ticketsConnected = USE_API;

/** GET /support/tickets — the investor's tickets, newest activity first. */
export const fetchTickets = (...args) => backend.fetchTickets(...args);
/** GET /support/tickets/{id} */
export const fetchTicket = (...args) => backend.fetchTicket(...args);
/** POST /support/tickets — opens a new ticket with the first investor message. */
export const createTicket = (...args) => backend.createTicket(...args);
/** POST /support/tickets/{id}/messages — appends an investor reply. */
export const addMessage = (...args) => backend.addMessage(...args);
/** POST /support/tickets/{id}/close — investor closes their own ticket. */
export const closeTicket = (...args) => backend.closeTicket(...args);
