// src/lib/compareData.ts
// The Compare & Decide MARKET DATABASE — actual Saudi-market offerings,
// researched from public comparison sources. This file is deliberately pure
// data: growing the library (or hosting a B2B-sponsored row later) is an
// entry here, never a feature build.
//
// Figures are as researched on AS_OF from public sources (Giraffy, SAMA's
// card comparison, issuer pages, Truescho's 2026 travel-card roundup,
// Saudia/flynas program pages). Fees and rates drift — the UI must carry a
// "verify with the provider" note.

import type { Category } from './compare';

export const AS_OF = '2026-08';

// One Alfursan mile's typical cash value (halalas) at ECONOMY redemptions —
// public valuations put the band at ~USD 0.008–0.012 (≈3.0–4.5 halalas),
// with economy awards often landing lower. Used to price miles-card rewards.
export const MILE_VALUE_SAR = 0.03;

export const CATEGORIES: Category[] = [
  // ── ✈️ FLYING — the mile as a unit vs the riyal as a unit ────────────
  {
    id: 'flying',
    icon: '✈️',
    name: { ar: 'الطيران', en: 'Flying' },
    scheme: {
      kind: 'miles',
      question: {
        ar: 'الميل وحدة عملة — فهل يشتري استبدالُك أكثر مما يشتريه الريال؟',
        en: 'A mile is a currency unit — does your redemption buy more than the riyal would?',
      },
      defaultOfferHalalas: 1.5,
      programs: [
        {
          id: 'alfursan',
          name: { ar: 'الفرسان — السعودية', en: 'Alfursan — Saudia' },
          typicalHalalas: [3.0, 4.5],
          benchmarkHalalas: 1.5,
          earnExample: {
            ar: 'أسرع اكتساب بالبطاقات: الراجحي الفرسان (ميل/2.5 ريال محلياً)، الرياض الفرسان (ميل/1.5 ريال)',
            en: 'Fastest earn via cards: AlRajhi Alfursan (1 mi/SAR 2.5 local), Riyad Alfursan (1 mi/SAR 1.5)',
          },
          note: {
            ar: 'أعلى قيمة في درجات الأعمال والرحلات الطويلة؛ الاقتصادية غالباً أدنى النطاق',
            en: 'Best value on business class & long-haul; economy usually sits at the low end',
          },
        },
        {
          id: 'nasmiles',
          name: { ar: 'ناس مايلز — طيران ناس', en: 'nasmiles — flynas' },
          typicalHalalas: [0.8, 1.5],
          benchmarkHalalas: 1.0,
          earnExample: {
            ar: 'تُكتسب من رحلات طيران ناس وشركائه؛ قيمتها تتغيّر مع العروض',
            en: 'Earned on flynas flights and partners; value moves with promotions',
          },
          note: {
            ar: 'برنامج طيران اقتصادي — قيمة النقطة أصغر وتقديرنا لها أوسع نطاقاً',
            en: 'A low-cost-carrier programme — smaller unit value, wider estimate band',
          },
        },
      ],
    },
  },

  // ── 💳 CARDS — actual Saudi cards, net cost at your monthly spend ────
  {
    id: 'cards',
    icon: '💳',
    name: { ar: 'البطاقات', en: 'Cards' },
    scheme: {
      kind: 'usage',
      question: {
        ar: 'برسومها الحقيقية ومكافآتها الحقيقية — أي بطاقة سعودية تعيد لك أكثر؟',
        en: 'Real fees, real rewards — which Saudi card nets you more?',
      },
      unit: { ar: 'ريال تنفقه بالبطاقة شهرياً', en: 'SAR you spend on the card a month' },
      unitShort: { ar: 'ريال', en: 'SAR' },
      minVolume: 1000, maxVolume: 30000, step: 500, defaultVolume: 8000,
      defaults: ['sab-cashback', 'alrajhi-alfursan-infinite'],
      options: [
        { id: 'sab-cashback', icon: '💳', name: { ar: 'ساب — فيزا استرداد نقدي', en: 'SAB — Visa Cashback' },
          note: { ar: 'بلا رسوم سنوية · استرداد حتى 3.25%', en: 'No annual fee · up to 3.25% cashback' },
          fixedMonthly: [], perUnit: [{ label: { ar: 'استرداد نقدي 3.25%', en: '3.25% cashback' }, amount: -0.0325 }] },
        { id: 'snb-cashback', icon: '💳', name: { ar: 'الأهلي SNB — ماستركارد استرداد', en: 'SNB AlAhli — Cashback Mastercard' },
          note: { ar: 'بلا رسوم سنوية · استرداد حتى 2.8%', en: 'No annual fee · up to 2.8% cashback' },
          fixedMonthly: [], perUnit: [{ label: { ar: 'استرداد نقدي 2.8%', en: '2.8% cashback' }, amount: -0.028 }] },
        { id: 'anb-cashback-plus', icon: '💰', name: { ar: 'العربي ANB — كاش باك بلس', en: 'ANB — Cashback Plus' },
          note: { ar: 'رسوم 400 ريال/سنة · استرداد حتى 3.75%', en: 'SAR 400/yr fee · up to 3.75% cashback' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 33.3 }],
          perUnit: [{ label: { ar: 'استرداد نقدي 3.75%', en: '3.75% cashback' }, amount: -0.0375 }] },
        { id: 'bsf-cashback-sig', icon: '💰', name: { ar: 'الفرنسي BSF — كاش باك سيجنتشر', en: 'BSF — Cashback Signature' },
          note: { ar: 'رسوم 500 ريال/سنة · استرداد حتى 3.75%', en: 'SAR 500/yr fee · up to 3.75% cashback' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 41.7 }],
          perUnit: [{ label: { ar: 'استرداد نقدي 3.75%', en: '3.75% cashback' }, amount: -0.0375 }] },
        { id: 'alrajhi-cashback-plat', icon: '💳', name: { ar: 'الراجحي — كاش باك بلس بلاتينية', en: 'AlRajhi — Cashback Plus Platinum' },
          note: { ar: 'رسوم 250 ريال/سنة · استرداد حتى 2.2%', en: 'SAR 250/yr fee · up to 2.2% cashback' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 20.8 }],
          perUnit: [{ label: { ar: 'استرداد نقدي 2.2%', en: '2.2% cashback' }, amount: -0.022 }] },
        { id: 'riyad-hilal-plat', icon: '💳', name: { ar: 'الرياض — الهلال بلاتينية استرداد', en: 'Riyad — Al-Hilal Platinum Cashback' },
          note: { ar: 'رسوم 300 ريال/سنة · استرداد حتى 3.38%', en: 'SAR 300/yr fee · up to 3.38% cashback' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 25 }],
          perUnit: [{ label: { ar: 'استرداد نقدي 3.38%', en: '3.38% cashback' }, amount: -0.0338 }] },
        { id: 'enbd-mazeed-plat', icon: '💳', name: { ar: 'الإمارات دبي الوطني — مزيد بلاتينية', en: 'Emirates NBD — Mazeed Platinum' },
          note: { ar: 'رسوم 200 ريال/سنة · استرداد حتى 2.99%', en: 'SAR 200/yr fee · up to 2.99% cashback' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 16.7 }],
          perUnit: [{ label: { ar: 'استرداد نقدي 2.99%', en: '2.99% cashback' }, amount: -0.0299 }] },
        { id: 'saib-plat-cashback', icon: '💳', name: { ar: 'السعودي للاستثمار — بلاتينية استرداد', en: 'SAIB — Platinum Cashback' },
          note: { ar: 'رسوم 399 ريال/سنة · استرداد حتى 2.49%', en: 'SAR 399/yr fee · up to 2.49% cashback' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 33.3 }],
          perUnit: [{ label: { ar: 'استرداد نقدي 2.49%', en: '2.49% cashback' }, amount: -0.0249 }] },
        { id: 'riyad-world-elite', icon: '💎', name: { ar: 'الرياض — الهلال وورلد إيليت', en: 'Riyad — Al-Hilal World Elite' },
          note: { ar: 'رسوم 3,000 ريال/سنة · استرداد حتى 4.11%', en: 'SAR 3,000/yr fee · up to 4.11% cashback' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 250 }],
          perUnit: [{ label: { ar: 'استرداد نقدي 4.11%', en: '4.11% cashback' }, amount: -0.0411 }] },
        // Miles cards — rewards priced at ~3 halalas per Alfursan mile, local earn rates
        { id: 'alrajhi-alfursan-infinite', icon: '✈️', name: { ar: 'الراجحي — الفرسان إنفينيت', en: 'AlRajhi — Alfursan Infinite' },
          note: { ar: 'رسوم 1,000 ريال/سنة · ميل/2.5 ريال محلياً (≈1.2% بقيمة 3 هللات للميل)', en: 'SAR 1,000/yr fee · 1 mi/SAR 2.5 local (≈1.2% at 3 halalas/mile)' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 83.3 }],
          perUnit: [{ label: { ar: 'قيمة الأميال المكتسبة', en: 'Value of miles earned' }, amount: -(MILE_VALUE_SAR / 2.5) }] },
        { id: 'riyad-alfursan-infinite', icon: '✈️', name: { ar: 'الرياض — الفرسان إنفينيت', en: 'Riyad — Alfursan Infinite' },
          note: { ar: 'رسوم 1,500 ريال/سنة · ميل/1.5 ريال محلياً (≈2% بقيمة 3 هللات للميل)', en: 'SAR 1,500/yr fee · 1 mi/SAR 1.5 local (≈2% at 3 halalas/mile)' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 125 }],
          perUnit: [{ label: { ar: 'قيمة الأميال المكتسبة', en: 'Value of miles earned' }, amount: -(MILE_VALUE_SAR / 1.5) }] },
        { id: 'sab-alfursan-mc', icon: '✈️', name: { ar: 'ساب — الفرسان ماستركارد', en: 'SAB — Alfursan Mastercard' },
          note: { ar: 'رسوم 1,400 ريال/سنة · ميل/2 ريال محلياً (≈1.5% بقيمة 3 هللات للميل)', en: 'SAR 1,400/yr fee · 1 mi/SAR 2 local (≈1.5% at 3 halalas/mile)' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 116.7 }],
          perUnit: [{ label: { ar: 'قيمة الأميال المكتسبة', en: 'Value of miles earned' }, amount: -(MILE_VALUE_SAR / 2) }] },
        { id: 'snb-travel-infinite', icon: '✈️', name: { ar: 'الأهلي SNB — ترافل إنفينيت', en: 'SNB — Travel Infinite' },
          note: { ar: 'رسوم 1,750 ريال/سنة · ميل/1.67 ريال محلياً (≈1.8% بقيمة 3 هللات للميل)', en: 'SAR 1,750/yr fee · 1 mi/SAR 1.67 local (≈1.8% at 3 halalas/mile)' },
          fixedMonthly: [{ label: { ar: 'الرسوم السنوية ÷ 12', en: 'Annual fee ÷ 12' }, amount: 145.8 }],
          perUnit: [{ label: { ar: 'قيمة الأميال المكتسبة', en: 'Value of miles earned' }, amount: -(MILE_VALUE_SAR / 1.67) }] },
      ],
    },
  },

  // ── 🚗 TRANSPORTATION ────────────────────────────────────────────────
  {
    id: 'transport',
    icon: '🚗',
    name: { ar: 'التنقّل', en: 'Transportation' },
    scheme: {
      kind: 'usage',
      question: {
        ar: 'هل امتلاك سيارة أرخص فعلاً من أوبر/كريم على نمط تنقّلك؟',
        en: 'Is owning actually cheaper than Uber/Careem for how much you move?',
      },
      unit: { ar: 'كيلومتراً تقطعه شهرياً', en: 'kilometres you travel a month' },
      unitShort: { ar: 'كم', en: 'km' },
      minVolume: 100, maxVolume: 3000, step: 50, defaultVolume: 900,
      defaults: ['own-sedan', 'ride-hailing'],
      options: [
        { id: 'own-sedan', icon: '🚗', name: { ar: 'سيارة سيدان مملوكة', en: 'Owned sedan' },
          note: { ar: 'سيارة بـ 85 ألف ريال تُستهلك على 8 سنوات، تأمين وصيانة نموذجيان', en: 'SAR 85K car depreciated over 8 years, typical insurance & maintenance' },
          fixedMonthly: [
            { label: { ar: 'استهلاك قيمة السيارة', en: 'Depreciation' }, amount: 885 },
            { label: { ar: 'تأمين', en: 'Insurance' }, amount: 210 },
            { label: { ar: 'صيانة ومواقف', en: 'Maintenance & parking' }, amount: 220 },
          ],
          perUnit: [{ label: { ar: 'وقود', en: 'Fuel' }, amount: 0.24 }] },
        { id: 'own-suv', icon: '🚙', name: { ar: 'دفع رباعي مملوك', en: 'Owned SUV' },
          note: { ar: 'سيارة بـ 140 ألف ريال على 8 سنوات', en: 'SAR 140K SUV over 8 years' },
          fixedMonthly: [
            { label: { ar: 'استهلاك قيمة السيارة', en: 'Depreciation' }, amount: 1460 },
            { label: { ar: 'تأمين', en: 'Insurance' }, amount: 320 },
            { label: { ar: 'صيانة ومواقف', en: 'Maintenance & parking' }, amount: 280 },
          ],
          perUnit: [{ label: { ar: 'وقود', en: 'Fuel' }, amount: 0.34 }] },
        { id: 'ride-hailing', icon: '📱', name: { ar: 'أوبر / كريم', en: 'Uber / Careem' },
          note: { ar: 'متوسط تعرفة المدن السعودية', en: 'Typical Saudi city fares' },
          fixedMonthly: [],
          perUnit: [{ label: { ar: 'تعرفة الرحلات', en: 'Ride fares' }, amount: 1.9 }] },
      ],
    },
  },

  // ── 🍽 FOOD ──────────────────────────────────────────────────────────
  {
    id: 'food',
    icon: '🍽',
    name: { ar: 'الطعام', en: 'Food' },
    scheme: {
      kind: 'usage',
      question: {
        ar: 'كالو يوفّر وقتك — لكن كم يكلّف فعلاً مقابل الطبخ أو التطبيقات؟',
        en: 'Calo saves your time — but what does it really cost vs cooking or the apps?',
      },
      unit: { ar: 'وجبة شهرياً', en: 'meals a month' },
      unitShort: { ar: 'وجبة', en: 'meals' },
      minVolume: 10, maxVolume: 90, step: 5, defaultVolume: 40,
      defaults: ['home-cooking', 'calo'],
      options: [
        { id: 'home-cooking', icon: '🍳', name: { ar: 'طبخ منزلي', en: 'Home cooking' },
          note: { ar: 'مقاضٍ لوجبة متوازنة + أساسيات المطبخ', en: 'Groceries for a balanced meal + pantry staples' },
          fixedMonthly: [{ label: { ar: 'أساسيات المطبخ الشهرية', en: 'Pantry staples' }, amount: 120 }],
          perUnit: [{ label: { ar: 'مقاضي الوجبة', en: 'Groceries per meal' }, amount: 11 }] },
        { id: 'calo', icon: '🥗', name: { ar: 'كالو — اشتراك وجبات', en: 'Calo — meal subscription' },
          note: { ar: 'خطط كالو الشهرية في السعودية توازي نحو 30–35 ريالاً للوجبة (شاملة التوصيل)', en: 'Calo monthly plans in Saudi work out to ~SAR 30–35 per meal, delivery included' },
          fixedMonthly: [],
          perUnit: [{ label: { ar: 'سعر الوجبة', en: 'Per meal' }, amount: 32 }] },
        { id: 'delivery-apps', icon: '🛵', name: { ar: 'هنقرستيشن / جاهز', en: 'HungerStation / Jahez' },
          note: { ar: 'وجبة مطعم متوسطة + رسوم توصيل وخدمة', en: 'Average restaurant meal + delivery & service fees' },
          fixedMonthly: [],
          perUnit: [{ label: { ar: 'الوجبة مع التوصيل', en: 'Meal + delivery' }, amount: 48 }] },
      ],
    },
  },
];
