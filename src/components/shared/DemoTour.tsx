'use client';

// The guest demo's guided tour: a sequential, spotlight-style walkthrough
// of every feature, narrated step by step. Renders only when demo mode is
// active (see lib/demoSupabase.ts). Also patches fetch for the two live-AI
// endpoints so "try it" moments in the demo get a canned, in-character
// reply instead of a 401.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isDemoActive, exitDemo, enterDemo, getActivePersona, DEMO_STEP_KEY, DEMO_DONE_KEY } from '@/lib/demoSupabase';
import { demoAiReply } from '@/lib/demoWorld';
import { useLocale } from '@/lib/i18n/LocaleProvider';

interface TourStep {
  path: string;
  selector: string | null; // null = centered welcome/finale card
  title: string;
  body: string;
}

// Localised first name per persona — the tour narration is templated on it so
// the same script works whoever the guest chose to walk as.
const FIRST_NAME: Record<string, { ar: string; en: string }> = {
  layla: { ar: 'ليلى', en: 'Layla' },
  faisal: { ar: 'فيصل', en: 'Faisal' },
  reem: { ar: 'ريم', en: 'Reem' },
  khalid: { ar: 'خالد', en: 'Khalid' },
};

// A one-line, persona-specific hook for the opening card.
const INTRO: Record<string, { ar: string; en: string }> = {
  layla: {
    ar: 'طالبة حاسب في جامعة الملك سعود، عمرها 20 عاماً، تبني أوّل عاداتها المالية قبل أن يبدأ الدخل الثابت.',
    en: "a 20-year-old computer-science student at King Saud University, building her first money habits before a steady income even starts.",
  },
  faisal: {
    ar: 'محلّل مبتدئ في بنك بالرياض، عمره 24 عاماً، راتبه جيّد لكن لا يبقى منه شيء آخر الشهر.',
    en: "a 24-year-old junior bank analyst in Riyadh on a good salary — with nothing left at the end of the month.",
  },
  reem: {
    ar: 'موظّفة حكومية عمرها 34 عاماً، متزوّجة ولديها طفلان، تغطّي كل شيء لكن لا يتبقّى ما تبني به.',
    en: "a 34-year-old ministry employee, married with two kids, covering everything — with nothing left to build with.",
  },
  khalid: {
    ar: 'صاحب أعمال عمره 48 عاماً بنى ثروته من الصفر، وتحدّيه الآن توظيف الفائض وبناء إرث.',
    en: "a 48-year-old business owner who built his wealth from nothing, now facing the harder problem of deploying surplus and building a legacy.",
  },
};

