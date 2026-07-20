// src/lib/risks.ts
// The Risks engine: turns a user's real position into a set of named,
// scored life-risks - income concentration, thin emergency runway,
// uninsured health shocks, portfolio concentration, and debt burden -
// each with a severity, a plain-language finding, and concrete
// mitigations mapped to MalMind's own tools. Computed, never fabricated:
// any risk without enough data says so.

export type RiskLevel = 'high' | 'medium' | 'low' | 'unknown';
export type Locale = 'ar' | 'en';

export interface Mitigation {
  text: string;
  href?: string;
  linkLabel?: string;
}

export interface RiskResult {
  id: string;
  icon: string;
  title: string;
  level: RiskLevel;
  score: number; // 0 (safe) → 100 (exposed); 0 when unknown
  finding: string; // one-line, with real numbers
  why: string; // why this matters
  mitigations: Mitigation[];
  missingHint?: string; // when level === 'unknown'
}

export interface RiskInputs {
  monthlyIncome: number | null;
  sideIncome: number | null;
  liquidSavings: number | null;
  monthlyDebtPayments: number | null;
  hasHealthInsurance: boolean | null;
  avgMonthlyExpenses: number | null;
  // latest asset mix, e.g. [{ label: 'Real estate', value: 650000 }, …]
  assetMix: { label: string; value: number }[];
}

