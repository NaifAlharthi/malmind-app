// src/lib/brainGuide.ts
// The Brain's tour-guide brain: what it says about every page. Each entry is
// written to a fixed standard — one sentence naming what the user is looking
// at and the job it was built to do, then "walk out able to say", a concrete
// example of the OPINION this tool should let them form. Points are elements
// the Brain can physically jump to and spotlight.
//
// Modes (persisted): 'auto' — narrate on every page · 'manual' — only when
// asked · 'off' — muted entirely (recoverable from the Brain's panel).
// The DEFAULT is 'manual': the bubble never opens itself on page arrival
// and never covers content — auto-narration is an explicit opt-in (founder
// decree, 2026-08-17).

export interface L10n { ar: string; en: string }

export interface GuidePoint {
  selector: string;   // CSS selector the Brain jumps to and points at
  label: L10n;        // chip label in the bubble
  text: L10n;         // what the Brain says while pointing
}

export interface GuideEntry {
  what: L10n;     // "You're looking at X — built to help you understand Y."
  opinion: L10n;  // "Walk out able to say: '…'" — a formed, quantified opinion
  points?: GuidePoint[];
}

export type GuideMode = 'auto' | 'manual' | 'off';
export const GUIDE_MODE_KEY = 'mm-brain-guide';

export function getGuideMode(): GuideMode {
  if (typeof window === 'undefined') return 'manual';
  try {
    const v = window.localStorage.getItem(GUIDE_MODE_KEY);
    return v === 'auto' || v === 'off' ? v : 'manual';
  } catch { return 'manual'; }
}
export function setGuideMode(m: GuideMode) {
  try { window.localStorage.setItem(GUIDE_MODE_KEY, m); } catch { /* ignore */ }
}