function getSteps(ar: boolean, persona: string): TourStep[] {
  const L = (a: string, e: string) => (ar ? a : e);
  const first = (FIRST_NAME[persona] ?? FIRST_NAME.faisal)[ar ? 'ar' : 'en'];
  const intro = (INTRO[persona] ?? INTRO.faisal)[ar ? 'ar' : 'en'];
  return [
    {
      path: '/home', selector: null,
      title: L('مرحباً بك في مال مايند 👋', 'Welcome to MalMind 👋'),
      body: L(
        `أنت داخل عرض حيّ — دون حساب، دون حفظ، وكل شيء حقيقي. خلال الدقيقتين القادمتين سترى المال بعينَي ${first}: ${intro} كل ما ستراه محسوب من أرقامها الفعلية. لنتجوّل في عالمها معاً — ويمكنك تبديل الشخصية في أيّ وقت.`,
        `You're inside a live demo — no account, nothing saved, everything real. For the next two minutes you'll see money through the eyes of ${first}: ${intro} Everything you'll see is computed from their actual numbers. Let's walk their world together — and you can switch persona anytime.`
      ),
    },
    {
      path: '/home', selector: '[data-tour="profile-card"]',
      title: L('الأرقام في لمحة', 'The numbers at a glance'),
      body: L(
        `صافي الثروة هنا لم يُكتَب، بل استُنتِج حيّاً من آخر شهر سجّلته ${first}: نقد + استثمارات + عقار، ناقص ما عليها. حين تحدّث ${first} رقماً واحداً في أيّ مكان، تتحدّث معه هذه البطاقة، والعالم ثلاثي الأبعاد، وعشرات الأدوات دفعةً واحدة.`,
        `The net worth here isn't typed in — it's derived live from ${first}'s latest logged month: cash + investments + property, minus what they owe. When ${first} updates a single number anywhere, this card, the 3D world, and a dozen tools downstream all update together.`
      ),
    },
    {
      path: '/home', selector: '[data-tour="views-grid"]',
      title: L('ثلاث نظرات لحياة مالية واحدة', 'Three views of one financial life'),
      body: L(
        `ينظّم مال مايند كل شيء حول الزمن. الماضي يحمل أرشيف ${first} وقصّتها. اليوم يعرض موقعها الحيّ. المستقبل يحمل خططها وإسقاطاتها و«ماذا لو». كل نظرة تفتح بملخّص، وشريط تحادث فيه الدماغ، وصندوق أدوات تفتحه حين تحتاجه فقط.`,
        `MalMind arranges everything around time. The Past holds ${first}'s archive and story. Today shows their live position. The Future carries their plans, projections and what-ifs. Each view opens with a summary, a bar where they talk to the Brain, and a toolbox opened only when needed.`
      ),
    },
    {
      path: '/today', selector: 'main h1',
      title: L('اليوم — الحاضر، ملخَّصاً', 'Today — the present, summarised'),
      body: L(
        `نظرة واحدة: صافي الثروة، النقد، الاستثمارات، الالتزامات، وتدفّق هذا الشهر — محسوبةً حيّاً من أرقام ${first}. تستطيع أن تسأل الدماغ أيّ شيء من الشريط في المنتصف، أو تفتح صندوق الأدوات أدناه لأدوات التحليل في هذه النظرة. لنفتح الأدوات نفسها.`,
        `One glance: net worth, cash, investments, liabilities, and this month's flow — computed live from ${first}'s numbers. Ask the Brain anything from the bar in the middle, or open the toolbox below for the analysis tools that live in this view. Let's open the tools themselves.`
      ),
    },
    {
      path: '/financial-numbers', selector: 'main h1',
      title: L('أرقامي المالية — السِّجلّ', 'My Financial Numbers — the ledger'),
      body: L(
        `قلب مال مايند: صفٌّ لكل شهر — نقد، أسهم، عقار، التزامات، دخل، مصروفات. تسجّل ${first} بضع دقائق شهرياً، أو تزامن جدول Google، وكل ما عداه في المنتج يحسب نفسه من هنا.`,
        `The heart of MalMind: one row per month — cash, stocks, real estate, liabilities, income, expenses. ${first} logs a few minutes a month, or syncs a Google Sheet, and everything else in the product computes itself from here.`
      ),
    },
    {
      path: '/financial-numbers', selector: '[data-tour="fn-charts"]',
      title: L('خطّ زمني يبني نفسه', 'A timeline builds itself'),
      body: L(
        `الأشهر المسجَّلة تصير ثلاثة مخطّطات حيّة: صافي الثروة عبر الزمن، ومزيج الأصول يتراكم طبقةً فوق طبقة، والدخل مقابل الإنفاق كل شهر. هذا سؤال «هل أصبحت أفضل حالاً فعلاً؟» مُجاباً على المرأى.`,
        `The logged months become three living charts: net worth over time, the asset mix stacking up layer by layer, and income vs spending each month. This is the "am I actually getting ahead?" question, answered on sight.`
      ),
    },
    {
      path: '/financial-numbers', selector: '[data-tour="fn-sheet"]',
      title: L('جدول حقيقي، في الاتجاهين', 'A real spreadsheet, both directions'),
      body: L(
        'اضغط أيّ صفّ لتحريره. صدّر كل شيء كـ CSV، أو الصِق أشهراً من أيّ جدول، أو اربط Google Sheets للمزامنة في الاتجاهين. بياناتك ليست محبوسة هنا أبداً — يعمل مال مايند مع عادات الجداول التي لديك أصلاً.',
        'Click any row to edit it. Export the whole thing as CSV, paste months in from any spreadsheet, or connect Google Sheets for two-way sync. Your data is never trapped here — MalMind works with the spreadsheet habits you already have.'
      ),
    },
    {
      path: '/story', selector: 'main h1',
      title: L('قصّتي المالية', 'My Financial Story'),
      body: L(
        `المال سيرة ذاتية. تاريخ ${first} يعيش هنا كفصول — لحظات التحوّل التي شكّلت وضعها اليوم. يقرأ المستشار الذكي هذه القصّة، ولهذا تبدو نصيحته وكأنها تعرفها. لأنها تعرفها فعلاً.`,
        `Money is autobiography. ${first}'s history lives here as chapters — the turning points that shaped where they stand today. The AI advisor reads this story, which is why its advice sounds like it knows them. Because it does.`
      ),
    },
    {
      path: '/lifetime-income', selector: 'main h1',
      title: L('دخل العمر', 'Lifetime Income'),
      body: L(
        `عدستان على سؤال واحد: كل ريال كسبته ${first} يوماً. تبويب «التسجيل» يتتبّع الأشهر الحقيقية؛ وتبويب «الفهم» يُسقط الحياة الكاسبة كلّها ويطرح السؤال الذي يتجنّبه أغلب الناس — من كل ما كسبت، كم احتفظت به، وهل استحقّ الباقي؟`,
        `Two lenses on one question: every riyal ${first} has ever earned. The "Log" tab tracks real months; the "Understand" tab projects a whole earning life and asks the question most people never face — of everything you earned, how much did you keep, and was the rest worth it?`
      ),
    },
    {
      path: '/positioning', selector: 'main h1',
      title: L('المركز المالي', 'Financial Positioning'),
      body: L(
        `أين تقف ${first} فعلاً؟ يُرسَم صافي الثروة حسب العمر مقابل منحنيات توضيحية للمتوسط الوطني والأعلى دخلاً — المنطقة الوردية فرصة فائتة، والخضراء أرض استُعيدت. نظرة ثانية تشخّص أيّ المواقف المالية الأربعة هي فيه، والخطوة الأهمّ من هناك.`,
        `Where does ${first} actually stand? Net worth is plotted by age against illustrative national-average and higher-earner curves — the pink area is opportunity missed, the green is ground regained. A second view diagnoses which of four financial situations they're in, and the single move that matters most from there.`
      ),
    },
    {
      path: '/velocity', selector: 'main h1',
      title: L('سرعة المال', 'Velocity of Money'),
      body: L(
        `الثروة معاد صياغتها كزمن. بوتيرة ادّخار ${first} الحقيقية، يعرض مال مايند كم يبعد كل هدف مالي — بالأشهر لا بالريالات. فعّل رهناً عقارياً وشاهِد كل محطّة تمتدّ: التكلفة الحقيقية لالتزامٍ، مقيسةً بأشهر من عمرك.`,
        `Wealth reframed as time. At ${first}'s real pace of saving, MalMind shows how far away each money milestone is — in months, not riyals. Toggle on a mortgage and watch every milestone stretch: the true cost of a commitment, measured in months of your life.`
      ),
    },
    {
      path: '/doubling-path', selector: 'main h1',
      title: L('مسار المضاعفة', 'The Doubling Path'),
      body: L(
        `يستحيل الشعور بالتراكم كنسبة، فيعرضه مال مايند كلقاءات مع نفسك المستقبلية: بعائد مفترَض، متى تتضاعف محفظة ${first}، ثم تتضاعف ثانيةً، ثم ثالثةً. أوّل المضاعفات تحدث داخل حياة عملية — وهناك ينبغي أن يكون التركيز.`,
        `Compounding is impossible to feel as a percentage, so MalMind shows it as meetings with your future self: at an assumed return, when ${first}'s portfolio doubles, doubles again, and again. The first doublings happen inside a working life — that's where the focus belongs.`
      ),
    },
    {
      path: '/ratios', selector: '[data-tour="ratios-vitals"]',
      title: L('النسب والإحصاءات — العلامات الحيوية', 'Ratios & Stats — vital signs'),
      body: L(
        'اثنتا عشرة قراءة صحّية، كلٌّ مرسومة كما تعني: تغطية صندوق طوارئ، وشريط تقسيم ادّخار، وسقف دَين، وسُلّم صافي ثروة. الأخضر سليم، والكهرماني راقِب. اضغط أيّ بطاقة لتفتح وتُظهر الصيغة الدقيقة والإدخالات الحقيقية وراء الرقم.',
        "Twelve health readings, each drawn as the thing it means: an emergency-fund runway, a savings split bar, a debt ceiling, a net-worth ladder. Green means healthy, amber means watch. Tap any card and it opens up to show the exact formula and the real entries behind the number."
      ),
    },
    {
      path: '/ratios', selector: '[data-tour="ratios-blend"]',
      title: L('المزيج — محلّلك الذكي', 'The Blend — your AI analyst'),
      body: L(
        'نقرة واحدة تسلّم النسب الاثنتي عشرة كلها إلى محلّل ذكيّ يفكّر عبرها مجتمعةً، ثم يبقى للأسئلة المتابِعة. في المنتج الحيّ هذه محادثة حقيقية مدعومة بـClaude حول أرقامك.',
        'One click hands all twelve ratios to an AI analyst that reasons across them together, then stays for follow-up questions. In the live product this is a real Claude-powered conversation about your numbers.'
      ),
    },
    {
      path: '/standard-of-living', selector: 'main h1',
      title: L('مستوى المعيشة', 'Standard of Living'),
      body: L(
        `حياة مصمَّمة في مراحل. تحدّد ${first} مراحلها — كلٌّ بمستوى معيشة مستهدَف، من المتوسط الوطني إلى المرفَّه، مترجَماً إلى واقع سعودي (كيف يبدو السكن والسفر والتعليم فعلاً في كل مستوى). ثم تتتبّع المستوى الذي عاشته كل سنة مقابل الخطة.`,
        `Life, designed in phases. ${first} sets phases — each with a target lifestyle tier, from national average to lavish, translated into real Saudi terms (what housing, travel, and schooling actually look like at each level). Then tracks the tier actually lived each year against the plan.`
      ),
    },
    {
      path: '/goal-fund', selector: 'main h1',
      title: L('صناديق الأهداف', 'Goal Funds'),
      body: L(
        `الادّخار لشيء محدّد يستحقّ مساحته الخاصّة. لدى ${first} صناديق لأهدافها المختلفة — كل صندوق يحصل على متتبّع شهري، ومخطّط مسار للخطة مقابل الواقع، وحالة صادقة: متقدّم، على المسار، أو متأخّر.`,
        `Saving for something specific deserves its own space. ${first} has funds for different goals — each gets a monthly tracker, a trajectory chart of plan vs reality, and an honest status: ahead, on track, or behind.`
      ),
    },
    {
      path: '/year-plan', selector: 'main h1',
      title: L('الخطة السنوية الرئيسية', 'Year Master Plan'),
      body: L(
        `السنة، مقرَّرة سلفاً: رصيد افتتاحي، وهدف نهاية العام، ومعدّل الادّخار وتقسيم الاستثمار اللذان يجسّران بينهما. إنها العقد السنوي الذي تعقده ${first} مع نفسها — وخطّ الأساس الذي تقيس عليه الأدوات الأخرى الانحراف.`,
        `The year, decided in advance: an opening balance, a year-end target, and the save rate and investment split that bridge the two. It's the yearly contract ${first} makes with themselves — and the baseline other tools measure drift against.`
      ),
    },
    {
      path: '/waterfall', selector: 'main h1',
      title: L('شلّال المال', 'Money Waterfall'),
      body: L(
        'الخطة نفسها كتدفّق: الدخل يتدفّق إلى الأساسيّات والادّخار والاستثمارات. حين يبدو الرقم مجرّداً، مشاهدة أين يذهب الماء تجعل المقايضات ملموسة.',
        'The same plan as a flow: income cascading into essentials, savings, and investments. When a number feels abstract, watching where the water goes makes the trade-offs physical.'
      ),
    },
    {
      path: '/budgeting', selector: 'main h1',
      title: L('الميزنة الديناميكية', 'Dynamic Budgeting'),
      body: L(
        'ليس «هل أقدر عليه؟» بل «متى ينبغي أن أشتريه؟» المشتريات تصطفّ في مراحل حسب الأولوية والتوقيت. أن ترغب في الأشياء أمر جيّد؛ وترتيبها هو الثروة.',
        'Not "can I afford it?" but "when should I buy it?" Purchases queue up in phases by priority and timing. Wanting things is fine; sequencing them is wealth.'
      ),
    },
    {
      path: '/holdings', selector: 'main h1',
      title: L('الأصول والالتزامات', 'Assets & Liabilities'),
      body: L(
        `كل ما تملكه ${first} وما عليها، مفصَّلاً — من المدّخرات والاستثمارات إلى العقار والالتزامات. تُغذّي هذه السجلّات نسبها، وصافي ثروتها، والأجسام الواقفة بجانب صورتها الرمزية.`,
        `Everything ${first} owns and owes, itemised — from savings and investments to property and liabilities. These records feed their ratios, their net worth, and the objects standing beside their avatar.`
      ),
    },
    {
      path: '/commitments', selector: 'main h1',
      title: L('الفواتير والالتزامات', 'Bills & Commitments'),
      body: L(
        `الحقيقة المتكرّرة: الاشتراكات، القروض، والبطاقات. يعرف مال مايند تدفّق ${first} الشهري الحقيقي — فتُبنى كل خطة في مكان آخر على الواقع، لا على التفاؤل.`,
        `The recurring truth: subscriptions, loans, and cards. MalMind knows ${first}'s true monthly outflow — so every plan elsewhere is built on reality, not optimism.`
      ),
    },
    {
      path: '/advisor', selector: 'main h1',
      title: L('المستشار الذكي — دائماً في السياق', 'The AI Advisor — always in context'),
      body: L(
        `اسأل أيّ شيء. يعرف المستشار أصلاً دخل ${first}، وفصول قصّتها، ونسبها وأهدافها — مرّر محادثاتها السابقة ولاحظ استشهاده بأرقامها الفعلية. لا يروّج لمنتجات أبداً، ويقول دائماً الجزء الصريح: للاطّلاع فقط، وليس استشارة مالية مرخّصة.`,
        `Ask anything. The advisor already knows ${first}'s income, story chapters, ratios and goals — scroll their past conversations and notice it citing their actual numbers. It never pushes products, and it always says the quiet part: informational, not licensed financial advice.`
      ),
    },
    {
      path: '/home', selector: null,
      title: L('هذا هو مال مايند ✦', "That's MalMind ✦"),
      body: L(
        `أدوات كثيرة، وصورة واحدة مترابطة — حياة مالية يمكنك أن تراها وتسائلها وتصمّمها. كل ما تجوّلت فيه للتوّ عمل على أرقام ${first}. جرّب شخصية أخرى لترى موقفاً مختلفاً تماماً، أو أنشئ حساباً مجّانياً ويبدأ عالمك الخاصّ بالبناء من أول رقم تسجّله.`,
        `Many tools, one connected picture — a financial life you can see, question, and design. Everything you just toured ran on ${first}'s numbers. Try another persona to see a completely different situation, or create a free account and your own world starts building from the very first number you log.`
      ),
    },
  ];
}

