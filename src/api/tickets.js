/**
 * Support / help-desk tickets — investor side.
 *
 * TEMPORARY STORAGE: the backend has no ticket endpoints yet, so this module
 * persists to localStorage. The function signatures match the eventual REST API
 * (all async), so swapping the bodies for `apiFetch` calls later won't touch the
 * UI. Expected backend contract when ready:
 *   GET    /support/tickets            -> Ticket[]
 *   GET    /support/tickets/{id}       -> Ticket
 *   POST   /support/tickets            -> Ticket   (subject, category, body)
 *   POST   /support/tickets/{id}/messages -> Message (body)
 *   POST   /support/tickets/{id}/close -> 204
 */

const KEY = 'atria_support_tickets';

export const TICKET_CATEGORIES = ['KYC', 'Платежи', 'Инвестиции', 'Документы', 'Другое'];

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

/** GET /support/tickets — the investor's tickets, newest activity first. */
export async function fetchTickets() {
  return read().sort((a, b) => new Date(b.updatedAtUtc) - new Date(a.updatedAtUtc));
}

/** GET /support/tickets/{id} */
export async function fetchTicket(id) {
  return read().find((t) => t.id === id) ?? null;
}

/** POST /support/tickets — opens a new ticket with the first investor message. */
export async function createTicket({ subject, category, body }) {
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
}

/** POST /support/tickets/{id}/messages — appends an investor reply. */
export async function addMessage(id, body) {
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
}

/** POST /support/tickets/{id}/close — investor closes their own ticket. */
export async function closeTicket(id) {
  const list = read();
  const ticket = list.find((t) => t.id === id);
  if (!ticket) throw new Error('Тикет не найден.');
  ticket.status = 'closed';
  ticket.updatedAtUtc = new Date().toISOString();
  write(list);
  return ticket;
}
