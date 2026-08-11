// src/lib/demoI18n.ts
// The demo personas' data lives in the mock database as plain English text
// (matching the production schema, where these columns hold whatever the
// real user typed). In Arabic mode the UI must still read fully Arabic, so
// display sites pass demo strings through this map — a known demo string
// gets its Arabic; anything else (a real user's own words) passes through
// untouched.

const MAP: Record<string, string> = {
  // ── profiles ───────────────────────────────────────────────────────────
  'CS student (KSU) · tutoring': 'طالبة علوم حاسب (جامعة الملك سعود) · تدريس خصوصي',
  'Private sector (banking)': 'قطاع خاص (مصرفي)',
  'Government (ministry)': 'قطاع حكومي (وزارة)',
  'Business owner (trading & contracting)': 'صاحب أعمال (تجارة ومقاولات)',
  'Riyadh': 'الرياض',

  // ── loans & cards ──────────────────────────────────────────────────────
  'Car loan (new sedan)': 'قرض سيارة (سيدان جديدة)',
  'Credit card balance (carried)': 'رصيد بطاقة ائتمانية (مدوَّر)',
  'Villa mortgage': 'تمويل عقاري (فيلا)',
  'Family car finance': 'تمويل سيارة العائلة',
  'Stock finance (Murabaha)': 'تمويل أسهم (مرابحة)',
  'Commercial financing (SME)': 'تمويل تجاري (منشأة صغيرة)',

  // ── goal funds ─────────────────────────────────────────────────────────
  'Emergency fund (6 months)': 'صندوق الطوارئ (6 أشهر)',
  "Kids' university fund": 'صندوق جامعة الأبناء',
  'Family Hajj': 'حج العائلة',
  'Extended-family Hajj': 'حج العائلة الكبيرة',

  // ── life phases · ليلى ─────────────────────────────────────────────────
  'A — Study & first income': 'أ — الدراسة وأول دخل',
  'Finish CS at KSU': 'إنهاء علوم الحاسب في جامعة الملك سعود',
  'Earn from tutoring & projects': 'دخل من التدريس الخصوصي والمشاريع',
  'Learn to invest small': 'تعلّم الاستثمار بمبالغ صغيرة',
  'Keep a 3-month cushion': 'الاحتفاظ باحتياطي ثلاثة أشهر',
  'Add SAR 200/mo to Tadawul': 'إضافة 200 ريال شهرياً إلى تداول',
  'Land a strong internship': 'الحصول على تدريب تعاوني قوي',
  'First SAR 10K': 'أول 10 آلاف ريال',
  'B — Launch career': 'ب — انطلاقة المسيرة',
  'First real salary': 'أول راتب حقيقي',
  'Move out': 'الاستقلال بالسكن',
  'Emergency fund': 'صندوق طوارئ',
  'Beat lifestyle creep': 'كبح تضخم نمط الحياة',
  'Save 20%+': 'ادخار 20% فأكثر',
  'Avoid car-loan trap': 'تجنّب فخ قرض السيارة',
  'SAR 100K': '100 ألف ريال',
  'C — Independence': 'ج — الاستقلال',
  'Senior tech role': 'منصب تقني رفيع',
  'Own place': 'سكن مملوك',
  'Serious investing': 'استثمار جاد',
  'Diversify': 'التنويع',
  'Buy vs rent': 'شراء أم إيجار',
  'Grow income': 'تنمية الدخل',
  'SAR 1M': 'مليون ريال',

  // ── life phases · فيصل ─────────────────────────────────────────────────
  'A — Escape the squeeze': 'أ — الخروج من الضائقة',
  'Fix the negative months': 'إصلاح الأشهر السالبة',
  'Right-size the car': 'سيارة على قدر الدخل',
  'Cut dead subscriptions': 'إلغاء الاشتراكات الميتة',
  'Get spending under income': 'إنزال المصروف تحت الدخل',
  'Build 3-month runway': 'بناء احتياطي ثلاثة أشهر',
  'Kill the card balance': 'تصفير رصيد البطاقة',
  'Back above zero → SAR 50K': 'العودة فوق الصفر ← 50 ألف ريال',
  'B — Build surplus': 'ب — بناء الفائض',
  'Promotion to senior analyst': 'ترقية إلى محلل أول',
  'Automate saving': 'أتمتة الادخار',
  'Start investing seriously': 'بدء الاستثمار بجدية',
  'Avoid lifestyle creep': 'تجنّب تضخم نمط الحياة',
  'SAR 300K': '300 ألف ريال',
  'C — Establish': 'ج — التأسيس',
  'Marriage & a home': 'زواج وبيت',
  'Property': 'عقار',
  'Down payment ready': 'دفعة أولى جاهزة',
  'Keep DBR healthy': 'إبقاء نسبة الالتزامات صحية',

  // ── life phases · ريم ──────────────────────────────────────────────────
  'A — Stabilize': 'أ — الاستقرار',
  'Home & family': 'البيت والأسرة',
  'Cover the essentials': 'تغطية الأساسيات',
  'Keep the mortgage current': 'انتظام أقساط التمويل العقاري',
  'Small emergency fund': 'صندوق طوارئ صغير',
  'B — Create surplus': 'ب — صناعة الفائض',
  'Open a real gap': 'فتح فجوة حقيقية بين الدخل والمصروف',
  'Secure kids’ education': 'تأمين تعليم الأبناء',
  'Start investing monthly': 'بدء استثمار شهري',
  'Engineer SAR 2,000/mo surplus': 'هندسة فائض 2,000 ريال شهرياً',
  'Automate the education fund': 'أتمتة صندوق التعليم',
  'Trim overlap in bills': 'تقليم التكرار في الفواتير',
  'SAR 600K': '600 ألف ريال',
  'C — Comfortable & giving': 'ج — راحة وعطاء',
  'Mortgage cleared': 'إغلاق التمويل العقاري',
  'Support the kids at university': 'دعم الأبناء في الجامعة',
  'Travel more': 'سفر أكثر',
  'Income-producing assets': 'أصول مدرّة للدخل',
  'Give generously': 'عطاء بسخاء',
  'SAR 1.5M': '1.5 مليون ريال',

  // ── life phases · خالد ─────────────────────────────────────────────────
  'A — Build the business': 'أ — بناء التجارة',
  'Survive & scale': 'الصمود ثم التوسع',
  'Reinvest everything': 'إعادة استثمار كل شيء',
  'Positive cash flow': 'تدفق نقدي موجب',
  'First asset': 'أول أصل',
  'First SAR 1M': 'أول مليون ريال',
  'B — Diversify': 'ب — التنويع',
  'Multiple income streams': 'مصادر دخل متعددة',
  'Property & Tadawul': 'عقار وتداول',
  'De-risk the business': 'خفض مخاطر التجارة',
  'Diversify concentration': 'تفكيك التركّز',
  'SAR 10M': '10 ملايين ريال',
  'C — Multiply & give': 'ج — المضاعفة والعطاء',
  'Deploy the surplus': 'تشغيل الفائض',
  'Family waqf': 'وقف عائلي',
  'Mentor the next generation': 'توجيه الجيل القادم',
  'Put idle cash to work': 'تشغيل النقد الخامل',
  'Establish the endowment': 'تأسيس الوقف',
  'Succession plan': 'خطة تعاقب',
  'SAR 20M+': 'أكثر من 20 مليون ريال',
};

// Arabic for known demo text; the original for everything else.
export function demoAr(text: string | null | undefined, ar: boolean): string {
  if (!text) return '';
  return ar ? (MAP[text] ?? text) : text;
}