const CARD_W = 360;

export default function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [persona, setPersona] = useState('faisal');
  const STEPS = useMemo(() => getSteps(ar, persona), [ar, persona]);
  const personaName = (FIRST_NAME[persona] ?? FIRST_NAME.faisal)[ar ? 'ar' : 'en'];
  const [active, setActive] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const pollRef = useRef<number | null>(null);

  // Activate on mount (localStorage is client-only).
  useEffect(() => {
    if (!isDemoActive()) return;
    setActive(true);
    setPersona(getActivePersona());
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
      if (url.includes('/api/advisor') || url.includes('/api/ratios-synthesis') || url.includes('/api/what-if-analysis')) {
        await new Promise((r) => setTimeout(r, 900));
        return new Response(JSON.stringify({ reply: demoAiReply(getActivePersona()) }), {
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
  }, [STEPS.length]);

  function skip() {
    localStorage.setItem(DEMO_DONE_KEY, '1');
    localStorage.removeItem(DEMO_STEP_KEY);
    setStep(null);
  }

  function restart() {
    enterDemo(getActivePersona()); // same persona, back to step 0
    setStep(0);
    router.push('/home');
  }

  // Back to the landing persona chooser to walk the product as someone else.
  function changePersona() {
    exitDemo();
    window.location.href = '/signup#persona-picker';
  }

  function leaveDemo() {
    exitDemo();
    window.location.href = '/signup';
  }

  if (!active) return null;

  // ── Tour finished / skipped: persistent demo banner ──
  if (step == null || !current) {
    return (
      <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-[90] flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-[#0F2A1E] text-white rounded-2xl sm:rounded-full px-4 sm:pl-5 sm:pr-2 py-2 shadow-xl border border-[#5DCAA5]/40 max-w-[94vw] w-max">
        <span className="text-xs whitespace-nowrap">
          👀 {L('تستكشف بصفة', 'Exploring as')} <strong className="font-semibold">{personaName}</strong> — {L('بيانات تجريبية، دون حفظ', 'demo data, nothing saved')}
        </span>
        <button onClick={restart} className="text-xs text-[#5DCAA5] font-medium whitespace-nowrap hover:underline">
          {L('أعِد الجولة', 'Restart tour')}
        </button>
        <button onClick={changePersona} className="text-xs text-[#5DCAA5] font-medium whitespace-nowrap hover:underline">
          {L('غيّر الشخصية', 'Change persona')}
        </button>
        <button
          onClick={leaveDemo}
          className="text-xs font-semibold bg-[#1D9E75] hover:bg-[#178a65] rounded-full px-4 py-1.5 whitespace-nowrap"
        >
          {L('سجّل — ابنِ عالمك', 'Sign up — build yours')}
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
            {L('جولة مال مايند التعريفية', 'MalMind demo tour')}
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
              {L('→ رجوع', '← Back')}
            </button>
          )}
          {isLast ? (
            <button
              onClick={leaveDemo}
              className="flex-1 text-sm font-semibold bg-[#085041] text-white rounded-lg px-4 py-2 hover:bg-[#063D31]"
            >
              {L('أنشئ حسابي المجّاني ✦', 'Create my free account ✦')}
            </button>
          ) : (
            <button
              onClick={() => go(step + 1)}
              className="flex-1 text-sm font-semibold bg-[#085041] text-white rounded-lg px-4 py-2 hover:bg-[#063D31]"
            >
              {L('التالي ←', 'Next →')}
            </button>
          )}
        </div>
        <div className="flex justify-between items-center mt-3">
          <button onClick={skip} className="text-[11px] text-[#898781] hover:text-[#3D3D3A]">
            {L('تخطَّ الجولة — استكشف بحرّية', 'Skip tour — explore freely')}
          </button>
          <div className="flex items-center gap-3">
            <button onClick={changePersona} className="text-[11px] text-[#898781] hover:text-[#1D9E75]">
              {L('غيّر الشخصية', 'Change persona')}
            </button>
            <button onClick={leaveDemo} className="text-[11px] text-[#898781] hover:text-[#A32D2D]">
              {L('اخرج من العرض', 'Exit demo')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