const GUIDE: Record<string, GuideEntry> = {
  '/home': {
    what: {
      en: "This is your base camp — every tool MalMind has, arranged around the four problems it exists to solve, with your live numbers on top.",
      ar: 'هذه قاعدتك — كل أدوات مال مايند مرتّبةً حول المشكلات الأربع التي وُجد لحلّها، وأرقامك الحيّة في الأعلى.',
    },
    opinion: {
      en: "Walk out able to say: “I know exactly which of my four money problems is the weakest — and which tool works on it.”",
      ar: 'اخرج قادراً على قول: «أعرف تماماً أيّ مشكلاتي المالية الأربع هي الأضعف — وأيّ أداة تعالجها».',
    },
    points: [
      {
        selector: '[data-tour="profile-card"]',
        label: { en: 'Your live numbers', ar: 'أرقامك الحيّة' },
        text: {
          en: 'Nothing here is typed in — net worth, cash, and flow are all derived live from your latest logged month. Change one number anywhere and this card follows.',
          ar: 'لا شيء هنا مكتوب يدوياً — صافي الثروة والنقد والتدفّق كلّها تُحسب حيّاً من آخر شهر سجّلته. غيّر رقماً واحداً في أي مكان وستتبعه هذه البطاقة.',
        },
      },
      {
        selector: '[data-tour="views-grid"]',
        label: { en: 'The three time views', ar: 'نظرات الزمن الثلاث' },
        text: {
          en: 'The whole product hangs on time: the Past holds your records, Today your live position, the Future your plans and what-ifs. Everything else is a tool inside one of these three.',
          ar: 'المنتج كلّه معلّق على الزمن: الماضي يحمل سجلّاتك، واليوم موقفك الحيّ، والمستقبل خططك و«ماذا لو». كل ما عدا ذلك أداة داخل إحدى هذه الثلاث.',
        },
      },
    ],
  },
  '/past': {
    what: {
      en: "This is the Past — your financial archive: the story you lived, the months you logged, and every riyal you've earned, kept in one place so patterns become visible.",
      ar: 'هذا هو الماضي — أرشيفك المالي: القصة التي عشتها، والأشهر التي سجّلتها، وكل ريال كسبته، في مكان واحد لتظهر الأنماط.',
    },
    opinion: {
      en: "Walk out able to say: “My net worth compounded 18% a year for three years — and the dip in 2023 was the car, not my habits.”",
      ar: 'اخرج قادراً على قول: «صافي ثروتي نما 18% سنوياً لثلاث سنوات — وهبطة 2023 كانت السيارة لا عاداتي».',
    },
  },
  '/today': {
    what: {
      en: "This is Today — your entire financial present computed live: net worth, this month's flow, where you stand, your risks, and what your standard of living actually costs per day.",
      ar: 'هذا هو اليوم — حاضرك المالي كاملاً محسوباً حيّاً: صافي الثروة، وتدفّق هذا الشهر، وأين تقف، ومخاطرك، وما يكلّفه مستوى معيشتك فعلاً في اليوم.',
    },
    opinion: {
      en: "Walk out able to say: “I keep SAR 4,000 of every month, my runway is 7 months, and idle cash is my weakest vital sign.”",
      ar: 'اخرج قادراً على قول: «يبقى معي 4,000 ريال كل شهر، وأماني 7 أشهر، والنقد الخامل أضعف مؤشراتي».',
    },
  },
  '/future': {
    what: {
      en: 'This is the Future — where you stop reacting and start designing: freedom number, life phases, goals, budgets, and sandboxes for decisions you have not made yet.',
      ar: 'هذا هو المستقبل — حيث تتوقف عن ردّ الفعل وتبدأ التصميم: رقم حرّيتك، ومراحل حياتك، وأهدافك، وميزانياتك، ومختبرات لقرارات لم تتخذها بعد.',
    },
    opinion: {
      en: "Walk out able to say: “My plan says financial freedom at 52 — and buying the villa in 2028 moves it to 55. I accept that trade.”",
      ar: 'اخرج قادراً على قول: «خطتي تقول الحرّية المالية في سن 52 — وشراء الفيلا في 2028 يؤجلها إلى 55. أقبل هذه المقايضة».',
    },
  },
  '/story': {
    what: {
      en: 'This is your Financial Story — money as autobiography, in chapters. The AI advisor reads it, which is why its advice sounds like it knows you: it does.',
      ar: 'هذه قصتك المالية — المال سيرةً ذاتية، في فصول. المستشار الذكي يقرأها، ولهذا تبدو نصيحته وكأنها تعرفك: لأنها تعرفك فعلاً.',
    },
    opinion: {
      en: "Walk out able to say: “Every financial turn I took had a reason — and the next chapter is the first one I'm writing on purpose.”",
      ar: 'اخرج قادراً على قول: «كل منعطف مالي مررت به كان له سبب — والفصل القادم أول فصل أكتبه عمداً».',
    },
  },
  '/financial-numbers': {
    what: {
      en: 'This is the ledger — the heart the whole product beats from. One row per month: cash, investments, property, debts, income, spending. Five minutes of logging; everything else computes itself.',
      ar: 'هذا هو السِّجل — القلب الذي ينبض منه المنتج كله. صف لكل شهر: نقد، استثمارات، عقار، ديون، دخل، إنفاق. خمس دقائق تسجيلاً؛ وكل ما عداه يحسب نفسه.',
    },
    opinion: {
      en: "Walk out able to say: “I am actually getting richer — SAR 3,100 a month on average — and I can see exactly which asset is doing the work.”",
      ar: 'اخرج قادراً على قول: «أنا أزداد ثراءً فعلاً — 3,100 ريال شهرياً وسطياً — وأرى بالضبط أيّ أصل يقوم بالعمل».',
    },
    points: [
      {
        selector: '[data-tour="fn-charts"]',
        label: { en: 'The living charts', ar: 'المخططات الحيّة' },
        text: {
          en: 'Your logged months become three charts: net worth climbing, the asset mix stacking, income vs spending. This is “am I getting ahead?” answered on sight.',
          ar: 'أشهرك المسجّلة تصير ثلاثة مخططات: صافي الثروة يتسلّق، ومزيج الأصول يتراكم، والدخل مقابل الإنفاق. هذا سؤال «هل أتقدّم؟» مجاباً بنظرة.',
        },
      },
      {
        selector: '[data-tour="fn-sheet"]',
        label: { en: 'A real spreadsheet', ar: 'جدول حقيقي' },
        text: {
          en: 'Click any row to edit. Export CSV, paste months in, or two-way sync Google Sheets — your data is never trapped here.',
          ar: 'اضغط أي صف لتحريره. صدّر CSV، أو الصق أشهراً، أو زامن Google Sheets في الاتجاهين — بياناتك ليست حبيسة هنا أبداً.',
        },
      },
    ],
  },
  '/lifetime-income': {
    what: {
      en: 'This is Lifetime Income — every riyal you have ever earned and ever will, on one axis. Most people never face this number; you are looking at it.',
      ar: 'هذا دخل العمر — كل ريال كسبته وستكسبه يوماً، على محور واحد. أغلب الناس لا يواجهون هذا الرقم أبداً؛ أنت تنظر إليه الآن.',
    },
    opinion: {
      en: "Walk out able to say: “I will earn about SAR 14M in my career — and at my current save rate I keep 11% of it. That number is my real project.”",
      ar: 'اخرج قادراً على قول: «سأكسب نحو 14 مليون ريال في مسيرتي — وبمعدل ادخاري الحالي أحتفظ بـ 11% منها. هذا الرقم هو مشروعي الحقيقي».',
    },
  },
  '/positioning': {
    what: {
      en: 'This is Financial Positioning — your net worth plotted by age against national-average and higher-earner curves, then a diagnosis of which of four financial situations you are in.',
      ar: 'هذا هو المركز المالي — صافي ثروتك حسب العمر مقابل منحنيات المتوسط الوطني والأعلى دخلاً، ثم تشخيص لأيٍّ من المواقف المالية الأربعة أنت فيه.',
    },
    opinion: {
      en: "Walk out able to say: “I'm ahead of the average for 34 but behind my earning bracket — and the single move that matters most is deploying my idle cash.”",
      ar: 'اخرج قادراً على قول: «أنا متقدم على متوسط عمر 34 لكن خلف شريحة دخلي — والخطوة الأهم توظيف نقدي الخامل».',
    },
  },
  '/velocity': {
    what: {
      en: 'This is Velocity of Money — wealth reframed as time. At your real monthly surplus, every milestone sits a measurable number of months away; every commitment stretches them.',
      ar: 'هذه سرعة المال — الثروة معاد صياغتها زمناً. بفائضك الشهري الحقيقي، كل محطة تبعد عدداً قابلاً للقياس من الأشهر؛ وكل التزام يمدّدها.',
    },
    opinion: {
      en: "Walk out able to say: “SAR 100K is 14 months away at my pace — and the mortgage I'm considering would make it 23. Now I can price that decision in months of my life.”",
      ar: 'اخرج قادراً على قول: «مئة ألف ريال تبعد 14 شهراً بوتيرتي — والرهن الذي أفكر فيه يجعلها 23. الآن أُسعّر القرار بأشهر من عمري».',
    },
  },
  '/doubling-path': {
    what: {
      en: 'This is the Doubling Path — compounding made physical: the ages at which your portfolio doubles, doubles again, and again. The first three doublings happen inside a working life.',
      ar: 'هذا مسار المضاعفة — التراكم مجسّداً: الأعمار التي تتضاعف عندها محفظتك، ثم تتضاعف، ثم تتضاعف. أول ثلاث مضاعفات تحدث داخل عمر عملي.',
    },
    opinion: {
      en: "Walk out able to say: “My money doubles around 41, 50, and 59 — so every year I delay investing deletes the biggest doubling, the last one.”",
      ar: 'اخرج قادراً على قول: «مالي يتضاعف نحو 41 و50 و59 — فكل سنة أؤخر فيها الاستثمار تمحو أكبر مضاعفة، الأخيرة».',
    },
  },
  '/ratios': {
    what: {
      en: 'These are your vital signs — twelve health readings, each drawn as the thing it means: an emergency runway, a savings split, a debt ceiling. Green is healthy; amber is watch.',
      ar: 'هذه علاماتك الحيوية — اثنتا عشرة قراءة صحية، كلٌّ مرسومة كما تعنيه: مدى طوارئ، وتقسيم ادخار، وسقف دين. الأخضر سليم؛ والكهرماني راقِب.',
    },
    opinion: {
      en: "Walk out able to say: “Ten of my twelve vitals are green; my two ambers are runway and idle cash — and I know which lever moves each.”",
      ar: 'اخرج قادراً على قول: «عشر من علاماتي الاثنتي عشرة خضراء؛ والكهرمانيتان هما المدى والنقد الخامل — وأعرف أي رافعة تحرّك كلاً منهما».',
    },
    points: [
      {
        selector: '[data-tour="ratios-vitals"]',
        label: { en: 'The twelve vitals', ar: 'الاثنتا عشرة علامة' },
        text: {
          en: 'Tap any card and it opens to show the exact formula and the real entries behind the number — nothing here is a black box.',
          ar: 'اضغط أي بطاقة فتنفتح على المعادلة الدقيقة والمدخلات الحقيقية خلف الرقم — لا صندوق أسود هنا.',
        },
      },
      {
        selector: '[data-tour="ratios-blend"]',
        label: { en: 'The AI blend', ar: 'مزيج الذكاء' },
        text: {
          en: 'One click hands all twelve ratios to an AI analyst that reasons across them together — strong saving but idle cash, low debt with room — then stays for follow-ups.',
          ar: 'نقرة واحدة تسلّم النسب الاثنتي عشرة لمحلل ذكي يفكر فيها مجتمعة — ادخار قوي لكن نقد خامل، دين منخفض مع متسع — ثم يبقى للأسئلة.',
        },
      },
    ],
  },
  '/standard-of-living': {
    what: {
      en: 'This is the Standard of Living designer — your four levels (Basic → Decent → Lavish → Financial Freedom) placed against the real GaStat national average, then a planned climb across your life phases.',
      ar: 'هذا مصمم مستوى المعيشة — مستوياتك الأربعة (أساسي ← لائق ← مرفّه ← حرية مالية) موضوعة مقابل المتوسط الوطني الحقيقي من الهيئة العامة للإحصاء، ثم رحلة صعود مخططة عبر مراحل حياتك.',
    },
    opinion: {
      en: "Walk out able to say: “My Basic floor sits above the national average on purpose — and my plan reaches Lavish by 45, with the actual line tracking just ahead of it.”",
      ar: 'اخرج قادراً على قول: «أرضيّتي الأساسية فوق المتوسط الوطني عمداً — وخطتي تبلغ المرفّه عند 45، والخط الفعلي يسبقها بقليل».',
    },
  },
  '/goal-fund': {
    what: {
      en: 'These are Goal Funds — saving with a name on it. Each fund gets a monthly pace, a plan-vs-reality trajectory, and an honest status: ahead, on track, or behind.',
      ar: 'هذه صناديق الأهداف — ادخار يحمل اسماً. كل صندوق له وتيرة شهرية، ومسار خطة مقابل واقع، وحالة صادقة: متقدم، على المسار، أو متأخر.',
    },
    opinion: {
      en: "Walk out able to say: “My Hajj fund is 2 months ahead of plan; the education fund is behind — and moving SAR 400 a month between them fixes both.”",
      ar: 'اخرج قادراً على قول: «صندوق حجّي متقدم شهرين على الخطة؛ وصندوق التعليم متأخر — ونقل 400 ريال شهرياً بينهما يصلحهما معاً».',
    },
  },
  '/year-plan': {
    what: {
      en: 'This is the Year Master Plan — your year decided in advance: opening balance, year-end target, and the save rate and investment split that bridge the two.',
      ar: 'هذه الخطة السنوية الرئيسية — سنتك مقررة سلفاً: رصيد افتتاحي، وهدف نهاية العام، ومعدل الادخار وتقسيم الاستثمار اللذان يجسران بينهما.',
    },
    opinion: {
      en: "Walk out able to say: “This year is a contract: from 800K to 1.15M, at 34% saving. Every other tool now measures drift against it.”",
      ar: 'اخرج قادراً على قول: «هذه السنة عقد: من 800 ألف إلى 1.15 مليون، بادخار 34%. وكل أداة أخرى تقيس الانحراف عنه الآن».',
    },
  },
  '/luxury': {
    what: {
      en: "This is Luxury — the fourth quadrant's instrument for desire: it weighs anything you crave against your wealth's share, your yield's reach, its true 10-year cost, and the price of each moment of joy.",
      ar: 'هذه الرفاهية — أداة أهل الوفرة للشهوات: تزن ما تشتهيه بحصة ثروتك، ومدى ريعك، وكلفته الحقيقية بعد عشر سنوات، وثمن كل لحظة فرح فيه.',
    },
    opinion: {
      en: "Walk out able to say: “My yield buys the Submariner in 9 months, so my money pays for it — but the yacht is a money pit worth 40% of my wealth, and it can wait.”",
      ar: 'اخرج قادراً على قول: «ريعي يشتري الساعة خلال ٩ أشهر فمالي يدفع ثمنها — أما اليخت فبالوعة مال تساوي ٤٠٪ من ثروتي، وينتظر».',
    },
  },
  '/waterfall': {
    what: {
      en: 'This is the Money Waterfall — your plan as a flow: income cascading into essentials, savings, and investments. Watching where the water goes makes trade-offs physical.',
      ar: 'هذا شلال المال — خطتك تدفقاً: الدخل ينساب إلى الأساسيات والادخار والاستثمارات. مشاهدة أين يذهب الماء تجعل المقايضات ملموسة.',
    },
    opinion: {
      en: "Walk out able to say: “Of every SAR 1,000 I earn, 610 flows to living, 240 to investments, 150 pools as cash — and I want 50 of that living water redirected.”",
      ar: 'اخرج قادراً على قول: «من كل 1,000 ريال أكسبها، 610 تجري للمعيشة و240 للاستثمار و150 تتجمع نقداً — وأريد تحويل 50 من ماء المعيشة».',
    },
  },
  '/budgeting': {
    what: {
      en: "This is Dynamic Budgeting — not “can I afford it?” but “when should I buy it?”: purchases queued in phases, by priority and timing.",
      ar: 'هذه الميزنة الديناميكية — ليست «هل أقدر عليه؟» بل «متى ينبغي أن أشتريه؟»: مشتريات تصطف في مراحل، حسب الأولوية والتوقيت.',
    },
    opinion: {
      en: "Walk out able to say: “Wanting things is fine — sequencing them is wealth. The iPhone waits its turn behind the emergency fund top-up.”",
      ar: 'اخرج قادراً على قول: «أن أرغب في الأشياء أمر جيد — وترتيبها هو الثروة. الآيفون ينتظر دوره خلف تعبئة صندوق الطوارئ».',
    },
  },
  '/holdings': {
    what: {
      en: 'This is Assets & Liabilities — everything you own and owe, itemised, including what no app captures: land, gold, livestock, a stake in a venture. Your true wealth, not just your bank balance.',
      ar: 'هذه الأصول والالتزامات — كل ما تملك وما عليك، مفصلاً، بما لا يلتقطه أي تطبيق: أرض، ذهب، ماشية، حصة في مشروع. ثروتك الحقيقية، لا رصيد بنكك فقط.',
    },
    opinion: {
      en: "Walk out able to say: “I'm worth SAR 1.4M, not the 300K my banking app shows — and 60% of it is concentrated in one asset, which is my real risk.”",
      ar: 'اخرج قادراً على قول: «أساوي 1.4 مليون ريال لا 300 ألف كما يُظهر تطبيق بنكي — و60% منها متركزة في أصل واحد، وهذا خطري الحقيقي».',
    },
  },
  '/commitments': {
    what: {
      en: 'This is Bills & Commitments — the recurring truth: subscriptions, loans, cards. Every plan elsewhere is built on this reality, not on optimism.',
      ar: 'هذه الفواتير والالتزامات — الحقيقة المتكررة: اشتراكات، قروض، بطاقات. كل خطة في مكان آخر مبنية على هذا الواقع، لا على التفاؤل.',
    },
    opinion: {
      en: "Walk out able to say: “My true monthly outflow is SAR 9,400 — and SAR 610 of it is subscriptions I'd forgotten I was paying.”",
      ar: 'اخرج قادراً على قول: «تدفقي الشهري الحقيقي 9,400 ريال — منها 610 اشتراكات نسيت أني أدفعها».',
    },
  },
  '/freedom': {
    what: {
      en: 'This is Financial Freedom — the capital at which passive returns replace your expenses and work becomes a choice. The road shows exactly how far along you are.',
      ar: 'هذه الحرية المالية — رأس المال الذي تحل عوائده محل نفقاتك فيصبح العمل خياراً. الطريق يريك بالضبط أين وصلت.',
    },
    opinion: {
      en: "Walk out able to say: “My number is SAR 2.7M and I'm 31% of the way — and every SAR 1,000 I cut from monthly spending moves the finish line 300K closer.”",
      ar: 'اخرج قادراً على قول: «رقمي 2.7 مليون وأنا في 31% من الطريق — وكل 1,000 ريال أقتطعها من إنفاقي الشهري تقرّب خط النهاية 300 ألف».',
    },
  },
  '/what-if': {
    what: {
      en: 'This is What-If — a sandbox for decisions you have not made yet: the villa, the raise, the career break. Live them in numbers before you live them in life.',
      ar: 'هذه «ماذا لو» — مختبر لقرارات لم تتخذها بعد: الفيلا، والعلاوة، والانقطاع المهني. عِشها بالأرقام قبل أن تعيشها في الحياة.',
    },
    opinion: {
      en: "Walk out able to say: “The villa in 2028 costs me 3 years of freedom; in 2031 it costs one. I'm buying in 2031.”",
      ar: 'اخرج قادراً على قول: «الفيلا في 2028 تكلفني ثلاث سنوات من حريتي؛ وفي 2031 سنة واحدة. سأشتري في 2031».',
    },
  },
  '/credit': {
    what: {
      en: 'This is Credit Standing — your SIMAH score tracked over time, plus your borrowing power: what you own next to what institutions would let you access.',
      ar: 'هذا الوضع الائتماني — درجتك في سمة متتبعة عبر الزمن، وقدرتك الاقتراضية: ما تملكه بجانب ما تتيح لك المؤسسات الوصول إليه.',
    },
    opinion: {
      en: "Walk out able to say: “My score is 780 and rising; I could access about SAR 900K — and choosing not to use it is a decision, not an accident.”",
      ar: 'اخرج قادراً على قول: «درجتي 780 وترتفع؛ أستطيع الوصول لنحو 900 ألف ريال — واختياري ألا أستخدمها قرار، لا مصادفة».',
    },
  },
  '/risks': {
    what: {
      en: 'These are your five life-risks scored 0–100: income concentration, runway, health cover, asset mix, debt burden. The bigger the shaded shape, the more exposed you are.',
      ar: 'هذه مخاطرك الخمسة مقيّمة من 0 إلى 100: تركّز الدخل، والمدى، والتغطية الصحية، ومزيج الأصول، وعبء الدين. كلما كبر الشكل المظلل زاد انكشافك.',
    },
    opinion: {
      en: "Walk out able to say: “My reddest axis is income concentration — one employer, one salary — and my first mitigation is a second income stream, not more insurance.”",
      ar: 'اخرج قادراً على قول: «أشد محاوري حمرةً تركّز الدخل — جهة واحدة وراتب واحد — وأول علاجاتي مصدر دخل ثانٍ، لا مزيد من التأمين».',
    },
  },
  '/compare': {
    what: {
      en: 'This is Compare & Decide — two real Saudi-market options face to face, their unit economics side by side, and a blended verdict at your actual usage.',
      ar: 'هذه «قارن وقرّر» — خياران حقيقيان من السوق السعودي وجهاً لوجه، واقتصاديات الوحدة جنباً إلى جنب، وخلاصة ممزوجة على استخدامك الفعلي.',
    },
    opinion: {
      en: "Walk out able to say: “Below 792 km a month, ride-hailing beats owning; I drive 1,100 — so the car saves me SAR 2,100 a year.”",
      ar: 'اخرج قادراً على قول: «تحت 792 كم شهرياً، التوصيل يغلب التملك؛ أنا أقطع 1,100 — فالسيارة توفر لي 2,100 ريال سنوياً».',
    },
    points: [
      {
        selector: '[data-tour="compare-blend"]',
        label: { en: 'The blend', ar: 'الخلاصة' },
        text: {
          en: 'This strip is the whole point: the winner at YOUR usage, the gap in riyals per month and year, and the breakeven where the answer flips.',
          ar: 'هذا الشريط هو الغاية كلها: الفائز على استخدامك أنت، والفارق بالريال شهرياً وسنوياً، ونقطة التعادل حيث تنقلب الإجابة.',
        },
      },
      {
        selector: '[data-tour="compare-rail"]',
        label: { en: 'Now act', ar: 'الآن نفّذ' },
        text: {
          en: 'A comparison that ends in a feeling is wasted. These hand the verdict to the advisor or straight into the tool that executes it.',
          ar: 'مقارنة تنتهي بشعور مقارنةٌ مهدورة. هذه الأزرار تسلّم الخلاصة للمستشار أو مباشرة للأداة التي تنفذها.',
        },
      },
    ],
  },
  '/daily-stack': {
    what: {
      en: 'This is the Daily Stack — one day of your life as a tower of choices, measured against your income line, and the snowball that day becomes when it repeats for twenty years.',
      ar: 'هذه كومة اليوم — يوم واحد من حياتك برجاً من الاختيارات، مقيساً على خط دخلك، وكرة الثلج التي يصيرها ذلك اليوم حين يتكرر عشرين سنة.',
    },
    opinion: {
      en: "Walk out able to say: “My day costs SAR 540 and my income covers 590 — and the SAR 38 daily coffee habit is a SAR 33,000 decision per decade.”",
      ar: 'اخرج قادراً على قول: «يومي يكلف 540 ريالاً ودخلي يغطي 590 — وعادة القهوة بـ38 ريالاً يومياً قرارٌ بـ33 ألف ريال في العقد».',
    },
    points: [
      {
        selector: '[data-tour="stack-tower"]',
        label: { en: 'The tower', ar: 'البرج' },
        text: {
          en: 'Needs at the base, debt in the middle, wants on top — hover any layer to see its twenty-year shadow: what that daily choice would become, invested.',
          ar: 'الاحتياجات في القاعدة، والدين في الوسط، والاختيارات في القمة — مرّر على أي طبقة لترى ظلها العشريني: ما كان ليصيره ذلك الاختيار اليومي مستثمَراً.',
        },
      },
    ],
  },
  '/advisor': {
    what: {
      en: "This is where I live at full size — ask me anything. I already know your income, your story's chapters, your ratios and goals, and I cite your actual numbers, never generic advice.",
      ar: 'هنا أسكن بحجمي الكامل — اسألني ما شئت. أعرف مسبقاً دخلك وفصول قصتك ونسبك وأهدافك، وأستشهد بأرقامك الفعلية، لا نصائح عامة.',
    },
    opinion: {
      en: "Walk out able to say: “I asked a hard question about my own money and got an answer grounded in MY numbers — informational, honest about its limits, and actionable.”",
      ar: 'اخرج قادراً على قول: «سألت سؤالاً صعباً عن مالي فجاءني جواب متجذر في أرقامي أنا — معلوماتيّ، صريح بحدوده، وقابل للتنفيذ».',
    },
  },
};

// The lifetime-income page doubles as a Future tool; positioning covers both
// modes; standard-of-living handles its query params by prefix matching below.
export function getGuide(pathname: string): GuideEntry | null {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return GUIDE[clean] ?? null;
}
