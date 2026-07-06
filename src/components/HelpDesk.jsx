import React, { useEffect, useState } from 'react';
import { LifeBuoy, Plus, Send, ArrowLeft, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import {
  TICKET_CATEGORIES,
  fetchTickets,
  fetchTicket,
  createTicket,
  addMessage,
  closeTicket,
} from '../api/tickets';

const STATUS = {
  open: { label: 'Открыт', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  pending: { label: 'В ожидании', cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  closed: { label: 'Закрыт', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function fmtDate(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function StatusChip({ status }) {
  const s = STATUS[status] ?? STATUS.open;
  return (
    <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function HelpDesk() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'new' | 'detail'
  const [active, setActive] = useState(null);

  // New-ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const reload = async () => {
    setLoading(true);
    setTickets(await fetchTickets());
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const openTicket = async (id) => {
    setActive(await fetchTicket(id));
    setView('detail');
  };

  const submitNew = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const t = await createTicket({ subject, category, body });
      setSubject(''); setBody(''); setCategory(TICKET_CATEGORIES[0]);
      await reload();
      setActive(t);
      setView('detail');
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !active) return;
    setSending(true);
    try {
      await addMessage(active.id, reply);
      setReply('');
      setActive(await fetchTicket(active.id));
      reload();
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!active) return;
    await closeTicket(active.id);
    setActive(await fetchTicket(active.id));
    reload();
  };

  const headline = (
    <div className="flex items-center justify-between">
      <div className="border-l-2 border-[#A38D6D] pl-6 py-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">Поддержка</span>
        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2 leading-tight">Центр обращений</h3>
      </div>
      {view === 'list' && (
        <button
          onClick={() => setView('new')}
          className="bg-[#111111] hover:bg-[#A38D6D] text-white px-5 py-2.5 rounded-md text-[9px] uppercase tracking-widest font-bold flex items-center gap-2 cursor-pointer transition-colors"
          id="new-ticket-btn"
        >
          <Plus size={13} /> Новое обращение
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl text-left font-montserrat">
      {headline}

      {/* LIST */}
      {view === 'list' && (
        <div className="bg-white border border-gray-100 rounded-sm shadow-xs">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-[#A38D6D]" /></div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-3">
              <LifeBuoy className="mx-auto text-gray-300" size={32} />
              <p className="text-sm font-serif">У вас пока нет обращений.</p>
              <button onClick={() => setView('new')} className="text-xs text-[#A38D6D] hover:underline font-bold uppercase tracking-wide cursor-pointer">
                Создать первое обращение →
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tickets.map((t) => {
                const last = t.messages[t.messages.length - 1];
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => openTicket(t.id)}
                      className="w-full text-left px-6 py-4 hover:bg-[#FAF8F3]/60 transition-colors flex items-start justify-between gap-4 cursor-pointer"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-[#A38D6D] bg-[#A38D6D]/10 px-2 py-0.5 rounded">{t.category}</span>
                          <StatusChip status={t.status} />
                        </div>
                        <h4 className="font-serif font-bold text-gray-900 truncate">{t.subject}</h4>
                        <p className="text-xs text-gray-500 truncate">{last?.body}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 font-mono">{fmtDate(t.updatedAtUtc)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* NEW */}
      {view === 'new' && (
        <div className="bg-white border border-gray-100 rounded-sm shadow-xs p-6 lg:p-8">
          <button onClick={() => setView('list')} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 mb-6 cursor-pointer">
            <ArrowLeft size={14} /> Назад к обращениям
          </button>
          <form onSubmit={submitNew} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">Тема</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={120}
                  placeholder="Кратко опишите вопрос"
                  className="w-full text-xs p-3 border border-gray-250 rounded-md focus:outline-none focus:border-[#A38D6D]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-250 rounded-md bg-white focus:outline-none focus:border-[#A38D6D]"
                >
                  {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">Сообщение</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Опишите ситуацию подробно…"
                className="w-full text-xs p-3 border border-gray-250 rounded-md focus:outline-none focus:border-[#A38D6D] resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !subject.trim() || !body.trim()}
                className="bg-[#111111] hover:bg-[#A38D6D] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md text-[9px] uppercase tracking-widest font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Отправить обращение</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAIL */}
      {view === 'detail' && active && (
        <div className="bg-white border border-gray-100 rounded-sm shadow-xs">
          <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <button onClick={() => { setView('list'); reload(); }} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer">
                <ArrowLeft size={14} /> Назад
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider font-bold text-[#A38D6D] bg-[#A38D6D]/10 px-2 py-0.5 rounded">{active.category}</span>
                <StatusChip status={active.status} />
              </div>
              <h4 className="font-serif text-lg font-bold text-gray-900">{active.subject}</h4>
            </div>
            {active.status !== 'closed' && (
              <button onClick={handleClose} className="text-[9px] uppercase tracking-widest font-bold text-gray-400 hover:text-rose-600 border border-gray-200 hover:border-rose-300 rounded px-3 py-1.5 cursor-pointer transition-colors shrink-0">
                Закрыть
              </button>
            )}
          </div>

          {/* Thread */}
          <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
            {active.messages.map((m) => {
              const mine = m.author === 'investor';
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${mine ? 'bg-[#111111] text-white' : 'bg-[#FAF8F3] border border-gray-100 text-gray-800'}`}>
                    <div className={`text-[9px] uppercase tracking-wider font-bold mb-1 ${mine ? 'text-white/50' : 'text-[#A38D6D]'}`}>
                      {mine ? 'Вы' : 'Поддержка ATRIA'} · {fmtDate(m.createdAtUtc)}
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply */}
          {active.status === 'closed' ? (
            <div className="p-6 border-t border-gray-100 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <CheckCircle2 size={14} className="text-gray-400" /> Обращение закрыто.
            </div>
          ) : (
            <form onSubmit={sendReply} className="p-4 border-t border-gray-100 flex items-end gap-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Ваш ответ…"
                className="flex-1 text-xs p-3 border border-gray-250 rounded-md focus:outline-none focus:border-[#A38D6D] resize-none"
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="bg-[#111111] hover:bg-[#A38D6D] disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-md cursor-pointer transition-colors"
                aria-label="Отправить"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          )}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <MessageSquare size={12} className="text-[#A38D6D]" />
        Обращения пока хранятся локально в браузере — ответы поддержки появятся после подключения бэкенда.
      </p>
    </div>
  );
}
