'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Chapter {
  id: string;
  title: string;
  start_year: number;
  end_year: number;
  note: string;
  vividness: 'sketch' | 'clear';
}

export default function StoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Load this specific user's chapters from the real database on page load.
  const loadChapters = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data, error } = await supabase
      .from('story_chapters')
      .select('*')
      .eq('user_id', user.id)
      .order('start_year', { ascending: true });

    if (!error && data) setChapters(data as Chapter[]);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  async function handleAddChapter() {
    if (!userId) return;
    const lastYear =
      chapters.length > 0 ? chapters[chapters.length - 1].end_year : 2020;

    const { data, error } = await supabase
      .from('story_chapters')
      .insert({
        user_id: userId,
        title: 'New chapter',
        start_year: lastYear,
        end_year: lastYear + 1,
        note: 'Describe what happened here.',
        vividness: 'sketch',
      })
      .select()
      .single();

    if (!error && data) {
      setChapters((prev) => [...prev, data as Chapter]);
      setEditingId(data.id);
    }
  }

  async function handleUpdateChapter(id: string, patch: Partial<Chapter>) {
    // update locally right away so typing feels instant, then persist
    setChapters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
    await supabase.from('story_chapters').update(patch).eq('id', id);
  }

  async function handleDeleteChapter(id: string) {
    setChapters((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('story_chapters').delete().eq('id', id);
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading your story…</div>;
  }

  const minYear = chapters.length > 0 ? chapters[0].start_year : 2020;
  const maxYear =
    chapters.length > 0 ? chapters[chapters.length - 1].end_year : 2026;
  const totalSpan = Math.max(1, maxYear - minYear);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ink)] mb-1">
        My Financial Story
      </h1>
      <p className="text-sm text-[var(--ink-2)] mb-6 max-w-xl">
        This is your real, saved story — stored under your account, feeding
        your positioning chart and your advisor.
      </p>

      {chapters.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-8 text-center mb-6">
          <div className="text-2xl mb-2">📖</div>
          <div className="font-serif text-lg font-medium mb-1">
            Your story is empty so far
          </div>
          <div className="text-sm text-[var(--muted)] mb-4">
            Add your first chapter — even one line is a real start.
          </div>
          <button
            onClick={handleAddChapter}
            className="text-sm text-white bg-[var(--green-dark)] rounded-lg px-4 py-2 font-medium"
          >
            + Add your first chapter
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
            <div className="text-xs text-[var(--muted)] mb-4">
              Tap a chapter below to edit it
            </div>
            <div className="relative h-14 bg-[var(--surface-1)] rounded-full overflow-hidden flex">
              {chapters.map((c) => {
                const widthPct =
                  ((c.end_year - c.start_year) / totalSpan) * 100;
                const isClear = c.vividness === 'clear';
                return (
                  <div
                    key={c.id}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full flex items-center justify-center text-[10px] font-medium text-white cursor-pointer border-r-2 border-white/40 ${
                      isClear ? 'bg-[var(--green)]' : 'bg-[var(--chart-neutral-5)]'
                    }`}
                    onClick={() => setEditingId(c.id)}
                    title={c.title}
                  >
                    <span className="truncate px-1">{c.title}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[var(--muted)] mt-2">
              <span>{minYear}</span>
              <span>{maxYear}</span>
            </div>
          </div>

          <div className="space-y-3">
            {chapters.map((c) => (
              <div
                key={c.id}
                className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4"
              >
                <div
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          c.vividness === 'clear'
                            ? 'bg-[var(--green)]'
                            : 'bg-[var(--chart-neutral-5)]'
                        }`}
                      />
                      <span className="font-medium text-sm text-[var(--ink)]">
                        {c.title}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {c.start_year}–{c.end_year}
                    </div>
                    <div className="text-xs text-[var(--ink-2)] mt-1.5">
                      {c.note}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--muted)]">✎</span>
                </div>

                {editingId === c.id && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-default)] grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-[var(--muted)] block mb-1">
                        Title
                      </label>
                      <input
                        className="w-full text-xs bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5"
                        value={c.title}
                        onChange={(e) =>
                          handleUpdateChapter(c.id, { title: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-[var(--muted)] block mb-1">
                          Start year
                        </label>
                        <input
                          type="number"
                          className="w-full text-xs bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5"
                          value={c.start_year}
                          onChange={(e) =>
                            handleUpdateChapter(c.id, {
                              start_year:
                                parseInt(e.target.value) || c.start_year,
                            })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-[var(--muted)] block mb-1">
                          End year
                        </label>
                        <input
                          type="number"
                          className="w-full text-xs bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5"
                          value={c.end_year}
                          onChange={(e) =>
                            handleUpdateChapter(c.id, {
                              end_year: parseInt(e.target.value) || c.end_year,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-[var(--muted)] block mb-1">
                        What happened
                      </label>
                      <textarea
                        className="w-full text-xs bg-[var(--surface-0)] border border-[var(--border-default)] rounded-md px-2 py-1.5"
                        rows={2}
                        value={c.note}
                        onChange={(e) =>
                          handleUpdateChapter(c.id, {
                            note: e.target.value,
                            vividness: 'clear',
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 text-right">
                      <button
                        onClick={() => handleDeleteChapter(c.id)}
                        className="text-xs text-[var(--red-dark-text)]"
                      >
                        Delete this chapter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAddChapter}
            className="mt-4 text-sm text-[var(--green-dark)] bg-[var(--green-bg)] border border-[var(--green-border)] rounded-lg px-4 py-2 font-medium hover:bg-[var(--green)] hover:text-white transition-colors"
          >
            + Add a chapter
          </button>
        </>
      )}
    </div>
  );
}
