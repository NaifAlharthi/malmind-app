// src/lib/depth.ts
// The depth dimension. The top bar's timeline moves you through TIME
// (past · today · future); the iceberg rail moves you through DEPTH — four
// versions of the position you're standing in right now:
//   1 · the bad version   — what this position looks like mishandled
//   2 · the baseline      — the typical shape of this position
//   3 · ahead of the curve — doing visibly better than the position expects
//   4 · the ceiling       — the best anyone in this position can be
// Content is keyed by the person's diagnosed quadrant (shared with the
// Today dashboard and home card via lib/quadrant), so the dive always talks
// about THEIR position, not finance in general.

import type { QuadKey } from '@/lib/quadrant';

export type DepthLevel = 1 | 2 | 3 | 4;
export const DEPTH_LEVELS: DepthLevel[] = [1, 2, 3, 4];

// Visual meta for the iceberg: level 1 is the tip above the waterline,
// levels 2–4 sink into progressively darker water.
export const DEPTH_META: Record<DepthLevel, {
  icon: string;
  water: string; // section background tint for the dive overlay
  depth: { ar: string; en: string }; // gamified depth marker
  name: { ar: string; en: string };
}> = {
  1: {
    icon: '⚠️',
    water: '#12374F',
    depth: { ar: 'السطح', en: 'Surface' },
    name: { ar: 'المثال السيّئ', en: 'The bad version' },
  },
  2: {
    icon: '⚓',
    water: '#0E2C42',
    depth: { ar: '−20م', en: '−20m' },
    name: { ar: 'خط الأساس', en: 'The baseline' },
  },
  3: {
    icon: '🐬',
    water: '#092136',
    depth: { ar: '−200م', en: '−200m' },
    name: { ar: 'متقدّم على موقفك', en: 'Ahead of the curve' },
  },
  4: {
    icon: '💎',
    water: '#051627',
    depth: { ar: '−1000م', en: '−1000m' },
    name: { ar: 'الذروة الممكنة', en: 'The ceiling' },
  },
};

export interface DepthTool { href: string; ar: string; en: string }
export interface DepthCopy {
  vignette: { ar: string; en: string }; // the level as a lived scene
  markers: { ar: string; en: string }[]; // 3 telltale signs of this level
  tools: DepthTool[]; // the product tools that move you from/along here
}

