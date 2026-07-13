'use client';

// The guest demo's guided tour: a sequential, spotlight-style walkthrough
// of every feature, narrated step by step. Renders only when demo mode is
// active (see lib/demoSupabase.ts). Also patches fetch for the two live-AI
// endpoints so "try it" moments in the demo get a canned, in-character
// reply instead of a 401.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isDemoActive, exitDemo, enterDemo, DEMO_STEP_KEY, DEMO_DONE_KEY } from '@/lib/demoSupabase';
import { DEMO_AI_REPLY } from '@/lib/demoWorld';

interface TourStep {
  path: string;
  selector: string | null; // null = centered welcome/finale card
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    path: '/home', selector: null,
    title: 'Welcome to MalMind 👋',
    body: "You're inside a live demo — no account, nothing saved, everything real. For the next two minutes you'll see money through the eyes of Sara, a 29-year-old product manager in Riyadh who's quietly built her first million riyals. Everything you'll see is computed from her actual numbers. Let's walk her world together.",
  },
  {
    path: '/home', selector: '[data-tour="world"]',
    title: 'Her life, in space',
    body: "This is Sara — literally. Her avatar stands on today's square in a 3D timeline that runs to age 100. The cash pile, the briefcase, the buildings beside her? Those are her real balances, rendered as objects. Drag to look around, slide through the years, and watch her financial life become a place you can visit.",
  },
  {
    path: '/home', selector: '[data-tour="profile-card"]',
    title: 'The numbers at a glance',
    body: 'Net worth SAR 1,005,000 — not typed in, but derived live from her latest logged month: cash + investments + apartment, minus what she owes. When Sara updates a single number anywhere, this card, the 3D world, and a dozen tools downstream all update together.',
  },
  {
    path: '/home', selector: '[data-tour="think-grid"]',
    title: 'Think — understand your money',
    body: "Six tools for seeing clearly: everything she's ever earned, how her net worth compares by age, how fast money reaches her goals, when her portfolio doubles, and twelve health ratios. None of them ask her to be a finance person — each one turns a concept into a picture.",
  },
  {
    path: '/home', selector: '[data-tour="decide-grid"]',
    title: 'Decide — design what comes next',
    body: "And six tools for acting: a life designed in phases, a master plan for the year, goal funds for the things that matter, dynamic budgeting, and an AI advisor who knows her whole story. Let's open them one by one.",
  },
  {
    path: '/financial-numbers', selector: 'main h1',
    title: 'My Financial Numbers — the ledger',
    body: "The heart of MalMind: one row per month — cash, stocks, real estate, liabilities, income, expenses. Sara logs five minutes a month, or syncs a Google Sheet, and everything else in the product computes itself from here.",
  },
  {
    path: '/financial-numbers', selector: '[data-tour="fn-charts"]',
    title: 'A timeline builds itself',
    body: 'Eight logged months become three living charts: her net worth climbing past SAR 1M, her asset mix stacking up (that big pink band is the apartment), and income vs spending each month. This is the "am I actually getting richer?" question, answered on sight.',
  },
  {
    path: '/financial-numbers', selector: '[data-tour="fn-sheet"]',
    title: 'A real spreadsheet, both directions',
    body: 'Click any row to edit it. Export the whole thing as CSV, paste months in from any spreadsheet, or connect Google Sheets for two-way sync. Your data is never trapped here — MalMind works with the spreadsheet habits you already have.',
  },
  {
    path: '/story', selector: 'main h1',
    title: 'My Financial Story',
    body: "Money is autobiography. Sara's history lives here as chapters — university, the first job that leaked money, the switch to product, the apartment. The AI advisor reads this story, which is why its advice sounds like it knows her. Because it does.",
  },
  {
    path: '/lifetime-income', selector: 'main h1',
    title: 'Lifetime Income',
    body: 'Two lenses on one question: every riyal Sara has ever earned. The "Log" tab tracks real months; the "Understand" tab projects her whole earning life and asks the question most people never face — of everything you earned, how much did you keep, and was the rest worth it?',
  },
  {
    path: '/positioning', selector: 'main h1',
    title: 'Financial Positioning',
    body: "Where does Sara actually stand? Her net worth is plotted by age against illustrative national-average and higher-earner curves — the pink area is opportunity missed, the green is ground regained. A second view diagnoses which of four financial situations she's in, and the single move that matters most from there.",
  },
  {
    path: '/velocity', selector: 'main h1',
    title: 'Velocity of Money',
    body: "Wealth reframed as time. At Sara's real pace of saving, SAR 100K is about 8 months away; SAR 1M within reach of her plan. Toggle on a mortgage and watch every milestone stretch — the true cost of a commitment, measured in months of your life.",
  },
  {
    path: '/doubling-path', selector: 'main h1',
    title: 'The Doubling Path',
    body: 'Compounding is impossible to feel as a percentage, so MalMind shows it as meetings with your future self: at 8% return, Sara\'s SAR 235K portfolio doubles around age 38, again by 47, again by 56. The first three doublings happen inside a working life — that\'s where the focus belongs.',
  },
  {
    path: '/ratios', selector: '[data-tour="ratios-vitals"]',
    title: 'Ratios & Stats — vital signs',
    body: "Twelve health readings, each drawn as the thing it means: an emergency-fund runway (Sara's covers 7.8 months), a savings split bar, a debt ceiling, a net-worth ladder. Green means healthy, amber means watch. Tap any card and it opens up to show the exact formula and the real entries behind the number.",
  },
  {
    path: '/ratios', selector: '[data-tour="ratios-blend"]',
    title: 'The Blend — your AI analyst',
    body: 'One click hands all twelve ratios to an AI analyst that reasons across them together — strong saving but idle cash, low debt with room to spare — then stays for follow-up questions. In the live product this is a real Claude-powered conversation about your numbers.',
  },
  {
    path: '/standard-of-living', selector: 'main h1',
    title: 'Standard of Living',
    body: "Life, designed in phases. Sara set three: build the base, compound & upgrade, freedom of choice — each with a target lifestyle tier, from national average to lavish, translated into real Saudi terms (what housing, travel, and schooling actually look like at each level). Then she tracks the tier she actually lived each year against the plan.",
  },
  {
    path: '/goal-fund', selector: 'main h1',
    title: 'Goal Funds',
    body: "Saving for something specific deserves its own space. Sara's Hajj fund runs SAR 1,500 a month for two years — the gauge says she's ahead of plan. Every fund gets a monthly tracker, a trajectory chart of plan vs reality, and an honest status: ahead, on track, or behind.",
  },
  {
    path: '/year-plan', selector: 'main h1',
    title: 'Year Master Plan',
    body: "The year, decided in advance: opening balance SAR 800K, target SAR 1.15M, and the save rate and investment split that bridge the two. It's the yearly contract Sara makes with herself — and the baseline other tools measure drift against.",
  },
  {
    path: '/waterfall', selector: 'main h1',
    title: 'Money Waterfall',
    body: 'The same plan as a flow: income cascading into essentials, savings, and investments. When a number feels abstract, watching where the water goes makes the trade-offs physical.',
  },
  {
    path: '/budgeting', selector: 'main h1',
    title: 'Dynamic Budgeting',
    body: 'Not "can I afford it?" but "when should I buy it?" Purchases queue up in phases — the desk setup is bought, the iPhone waits its turn, the living-room refresh after that. Wanting things is fine; sequencing them is wealth.',
  },
  {
    path: '/holdings', selector: 'main h1',
    title: 'Assets & Liabilities',
    body: "Everything Sara owns and owes, itemised: the Tadawul portfolio, the Al Malqa apartment, gold, startup equity — and the loan from her brother she's paying back at SAR 500 a month. These records feed her ratios, her net worth, and the objects standing beside her avatar.",
  },
  {
    path: '/commitments', selector: 'main h1',
    title: 'Bills & Commitments',
    body: 'The recurring truth: subscriptions (yes, all of them), the car loan, the mortgage tail, one credit card at 17% utilisation. MalMind knows her true monthly outflow — so every plan elsewhere is built on reality, not optimism.',
  },
  {
    path: '/advisor', selector: 'main h1',
    title: 'The AI Advisor — always in context',
    body: 'Ask anything. The advisor already knows Sara\'s income, story chapters, ratios and goals — scroll her past conversations and notice it citing her actual numbers. It never pushes products, and it always says the quiet part: informational, not licensed financial advice.',
  },
  {
    path: '/home', selector: null,
    title: "That's MalMind ✦",
    body: "Eighteen tools, one connected picture — a financial life you can see, question, and design. Everything you just toured ran on Sara's numbers. Imagine it running on yours. Create a free account and your own world starts building from the very first number you log.",
  },
];

