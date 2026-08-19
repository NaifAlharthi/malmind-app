'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { localizedFirstName } from '@/lib/name';
import { useLocale, useT } from '@/lib/i18n/LocaleProvider';
import BrainMessage from '@/components/advisor/BrainMessage';
import { loadBrainContext, composeLocalReply, composeBriefing, isDemoMode, type BrainContext } from '@/lib/brainLocal';

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
  // The local thinking layer's context — the Log, loaded once and cached.
  // undefined = not fetched yet; null = fetched but empty (no months logged).
  const brainCtx = useRef<BrainContext | null | undefined>(undefined);

  async function ensureCtx(): Promise<BrainContext | null> {
    if (brainCtx.current === undefined) brainCtx.current = await loadBrainContext();
    return brainCtx.current;
  }

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

  // The Brain speaks first: with no history, it opens with a reading of
  // the Log — real numbers, a drawn line, pointing chips — composed by
  // the local thinking layer (no model call needed).
  const briefed = useRef(false);
  useEffect(() => {
    if (loadingHistory || briefed.current) return;
    briefed.current = true;
    if (messages.length > 0) return;
    (async () => {
      const ctx = await ensureCtx();
      if (ctx) setMessages((prev) => (prev.some((m) => m.role === 'assistant') ? prev : [{ role: 'assistant', content: composeBriefing(ctx, ar) }, ...prev]));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingHistory]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Live model first (signed-in users with a connected key); the local
    // thinking layer answers whenever the model can't — demo mode, missing
    // key, network failure — through the same rich-message pipeline.
    let reply: string | null = null;
    if (!isDemoMode()) {
      try {
        const res = await fetch('/api/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...messages, userMessage] }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.reply && !String(data.reply).includes('ANTHROPIC_API_KEY')) reply = data.reply;
        }
      } catch { /* fall through to the local layer */ }
    }
    if (!reply) {
      const ctx = await ensureCtx();
      if (ctx) {
        // a breath before answering, so the thinking dots read naturally
        await new Promise((r) => setTimeout(r, 500));
        reply = composeLocalReply(text, ctx, ar);
      }
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: reply ?? t('advisor.error') }]);
    setLoading(false);
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
          {messages.length === 0 && !loadingHistory && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed bg-[var(--surface-0)] text-[var(--ink-2)]">
                {/* the welcome demonstrates both powers: a drawn chart and
                    clickable tool chips — rendered by the same pipeline
                    the Brain's real replies flow through */}
                <BrainMessage
                  content={
                    ar
                      ? 'أهلاً — أنا العقل. أقرأ [سِجلّك](/log) كاملاً، وأستطيع أن أرسم لك الأرقام وأفتح لك الأدوات مباشرة. مثال على رسمي:\n```chart\n{"type":"bar","title":"مثال — دخل مقابل مصروف","data":[{"label":"الدخل","value":10000},{"label":"المصروف","value":8500}]}\n```\nاسألني عن وضعك، أو ابدأ من [اليوم](/today) أو [صندوق الأدوات](/toolbox).'
                      : "Hi — I'm the Brain. I read your whole [Log](/log), and I can draw your numbers and open tools for you directly. A taste of my drawing:\n```chart\n{\"type\":\"bar\",\"title\":\"Example — income vs spending\",\"data\":[{\"label\":\"Income\",\"value\":10000},{\"label\":\"Spending\",\"value\":8500}]}\n```\nAsk me about your situation, or start from [Today](/today) or the [Toolbox](/toolbox)."
                  }
                />
              </div>
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
                {m.role === 'assistant' ? <BrainMessage content={m.content} /> : m.content}
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

        {messages.length <= 1 && (
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
