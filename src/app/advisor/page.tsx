'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { localizedFirstName } from '@/lib/name';
import { useLocale, useT } from '@/lib/i18n/LocaleProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AdvisorPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();
    if (profile?.name) setName(localizedFirstName(profile.name, ar));

    const { data: history } = await supabase
      .from('advisor_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (history) setMessages(history as Message[]);
    setLoadingHistory(false);
  }, [supabase, router, ar]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // A hub page's prompt bar hands its question over via sessionStorage —
  // send it automatically once history is in.
  useEffect(() => {
    if (loadingHistory) return;
    let handoff: string | null = null;
    try {
      handoff = window.sessionStorage.getItem('mm-ask');
      if (handoff) window.sessionStorage.removeItem('mm-ask');
    } catch {}
    if (handoff) sendMessage(handoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingHistory]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('advisor.error'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    t('advisor.suggest.1'),
    t('advisor.suggest.2'),
    t('advisor.suggest.3'),
  ];

  if (loadingHistory) {
    return <div className="text-sm text-[var(--muted)]">{t('advisor.loadingConversation')}</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        {t('brain.title')} 🧠
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-4">
        {name ? t('advisor.subtitleNamed', { name }) : t('advisor.subtitle')}
      </p>

      <div className="flex-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-sm text-[var(--muted)] italic">
              {t('advisor.empty')}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[var(--green-dark)] text-white rounded-br-sm'
                    : 'bg-[var(--surface-0)] text-[var(--ink-2)] rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--surface-0)] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {messages.length === 0 && (
          <div className="px-5 pb-3 flex gap-2 flex-wrap">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs bg-[var(--surface-card)] border border-[var(--border-default)] rounded-full px-3 py-1.5 hover:border-[var(--green)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-[var(--border-default)] p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder={t('advisor.placeholder')}
            className="flex-1 bg-[var(--surface-0)] border border-[var(--border-default)] rounded-full px-4 py-2 text-sm outline-none focus:border-[var(--green)]"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading}
            className="w-9 h-9 rounded-full bg-[var(--green-dark)] text-white flex items-center justify-center disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