const CARD_W = 360;

export default function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const pollRef = useRef<number | null>(null);

  // Activate on mount (localStorage is client-only).
  useEffect(() => {
    if (!isDemoActive()) return;
    setActive(true);
    if (localStorage.getItem(DEMO_DONE_KEY) === '1') {
      setStep(null);
    } else {
      const saved = parseInt(localStorage.getItem(DEMO_STEP_KEY) ?? '0');
      setStep(Number.isFinite(saved) ? Math.min(Math.max(saved, 0), STEPS.length - 1) : 0);
    }
  }, []);

  // Patch fetch for the live-AI endpoints while the demo is active.
  useEffect(() => {
    if (!active) return;
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/advisor') || url.includes('/api/ratios-synthesis')) {
        await new Promise((r) => setTimeout(r, 900));
        return new Response(JSON.stringify({ reply: DEMO_AI_REPLY }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return realFetch(input, init);
    };
    return () => {
      window.fetch = realFetch;
    };
  }, [active]);

  const current = step != null ? STEPS[step] : null;

  // Navigate to the step's page, then find + spotlight its target.
  useEffect(() => {
    if (!active || !current) return;
    if (pathname !== current.path) {
      setRect(null);
      router.push(current.path);
      return;
    }
    if (!current.selector) {
      setRect(null);
      return;
    }
    let tries = 0;
    const find = () => {
      const el = document.querySelector(current.selector!);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        // let layout settle after the scroll
        window.setTimeout(() => setRect(el.getBoundingClientRect()), 60);
      } else if (tries++ < 25) {
        pollRef.current = window.setTimeout(find, 200);
      } else {
        setRect(null); // fall back to a centered card
      }
    };
    find();
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [active, current, pathname, router]);

  // Keep the spotlight glued to the target on resize.
  useEffect(() => {
    if (!current?.selector) return;
    const refresh = () => {
      const el = document.querySelector(current.selector!);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', refresh);
    return () => window.removeEventListener('resize', refresh);
  }, [current]);

  const go = useCallback((next: number) => {
    if (next >= STEPS.length) {
      localStorage.setItem(DEMO_DONE_KEY, '1');
      localStorage.removeItem(DEMO_STEP_KEY);
      setStep(null);
      return;
    }
    localStorage.setItem(DEMO_STEP_KEY, String(next));
    setStep(next);
  }, []);

  function skip() {
    localStorage.setItem(DEMO_DONE_KEY, '1');
    localStorage.removeItem(DEMO_STEP_KEY);
    setStep(null);
  }

  function restart() {
    enterDemo();
    setStep(0);
    router.push('/home');
  }

  function leaveDemo() {
    exitDemo();
    window.location.href = '/signup';
  }

  if (!active) return null;

  // ── Tour finished / skipped: persistent demo banner ──
  if (step == null || !current) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 bg-[#0F2A1E] text-white rounded-full pl-5 pr-2 py-2 shadow-xl border border-[#5DCAA5]/40 max-w-[94vw]">
        <span className="text-xs whitespace-nowrap">
          👀 Exploring as <strong className="font-semibold">Sara</strong> — demo data, nothing saved
        </span>
        <button onClick={restart} className="text-xs text-[#5DCAA5] font-medium whitespace-nowrap hover:underline">
          Restart tour
        </button>
        <button
          onClick={leaveDemo}
          className="text-xs font-semibold bg-[#1D9E75] hover:bg-[#178a65] rounded-full px-4 py-1.5 whitespace-nowrap"
        >
          Sign up — build yours
        </button>
      </div>
    );
  }

  // ── Active tour: spotlight + tooltip card ──
  const isLast = step === STEPS.length - 1;
  const centered = !current.selector || !rect || pathname !== current.path;

  let cardStyle: React.CSSProperties;
  if (centered || !rect) {
    cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  } else {
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 250 ? rect.bottom + 14 : Math.max(14, rect.top - 14 - 230);
    const left = Math.min(Math.max(14, rect.left + rect.width / 2 - CARD_W / 2), window.innerWidth - CARD_W - 14);
    cardStyle = { left, top };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* dim everything; the spotlight cutout is drawn with a huge box-shadow */}
      {!centered && rect ? (
        <div
          className="absolute rounded-xl border-2 border-[#5DCAA5] transition-all duration-200 pointer-events-none"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(6, 18, 13, 0.66)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#06120D]/75" />
      )}
      {/* click shield so the page underneath stays inert during the tour */}
      <div className="absolute inset-0" />

      <div
        className="absolute bg-white rounded-2xl shadow-2xl p-5 border border-black/10"
        style={{ width: CARD_W, maxWidth: '94vw', ...cardStyle }}
      >
        {/* progress */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#1D9E75]">
            MalMind demo tour
          </span>
          <span className="text-[10px] text-[#898781] font-medium">{step + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1 bg-[#EFEDE8] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-[#1D9E75] rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <h3 className="font-serif text-lg font-semibold text-[#141414] mb-2">{current.title}</h3>
        <p className="text-[13px] text-[#3D3D3A] leading-relaxed mb-4">{current.body}</p>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={() => go(step - 1)}
              className="text-xs font-medium text-[#3D3D3A] border border-black/15 rounded-lg px-3.5 py-2 hover:bg-[#F5F4F0]"
            >
              ← Back
            </button>
          )}
          {isLast ? (
            <button
              onClick={leaveDemo}
              className="flex-1 text-sm font-semibold bg-[#085041] text-white rounded-lg px-4 py-2 hover:bg-[#063D31]"
            >
              Create my free account ✦
            </button>
          ) : (
            <button
              onClick={() => go(step + 1)}
              className="flex-1 text-sm font-semibold bg-[#085041] text-white rounded-lg px-4 py-2 hover:bg-[#063D31]"
            >
              Next →
            </button>
          )}
        </div>
        <div className="flex justify-between items-center mt-3">
          <button onClick={skip} className="text-[11px] text-[#898781] hover:text-[#3D3D3A]">
            Skip tour — explore freely
          </button>
          <button onClick={leaveDemo} className="text-[11px] text-[#898781] hover:text-[#A32D2D]">
            Exit demo
          </button>
        </div>
      </div>
    </div>
  );
}