export function computeRisks(i: RiskInputs, locale: Locale = 'en'): RiskResult[] {
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const fmtSar = (n: number) =>
    ar ? `${Math.round(n).toLocaleString('en-US')} ريال` : 'SAR ' + Math.round(n).toLocaleString();
  const out: RiskResult[] = [];

  // 1 ── Income concentration
  if (i.monthlyIncome && i.monthlyIncome > 0) {
    const side = Math.max(0, i.sideIncome ?? 0);
    const total = i.monthlyIncome + side;
    const pct = (i.monthlyIncome / total) * 100;
    const level: RiskLevel = pct >= 95 ? 'high' : pct >= 80 ? 'medium' : 'low';
    out.push({
      id: 'income', icon: '🎯', title: L('دخلٌ واحد يحكمها كلّها', 'One income to rule them all'), level,
      score: Math.round(pct),
      finding: side > 0
        ? L(
            `${pct.toFixed(0)}% ممّا يدخل جيبك يأتي من جهة عمل واحدة — دخلك الجانبي يغطّي ${fmtSar(side)}/شهر فقط.`,
            `${pct.toFixed(0)}% of what enters your pocket comes from a single employer — your side income covers just ${fmtSar(side)}/month.`
          )
        : L(
            '100% ممّا يدخل جيبك يأتي من مصدر واحد. إن توقّف، توقّف كل شيء.',
            `100% of what enters your pocket comes from a single source. If it stops, everything stops.`
          ),
      why: L(
        'مصدر دخل واحد يعني نقطة انهيار واحدة: إعادة هيكلة واحدة، حدث صحّي واحد، ربع سنة سيّئ عند جهة عملك، ويصل الدخل كلّه إلى الصفر دفعةً واحدة. تنويع الدخل هو أعمق إصلاح للمخاطر على الإطلاق.',
        'A single income source means a single point of failure: one restructuring, one health event, one bad quarter at your employer, and the entire inflow goes to zero at once. Diversifying income is the deepest risk fix there is.'
      ),
      mitigations: [
        { text: L('احسب ما يفعله مصدر دخل ثانٍ في جدولك الزمني', 'Model what a second income stream does to your timeline'), href: '/velocity', linkLabel: L('سرعة المال', 'Velocity of Money') },
        { text: L('نمِّ أصولاً تدفع لك — أرباح أسهم، إيجار، دخل أعمال', 'Grow assets that pay you — dividends, rent, business income'), href: '/holdings', linkLabel: L('الأصول والالتزامات', 'Assets & liabilities') },
        { text: L('أبقِ تغطيتك طويلة بما يكفي لتجاوز فجوة بين وظيفتين (انظر الخطر التالي)', 'Keep your runway long enough to survive a gap between jobs (see the next risk)') },
      ],
    });
  } else {
    out.push({
      id: 'income', icon: '🎯', title: L('دخلٌ واحد يحكمها كلّها', 'One income to rule them all'), level: 'unknown', score: 0,
      finding: L('لا توجد بيانات كافية بعد.', 'Not enough data yet.'), why: '',
      missingHint: L('حدّد دخلك الشهري (وأيّ دخل جانبي) في تعديل الملف الشخصي.', 'Set your monthly income (and any side income) in Edit Profile.'),
      mitigations: [],
    });
  }

  // 2 ── Emergency runway
  if (i.liquidSavings != null && i.avgMonthlyExpenses && i.avgMonthlyExpenses > 0) {
    const months = i.liquidSavings / i.avgMonthlyExpenses;
    const level: RiskLevel = months < 3 ? 'high' : months < 6 ? 'medium' : 'low';
    out.push({
      id: 'runway', icon: '🛟', title: L('كم يمكنك أن تحلّق؟', 'How long could you glide?'), level,
      score: Math.round(Math.max(0, Math.min(100, (1 - months / 12) * 100))),
      finding: L(
        `مدخراتك السائلة البالغة ${fmtSar(i.liquidSavings)} تغطّي ${months.toFixed(1)} أشهر من إنفاقك الفعلي (${fmtSar(i.avgMonthlyExpenses)}/شهر).`,
        `Your liquid savings of ${fmtSar(i.liquidSavings)} cover ${months.toFixed(1)} months of your real spending (${fmtSar(i.avgMonthlyExpenses)}/month).`
      ),
      why: L(
        'التغطية هي ما يحوّل الأزمة إلى مجرّد إزعاج. تحت ثلاثة أشهر، يجبرك فقدان الوظيفة أو نفقة عاجلة على الاستدانة أو بيع الاستثمارات بأسوأ توقيت. ستة أشهر تشتري لك الهدوء — والهدوء يصنع قرارات أفضل.',
        'The runway is what turns a crisis into an inconvenience. Below three months, a job loss or urgent expense forces debt or fire-selling investments at the worst moment. Six months buys calm — and calm makes better decisions.'
      ),
      mitigations: [
        { text: L('حدّد هدف تغطية وأتمتة إضافة شهرية يوم الراتب', 'Set a runway target and automate a monthly top-up on payday'), href: '/goal-fund', linkLabel: L('صندوق الهدف', 'Goal Fund') },
        { text: L('اعثر على أشهر التسرّب في سجلّ إنفاقك', 'Find the leak months in your spending history'), href: '/financial-numbers', linkLabel: L('أرقامي المالية', 'My Financial Numbers') },
        { text: L('راقب نسبة التغطية تتعافى شهراً بعد شهر', 'Watch the runway ratio recover month by month'), href: '/ratios', linkLabel: L('النسب والإحصاءات', 'Ratios & Stats') },
      ],
    });
  } else {
    out.push({
      id: 'runway', icon: '🛟', title: L('كم يمكنك أن تحلّق؟', 'How long could you glide?'), level: 'unknown', score: 0,
      finding: L('لا توجد بيانات كافية بعد.', 'Not enough data yet.'), why: '',
      missingHint: L('حدّد مدخراتك السائلة في تعديل الملف الشخصي وسجّل شهراً في أرقامي المالية.', 'Set your liquid savings in Edit Profile and log a month in My Financial Numbers.'),
      mitigations: [],
    });
  }

  // 3 ── Health shock (insurance)
  if (i.hasHealthInsurance === true) {
    out.push({
      id: 'health', icon: '🏥', title: L('الطارئ غير المؤمَّن', 'The uninsured emergency'), level: 'low', score: 15,
      finding: L(
        'لديك تأمين صحّي — الحدث الطبّي المفاجئ يصيب جدولك، لا صافي ثروتك.',
        'You have health insurance — a sudden medical event hits your calendar, not your net worth.'
      ),
      why: L(
        'دخول مستشفى واحد غير مؤمَّن قد يمحو سنوات من الادّخار بين ليلة وضحاها. التأمين يحوّل تكلفة غير محدودة وغير متوقّعة إلى تكلفة محدودة ومتوقّعة — وهذا هو فنّ إدارة المخاطر كلّه.',
        'A single uninsured hospitalization can erase years of savings overnight. Cover converts an unbounded, unpredictable cost into a bounded, predictable one — which is the entire art of risk management.'
      ),
      mitigations: [
        { text: L('راجِع حدود تغطيتك سنوياً — خاصةً إن أُضيف أفراد من العائلة', 'Review your coverage limits yearly — especially if family members were added') },
        { text: L('احتفظ بشهر واحد من قيمة التحمّل ضمن تغطية الطوارئ', 'Keep one month of the deductible inside your emergency runway') },
      ],
    });
  } else if (i.hasHealthInsurance === false) {
    out.push({
      id: 'health', icon: '🏥', title: L('الطارئ غير المؤمَّن', 'The uninsured emergency'), level: 'high', score: 90,
      finding: L(
        'لا يوجد تأمين صحّي مسجَّل — حدث طبّي خطير واحد سيُدفَع بالكامل من مدخراتك.',
        'No health insurance on record — one serious medical event would be paid entirely from your savings.'
      ),
      why: L(
        'هذا هو الخطر غير المحدود الكلاسيكي: لا يمكنك توقّعه أو جدولته أو وضع سقف له. طارئ واحد غير مؤمَّن قد يلتهم صندوق طوارئ بُني عبر سنوات. التأمين هو أرخص وسيلة لوضع سقف عليه.',
        'This is the classic unbounded risk: you cannot predict it, schedule it, or cap it. A single uninsured emergency can consume an emergency fund built over years. Insurance is the cheapest way to put a ceiling on it.'
      ),
      mitigations: [
        { text: L('اطلب سعر وثيقة تأمين صحّي خاصة — حتى خطّة بتحمّل مرتفع تضع سقفاً للكارثة', 'Price a private health policy — even a high-deductible plan caps the catastrophe') },
        { text: L('إن كنت موظّفاً، تحقّق ممّا إذا كانت خطّة جهة عملك قابلة للترقية أو التوسعة للعائلة', 'If employed, check whether your employer plan can be upgraded or extended to family') },
        { text: L('إلى أن تُغطّى، عامِل تغطيتك كأنّها غير قابلة للمساس', 'Until covered, treat your runway as untouchable'), href: '/goal-fund', linkLabel: L('صندوق الهدف', 'Goal Fund') },
      ],
    });
  } else {
    out.push({
      id: 'health', icon: '🏥', title: L('الطارئ غير المؤمَّن', 'The uninsured emergency'), level: 'unknown', score: 0,
      finding: L('هل لديك تأمين صحّي؟', 'Do you have health insurance?'), why: '',
      missingHint: 'answer-inline', // page renders yes/no buttons for this one
      mitigations: [],
    });
  }

  // 4 ── Portfolio / asset concentration
  const totalAssets = i.assetMix.reduce((s, a) => s + a.value, 0);
  if (totalAssets > 0) {
    const top = [...i.assetMix].sort((a, b) => b.value - a.value)[0];
    const pct = (top.value / totalAssets) * 100;
    const level: RiskLevel = pct >= 70 ? 'high' : pct >= 50 ? 'medium' : 'low';
    out.push({
      id: 'concentration', icon: '🧺', title: L('كل البيض، وكم سلّة؟', 'All eggs, how many baskets?'), level,
      score: Math.round(pct),
      finding: L(
        `${top.label} يشكّل ${pct.toFixed(0)}% من أصولك البالغة ${fmtSar(totalAssets)}.`,
        `${top.label} makes up ${pct.toFixed(0)}% of your ${fmtSar(totalAssets)} in assets.`
      ),
      why: L(
        'التركيز سيف ذو حدّين: هو الذي بنى الثروة، لكنه يعني أيضاً أن سوقاً واحدة — أصلاً واحداً — تقرّر صافي ثروتك. هبوط عقاري أو انهيار سهم واحد لا ينبغي أن يقدر على أخذ نصف قصّتك معه.',
        "Concentration cuts both ways: it built the wealth, but it also means one market — one asset — decides your net worth. A property downturn or a single stock crash shouldn't be able to take half your story with it."
      ),
      mitigations: [
        { text: L('ارسم خريطة مزيج أصولك الكامل وانحرافه عبر الزمن', 'Map your full asset mix and its drift over time'), href: '/financial-numbers', linkLabel: L('أرقامي المالية', 'My Financial Numbers') },
        { text: L('وجِّه الاستثمار الشهري الجديد نحو الفئات ناقصة الوزن', 'Direct new monthly investment into the under-weighted classes'), href: '/doubling-path', linkLabel: L('مسار المضاعفة', 'Doubling Path') },
        { text: L('اسأل المحلّل الذكي كيف يقارَن مزيجك بمرحلتك العمرية', 'Ask the AI analyst how your mix compares to your phase of life'), href: '/ratios', linkLabel: L('المزيج', 'The Blend') },
      ],
    });
  } else {
    out.push({
      id: 'concentration', icon: '🧺', title: L('كل البيض، وكم سلّة؟', 'All eggs, how many baskets?'), level: 'unknown', score: 0,
      finding: L('لا توجد بيانات كافية بعد.', 'Not enough data yet.'), why: '',
      missingHint: L('سجّل شهراً في أرقامي المالية (نقد، أسهم، عقار…) لرؤية مزيج أصولك.', 'Log a month in My Financial Numbers (cash, stocks, real estate…) to see your asset mix.'),
      mitigations: [],
    });
  }

  // 5 ── Debt burden
  if (i.monthlyDebtPayments != null && i.monthlyIncome && i.monthlyIncome > 0) {
    const pct = (i.monthlyDebtPayments / i.monthlyIncome) * 100;
    const level: RiskLevel = pct > 36 ? 'high' : pct > 20 ? 'medium' : 'low';
    out.push({
      id: 'debt', icon: '⚓', title: L('الثقل الذي تحمله شهرياً', 'The weight you carry monthly'), level,
      score: Math.round(Math.min(100, pct * 1.8)),
      finding: L(
        `دفعات الدَّين تلتهم ${pct.toFixed(0)}% من دخلك (${fmtSar(i.monthlyDebtPayments)} من ${fmtSar(i.monthlyIncome)}) قبل أن ترى ريالاً.`,
        `Debt payments claim ${pct.toFixed(0)}% of your income (${fmtSar(i.monthlyDebtPayments)} of ${fmtSar(i.monthlyIncome)}) before you see a riyal.`
      ),
      why: L(
        'الالتزامات الثابتة هي المرساة في كل عاصفة: لا تتقلّص حين يتقلّص الدخل. كلّما ارتفعت هذه الحصّة، قلّت المساحة المتاحة لك لامتصاص أيّ من المخاطر الأخرى في هذه الصفحة.',
        "Fixed obligations are the anchor in every storm: they don't shrink when income does. The higher this share, the less room you have to absorb any of the other risks on this page."
      ),
      mitigations: [
        { text: L('اطّلع على تقدّم سداد كل دَين وعدد الأشهر حتى الصفر', "See each debt's payoff progress and months-to-zero"), href: '/commitments', linkLabel: L('الفواتير والالتزامات', 'Bills & commitments') },
        { text: L('احسب كيف يُسرّع التزامٌ أصغر كلّ محطّة', 'Model how a smaller commitment accelerates every milestone'), href: '/velocity', linkLabel: L('سرعة المال', 'Velocity of Money') },
      ],
    });
  } else {
    out.push({
      id: 'debt', icon: '⚓', title: L('الثقل الذي تحمله شهرياً', 'The weight you carry monthly'), level: 'unknown', score: 0,
      finding: L('لا توجد بيانات كافية بعد.', 'Not enough data yet.'), why: '',
      missingHint: L('حدّد دفعات دَينك الشهرية في تعديل الملف الشخصي.', 'Set your monthly debt payments in Edit Profile.'),
      mitigations: [],
    });
  }

  return out;
}

export function riskLevelLabel(level: RiskLevel, locale: Locale = 'en'): string {
  if (locale === 'ar') {
    return level === 'high' ? 'معرَّض' : level === 'medium' ? 'راقِب' : level === 'low' ? 'مُدار' : 'غير معروف';
  }
  return level === 'high' ? 'Exposed' : level === 'medium' ? 'Watch' : level === 'low' ? 'Managed' : 'Unknown';
}