// 4 quadrants × 4 depths. Written to always name the financial subject and
// speak to "your position", never generic advice.
export const DEPTH_COPY: Record<QuadKey, Record<DepthLevel, DepthCopy>> = {
  // ── A · Build mode ────────────────────────────────────────────────────
  A: {
    1: {
      vignette: {
        ar: 'بداية طريق بلا أي نظام: قروض استهلاكية مبكرة، رصيد يتبخّر أول أسبوع من الشهر، ولا فكرة أين يذهب المال. من يبدأ هكذا يدخل سنوات الدخل الحقيقي وهو مُثقَل لا خالي الوفاض فقط.',
        en: 'A starting line with no system: early consumer debt, a balance that evaporates in week one, no idea where the money goes. Start like this and you enter your real earning years weighed down, not just empty-handed.',
      },
      markers: [
        { ar: 'دين استهلاكي قبل أول راتب حقيقي', en: 'Consumer debt before a real salary' },
        { ar: 'لا تتبّع للمصروف إطلاقاً', en: 'No spending tracking at all' },
        { ar: 'صفر أصول وصفر عادات', en: 'Zero assets, zero habits' },
      ],
      tools: [
        { href: '/daily-stack', ar: 'كومة اليوم — أين يذهب مصروفك', en: 'Daily Stack — where your spending goes' },
        { href: '/financial-numbers', ar: 'أرقامي المالية — أول تسجيل', en: 'My Financial Numbers — first log' },
      ],
    },
    2: {
      vignette: {
        ar: 'تعرف دخلك ومصروفك تقريباً، تنجو كل شهر بالكاد لكن بلا دين كبير. هذا هو الشكل المعتاد لموقفك — البقاء على السطح، دون بناء بعد.',
        en: 'You roughly know your income and spending, you scrape through each month without major debt. This is the typical shape of your position — staying afloat, not yet building.',
      },
      markers: [
        { ar: 'مصروف مفهوم ولو بالتقريب', en: 'Spending understood, even roughly' },
        { ar: 'لا دين يتراكم', en: 'No compounding debt' },
        { ar: 'الادخار موسمي لا عادة', en: 'Saving is occasional, not a habit' },
      ],
      tools: [
        { href: '/financial-numbers', ar: 'أرقامي المالية — ثبّت التسجيل الشهري', en: 'My Financial Numbers — make logging monthly' },
        { href: '/story', ar: 'قصتك المالية — دوّن فصلك الحالي', en: 'Your Story — record this chapter' },
      ],
    },
    3: {
      vignette: {
        ar: 'تدّخر ولو مبلغاً صغيراً بانتظام، وبدأت أول أصل لك — وديعة، صندوق، أو أسهم بسيطة. أنت تبني عضلة التتبّع والادخار قبل أن يكبر دخلك، وهذا ما يجعل أول راتب حقيقي مضاعفاً.',
        en: 'You save a small amount consistently and started your first asset — a deposit, a fund, simple stocks. You are building the tracking-and-saving muscle before your income grows, which is what makes the first real salary compound.',
      },
      markers: [
        { ar: 'ادخار شهري ثابت مهما صغُر', en: 'A fixed monthly saving, however small' },
        { ar: 'أول أصل مسجّل باسمك', en: 'A first asset to your name' },
        { ar: 'عادة تتبّع راسخة', en: 'A tracking habit that sticks' },
      ],
      tools: [
        { href: '/holdings', ar: 'الأصول — سجّل أول استثمار', en: 'Assets — log the first investment' },
        { href: '/velocity', ar: 'سرعة الثروة — راقب وتيرتك', en: 'Wealth Velocity — watch your pace' },
      ],
    },
    4: {
      vignette: {
        ar: 'دخل جانبي صغير فوق مصروفك، محفظة أولى تنمو شهرياً، وعادات مالية مكتملة قبل التخرّج إلى الدخل الحقيقي. هذه ذروة موقفك — نادرة، لكنها ممكنة، وتجعل انطلاقتك من الدور الثاني لا الأرضي.',
        en: 'A small side income above your costs, a first portfolio growing monthly, and full financial habits before you graduate into real income. This is the ceiling of your position — rare, but possible, and it starts your climb from the second floor, not the ground.',
      },
      markers: [
        { ar: 'دخل جانبي يغطي جزءاً من المصروف', en: 'Side income covering part of your costs' },
        { ar: 'استثمار شهري تلقائي', en: 'Automatic monthly investing' },
        { ar: 'خطة مكتوبة لما بعد هذا الفصل', en: 'A written plan for the next chapter' },
      ],
      tools: [
        { href: '/what-if', ar: 'ماذا لو — صمّم قفزتك القادمة', en: 'What If — design the next leap' },
        { href: '/freedom', ar: 'الحرية المالية — ارسم الطريق كاملاً', en: 'Financial Freedom — map the whole road' },
      ],
    },
  },

  // ── B · Falling behind ────────────────────────────────────────────────
  B: {
    1: {
      vignette: {
        ar: 'الفجوة بين الدخل والمصروف تُموَّل بالبطاقة الائتمانية وقرضٍ فوق قرض، والأصول تُباع واحدة تلو الأخرى لتسديد أقساط لا تنتهي. هذه النسخة التي يحذّرك موقفك منها — النزيف الذي يتحوّل إلى غرق.',
        en: 'The gap between income and spending is financed by credit cards and loan upon loan, while assets get sold one by one to cover endless installments. This is the version your position warns you about — bleeding that turns into drowning.',
      },
      markers: [
        { ar: 'دين جديد يسدّ دين قديم', en: 'New debt paying off old debt' },
        { ar: 'أصول تُباع لتغطية المصروف', en: 'Assets sold to cover spending' },
        { ar: 'لا أحد يعرف حجم الفجوة بدقة', en: 'Nobody knows the exact size of the gap' },
      ],
      tools: [
        { href: '/financial-numbers', ar: 'أرقامي المالية — واجه الفجوة بالأرقام', en: 'My Financial Numbers — face the gap in numbers' },
        { href: '/commitments', ar: 'الالتزامات — كل قسط على طاولة واحدة', en: 'Commitments — every installment on one table' },
      ],
    },
    2: {
      vignette: {
        ar: 'العجز موجود، لكنه مكشوف ومحسوب: تعرف كم تنزف كل شهر وأي بند يستنزفك، وأصولك تمنحك مهلة. هذا خط الأساس لموقفك — لست بخير، لكنك ممسك بالخريطة.',
        en: "The deficit is real, but it's visible and measured: you know how much you bleed each month and which line item drains you, and your assets buy you time. This is your position's baseline — not fine, but holding the map.",
      },
      markers: [
        { ar: 'حجم العجز الشهري معروف بدقة', en: 'The monthly deficit precisely known' },
        { ar: 'البنود المستنزِفة محدّدة بالاسم', en: 'The draining line items named' },
        { ar: 'الأصول تُدار لا تُستهلك عشوائياً', en: 'Assets managed, not randomly consumed' },
      ],
      tools: [
        { href: '/daily-stack', ar: 'كومة اليوم — حدّد البند الذي يقلب المعادلة', en: 'Daily Stack — find the item that flips the balance' },
        { href: '/budgeting', ar: 'الميزانية — سقف لكل بند', en: 'Budgeting — a ceiling per line item' },
      ],
    },
    3: {
      vignette: {
        ar: 'قلبت المعادلة للتو: المصروف نزل تحت الدخل، النزيف توقف، وأول فائض — مهما صغُر — بدأ يسدّ الدين الأغلى. أنت متقدّم على موقفك، والاتجاه أهم من السرعة.',
        en: 'You just flipped the balance: spending dropped below income, the bleeding stopped, and the first surplus — however small — is attacking the most expensive debt. You are ahead of your position, and direction beats speed.',
      },
      markers: [
        { ar: 'فائض شهري موجب ولو صغير', en: 'A positive monthly surplus, however small' },
        { ar: 'الدين الأغلى يُسدَّد أولاً', en: 'The most expensive debt paid first' },
        { ar: 'لا التزامات جديدة إطلاقاً', en: 'Zero new commitments' },
      ],
      tools: [
        { href: '/velocity', ar: 'سرعة الثروة — راقب انعكاس الاتجاه', en: 'Wealth Velocity — watch the trend reverse' },
        { href: '/credit', ar: 'الائتمان — افهم حدودك قبل أي قرض', en: 'Credit — know your limits before any loan' },
      ],
    },
    4: {
      vignette: {
        ar: 'حوّلت التعثّر إلى انضباط: فائض ثابت، خطة سداد لكل دين تنتهي بتاريخ معلوم، وصندوق طوارئ صغير يمنع الانتكاسة. هذه ذروة موقفك — من هنا تعود إلى البناء وأنت أقوى ممن لم يتعثّر قط.',
        en: 'You turned falling behind into discipline: a steady surplus, a payoff plan per debt with a known end date, and a small emergency fund preventing relapse. This is your position\'s ceiling — from here you return to building stronger than those who never stumbled.',
      },
      markers: [
        { ar: 'تاريخ نهاية معلوم لكل دين', en: 'A known end date for every debt' },
        { ar: 'صندوق طوارئ يمنع دين الطوارئ', en: 'An emergency fund preventing emergency debt' },
        { ar: 'فائض يتحوّل لبناء لا استهلاك', en: 'Surplus flowing to building, not consumption' },
      ],
      tools: [
        { href: '/waterfall', ar: 'الشلال — رتّب أولويات كل ريال فائض', en: 'Waterfall — prioritize every surplus riyal' },
        { href: '/year-plan', ar: 'خطة السنة — ضع تواريخ النهاية', en: 'Year Plan — set the end dates' },
      ],
    },
  },

  // ── C · Break-even ────────────────────────────────────────────────────
  C: {
    1: {
      vignette: {
        ar: 'تعادل هشّ: الدخل يغطي المصروف بالمليم، فأيّ طارئ واحد — عطل سيارة، فاتورة علاج — يقلبك إلى عجز ودين. سنوات تمرّ والعداد على الصفر، والتضخم وحده يتقدّم.',
        en: 'A fragile break-even: income covers spending to the last riyal, so one emergency — a car repair, a medical bill — flips you into deficit and debt. Years pass with the counter at zero while inflation alone moves forward.',
      },
      markers: [
        { ar: 'لا صندوق طوارئ إطلاقاً', en: 'No emergency fund at all' },
        { ar: 'كل زيادة دخل يبتلعها المصروف', en: 'Every raise swallowed by spending' },
        { ar: 'صافي الثروة ثابت منذ سنوات', en: 'Net worth flat for years' },
      ],
      tools: [
        { href: '/risks', ar: 'المخاطر — كم يصمد وضعك أمام طارئ؟', en: 'Risks — how long would you survive a shock?' },
        { href: '/daily-stack', ar: 'كومة اليوم — أين يختفي الفائض المحتمل', en: 'Daily Stack — where the potential surplus hides' },
      ],
    },
    2: {
      vignette: {
        ar: 'تغطي مصاريفك بثبات شهراً بعد شهر، بلا دين يتراكم — لكن المال يمرّ من يدك مروراً، ولا يبقى منه ما يعمل لصالحك. هذا خط الأساس لموقفك: مستقر، لكنه واقف.',
        en: 'You cover your costs steadily month after month with no compounding debt — but money passes through your hands and none of it stays to work for you. This is your position\'s baseline: stable, but standing still.',
      },
      markers: [
        { ar: 'الالتزامات مسدّدة في وقتها', en: 'Commitments paid on time' },
        { ar: 'فائض شبه معدوم آخر الشهر', en: 'Near-zero surplus at month end' },
        { ar: 'لا آلية ادخار تلقائية', en: 'No automatic saving mechanism' },
      ],
      tools: [
        { href: '/budgeting', ar: 'الميزانية — اصنع الفائض بالتصميم', en: 'Budgeting — design the surplus into existence' },
        { href: '/ratios', ar: 'النسب والمؤشرات — أين يقف مالك فعلاً', en: 'Ratios & Stats — where your money truly stands' },
      ],
    },
    3: {
      vignette: {
        ar: 'فائض 10–20% يخرج من الحساب تلقائياً أول الشهر — قبل أن تراه يد المصروف — نصفه لصندوق الطوارئ ونصفه لأول استثمار. كسرت التعادل من الجهة الصحيحة.',
        en: 'A 10–20% surplus leaves the account automatically at the start of the month — before spending ever sees it — half to the emergency fund, half to a first investment. You broke the break-even from the right side.',
      },
      markers: [
        { ar: 'الادخار يحدث أول الشهر لا آخره', en: 'Saving happens at month start, not month end' },
        { ar: 'صندوق طوارئ يتراكم', en: 'An emergency fund accumulating' },
        { ar: 'أول استثمار منتظم', en: 'A first regular investment' },
      ],
      tools: [
        { href: '/holdings', ar: 'الأصول — تابع استثمارك الشهري', en: 'Assets — track the monthly investment' },
        { href: '/goal-fund', ar: 'صندوق الهدف — للطوارئ رقم مستهدف', en: 'Goal Fund — give the emergency fund a target' },
      ],
    },
    4: {
      vignette: {
        ar: 'آلة فائض مكتملة: مصاريف مضبوطة بسقوف، استثمار شهري تلقائي، وصندوق طوارئ يغطي ستة أشهر كاملة. موقفك تحوّل من «أنجو كل شهر» إلى «أبني كل شهر» — وهذه بوابة الوفرة.',
        en: 'A finished surplus machine: costs capped by design, automatic monthly investing, and an emergency fund covering six full months. Your position turned from "surviving each month" into "building each month" — the gateway to abundance.',
      },
      markers: [
        { ar: 'ستة أشهر مصاريف في الطوارئ', en: 'Six months of costs in the emergency fund' },
        { ar: 'استثمار تلقائي لا يتوقف', en: 'Automatic investing that never pauses' },
        { ar: 'المصروف ثابت رغم نمو الدخل', en: 'Spending flat while income grows' },
      ],
      tools: [
        { href: '/doubling-path', ar: 'طريق المضاعفة — متى يتضاعف مالك', en: 'Doubling Path — when your money doubles' },
        { href: '/freedom', ar: 'الحرية المالية — الرقم الذي يحرّرك', en: 'Financial Freedom — the number that frees you' },
      ],
    },
  },

  // ── D · Abundance ─────────────────────────────────────────────────────
  D: {
    1: {
      vignette: {
        ar: 'فائض كبير نائم في الحساب الجاري، يأكله التضخم سنة بعد سنة، أو مبعثر في مشاريع مجاملات وأصول لا يعرف أحد قيمتها. وفرة بلا إدارة تتبخّر — وهذه أغلى نسخة سيئة في المنتج كله.',
        en: 'A large surplus asleep in a current account, eaten by inflation year after year, or scattered across courtesy ventures and assets nobody can value. Abundance without management evaporates — the most expensive bad version in this whole product.',
      },
      markers: [
        { ar: 'الفائض نقد خامل بلا عائد', en: 'Surplus sitting as idle, zero-return cash' },
        { ar: 'أصول لا تُقيَّم ولا تُراجَع', en: 'Assets never valued or reviewed' },
        { ar: 'قرارات مالية بالمجاملة لا بالأرقام', en: 'Money decisions by courtesy, not numbers' },
      ],
      tools: [
        { href: '/holdings', ar: 'الأصول — قيّم كل ما تملك فعلاً', en: 'Assets — value everything you actually own' },
        { href: '/ratios', ar: 'النسب والمؤشرات — كم يخسرك الخمول', en: 'Ratios & Stats — what idleness costs you' },
      ],
    },
    2: {
      vignette: {
        ar: 'الفائض يُدّخر بانتظام لكنه مركّز في أصل واحد أو اثنين — عقار واحد، سهم واحد، أو وديعة واحدة. خط أساس موقفك: المال محفوظ، لكنه هشّ التوزيع وبطيء الحركة.',
        en: 'The surplus is saved consistently but concentrated in one or two assets — a single property, a single stock, one deposit. Your position\'s baseline: the money is kept, but fragile in spread and slow in motion.',
      },
      markers: [
        { ar: 'ادخار منتظم للفائض', en: 'The surplus saved regularly' },
        { ar: 'تركّز عالٍ في أصل أو اثنين', en: 'Heavy concentration in one or two assets' },
        { ar: 'لا خطة نشر واضحة للفائض الجديد', en: 'No clear deployment plan for new surplus' },
      ],
      tools: [
        { href: '/positioning', ar: 'موقعك — قارن تكوين أصولك بأقرانك', en: 'Positioning — compare your asset mix to peers' },
        { href: '/compare', ar: 'قارن وقرّر — أين يعمل الريال القادم', en: 'Compare & Decide — where the next riyal works' },
      ],
    },
    3: {
      vignette: {
        ar: 'محفظة موزّعة على أصول تعرف دور كلٍّ منها، والفائض الجديد يُنشر تلقائياً كل شهر حسب خطة مكتوبة. مالك يعمل بدوام كامل، وأنت تراجع لا تُنفّذ.',
        en: 'A portfolio spread across assets where each has a known role, and new surplus deploys automatically every month by a written plan. Your money works full-time; you review rather than execute.',
      },
      markers: [
        { ar: 'توزيع مقصود لكل أصل دور', en: 'Deliberate allocation, a role per asset' },
        { ar: 'نشر تلقائي شهري للفائض', en: 'Automatic monthly surplus deployment' },
        { ar: 'مراجعة دورية لا قرارات متعجّلة', en: 'Periodic reviews, no rushed decisions' },
      ],
      tools: [
        { href: '/velocity', ar: 'سرعة الثروة — هل يتسارع النمو فعلاً؟', en: 'Wealth Velocity — is growth actually accelerating?' },
        { href: '/what-if', ar: 'ماذا لو — اختبر خطط النشر قبل تنفيذها', en: 'What If — test deployment plans before living them' },
      ],
    },
    4: {
      vignette: {
        ar: 'دخل أصولك وحده يقترب من تغطية مصاريفك كاملة — عتبة الحرية المالية. العمل صار خياراً، والقرار الكبير القادم ليس «كيف أكسب أكثر» بل «ماذا أبني بهذه الحرية». هذه قمة الجبل الجليدي كله.',
        en: 'Your assets\' income alone approaches covering your full costs — the financial-freedom threshold. Work became a choice, and the next big question isn\'t "how do I earn more" but "what do I build with this freedom". This is the summit of the whole iceberg.',
      },
      markers: [
        { ar: 'دخل الأصول يقارب المصاريف', en: 'Asset income approaching living costs' },
        { ar: 'العمل خيار لا ضرورة', en: 'Work as a choice, not a necessity' },
        { ar: 'الثروة تُدار عبر الأجيال', en: 'Wealth managed across generations' },
      ],
      tools: [
        { href: '/freedom', ar: 'الحرية المالية — ثبّت العتبة وحافظ عليها', en: 'Financial Freedom — lock the threshold in' },
        { href: '/lifetime-income', ar: 'دخل العمر — اقرأ القوس كاملاً', en: 'Lifetime Income — read the whole arc' },
      ],
    },
  },
};

// A rough, honest estimate of which depth the person currently lives at
// within their position — used only to place the "you are here" marker.
export function assessDepthLevel(
  avgIncome: number,
  avgExpenses: number,
  cash: number,
  investments: number,
): DepthLevel {
  const surplus = avgIncome > 0 ? (avgIncome - avgExpenses) / avgIncome : 0;
  const months = avgExpenses > 0 ? cash / avgExpenses : 0;
  if (surplus >= 0.2 && investments > 0 && months >= 6) return 4;
  if (surplus >= 0.1 && (investments > 0 || months >= 3)) return 3;
  if (surplus < 0 && months < 3) return 1;
  return 2;
}
