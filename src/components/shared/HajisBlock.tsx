'use client';

// The hājis — the person's biggest concerns these days, before any number.
// Shared by home (T-home · D1 hero, D2 strip) and Today (T2 · D1), so the
// concern feature is ONE source everywhere. Concerns persist in
// localStorage (mm-concern) and each picked concern ties one live number
// from the real picture to the tool built for exactly that pain.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useDepth } from '@/components/shared/ExperienceMode';

export interface HajisFin {
  income: number;
  expenses: number;
  liabilities: number;
  cash: number;
}

function fmt(n: number) { return Math.round(n).toLocaleString(); }

export default function HajisBlock({ fin, mode }: { fin: HajisFin | null; mode: 'hero' | 'strip' }) {
  const router = useRouter();
  const { setDepth } = useDepth();
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const sar = t('common.sar');
  const money = (n: number) => (ar ? `${fmt(n)} ${sar}` : `${sar} ${fmt(n)}`);

  const [concern, setConcern] = useState<{ types: string[]; text: string }>({ types: [], text: '' });
  const [concernEdit, setConcernEdit] = useState(false);
  const [concernDraft, setConcernDraft] = useState<{ types: string[]; text: string }>({ types: [], text: '' });
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('mm-concern');
      if (raw) {
        const parsed = JSON.parse(raw);
        const c = {
          types: Array.isArray(parsed.types) ? parsed.types : parsed.type ? [parsed.type] : [],
          text: parsed.text ?? '',
        };
        setConcern(c);
        setConcernDraft(c);
      }
    } catch { /* ignore */ }
  }, []);
  const saveConcern = (c: { types: string[]; text: string }) => {
    setConcern(c);
    setConcernEdit(false);
    try { window.localStorage.setItem('mm-concern', JSON.stringify(c)); } catch { /* ignore */ }
  };

  return (
    <>
      {(() => {
        // The taxonomy follows what Saudis actually complain about online —
        // ranked social-listening pains first (salary vanishing, BNPL
        // installments, rent, failing to save…), the named life goals after.
        // Every tie() weaves ONE live number from their real picture and
        // lands on the existing tool built for exactly that pain.
        const TYPES: { k: string; icon: string; label: string; tie: () => { line: string; cta: string; href: string } }[] = [
          {
            k: 'vanish', icon: '💨', label: L('الراتب يختفي', 'My salary just disappears'),
            tie: () => ({
              line: fin && fin.income > 0
                ? L(`من كل ريال في راتبك، ${Math.min(100, Math.round((fin.expenses / fin.income) * 100))}٪ محجوز سلفاً قبل أن تختار — الاختفاء ليس غموضاً، بل التزامات لم تُرَ في شاشة واحدة.`, `Of every riyal you earn, ${Math.min(100, Math.round((fin.expenses / fin.income) * 100))}% is spoken for before you choose — the vanishing isn't a mystery, it's commitments never seen on one screen.`)
                : L('الراتب لا يختفي — يتسرّب في اختيارات صغيرة متكررة لا يجمعها أحد في شاشة واحدة.', "A salary doesn't vanish — it leaks through small recurring choices nobody gathers on one screen."),
              cta: L('افتح كومة اليوم ←', 'Open the Daily Stack →'), href: '/daily-stack',
            }),
          },
          {
            k: 'installments', icon: '🧾', label: L('أقساط تأكل الراتب القادم', 'Installments eating next month'),
            tie: () => ({
              line: L('مئة هنا ومئة وخمسون هناك تبدو بريئة — حتى تكتشف أن جزءاً من راتبك القادم مصروفٌ سلفاً. اجمع كل قسطٍ واشتراكٍ في شاشة واحدة لترى كم بقي لك فعلاً.', 'SAR 100 here and 150 there feels harmless — until you find a slice of next month’s salary already spent. Gather every installment and subscription on one screen and see what’s truly yours.'),
              cta: L('اجمعها في الالتزامات ←', 'Gather them in Commitments →'), href: '/commitments',
            }),
          },
          {
            k: 'rent', icon: '🏘️', label: L('الإيجار يأكل الدخل', 'Rent eats my income'),
            tie: () => ({
              line: fin && fin.income > 0
                ? L(`السكن الصحي يأخذ حتى ٣٠٪ من الدخل — قِس سكنك على دخلك أنت، وقارن مستوى معيشتك بالمتوسط الوطني.`, 'Healthy housing takes up to 30% of income — measure your housing against your income, and your standard of living against the national average.')
                : L('السؤال ليس «هل الإيجار غالٍ؟» بل «كم يأخذ من دخلك أنت؟» — النسبة تحسم ما لا يحسمه الرقم.', 'The question isn’t "is rent expensive?" but "how much of your income does it take?" — the ratio settles what the number can’t.'),
              cta: L('قِس مستوى معيشتك ←', 'Measure your standard of living →'), href: '/standard-of-living',
            }),
          },
          {
            k: 'saving', icon: '💸', label: L('دخلٌ جيد ولا أدّخر', 'Decent income, no savings'),
            tie: () => ({
              line: fin && fin.income > 0
                ? L(`تدّخر حالياً ${Math.max(0, Math.round(((fin.income - fin.expenses) / fin.income) * 100))}٪ من دخلك — والعقدة نادراً ما تكون الدخل؛ غالباً هي تضخم نمط الحياة يزحف بصمت مع كل زيادة.`, `You currently save ${Math.max(0, Math.round(((fin.income - fin.expenses) / fin.income) * 100))}% of your income — and the knot is rarely the income; it’s usually lifestyle creep advancing quietly with every raise.`)
                : L('الدخل الجيد الذي لا يتراكم له تفسير واحد غالباً: نمط حياةٍ كبر بصمت مع كل زيادة.', 'A decent income that never accumulates usually has one explanation: a lifestyle that quietly grew with every raise.'),
              cta: L('اكشف زحف نمط الحياة ←', 'Expose the lifestyle creep →'), href: '/past',
            }),
          },
          {
            k: 'loan', icon: '💳', label: L('ديونٌ تشابكت عليّ', 'Debts I’ve lost track of'),
            tie: () => ({
              line: fin && fin.liabilities > 0
                ? L(`التزاماتك اليوم ${money(fin.liabilities)} — قرض وبطاقة وتمويل سيارة تتشابك حتى لا تعرف كم أنت مكشوف. شاشة واحدة ترتّبها، وترتيبُ سدادٍ أذكى من العشوائية.`, `Your liabilities stand at ${money(fin.liabilities)} — a loan, a card, car finance tangling until you can’t tell your exposure. One screen untangles them, with a payoff order smarter than random.`)
                : L('أثقل ما في الدين جهله — سجّله كاملاً في شاشة واحدة وسيصغر في عينك.', 'The heaviest part of debt is not knowing it — log it fully on one screen and it shrinks in your eyes.'),
              cta: L('رتّب السداد في الشلال ←', 'Order the payoff in the Waterfall →'), href: '/waterfall',
            }),
          },
          {
            k: 'marriage', icon: '💍', label: L('زواجٌ على الأبواب', 'Marriage on the horizon'),
            tie: () => ({
              line: L('المهر والحفل والتأثيث والإيجار — الزواج مشروعٌ بأرقام معلومة، لا مجهولٌ يُرهب. جرّبه في «ماذا لو» بالأرقام قبل أن تعيشه، وسيخبرك متى يصير ممكناً.', 'Mahr, wedding, furnishing, rent — marriage is a project with knowable numbers, not a terror of unknowns. Play it in What-If before living it, and it tells you when it becomes possible.'),
              cta: L('جرّبه في ماذا لو ←', 'Model it in What-If →'), href: '/what-if',
            }),
          },
          {
            k: 'house', icon: '🏠', label: L('بيت أتملكه', 'A home of my own'),
            tie: () => ({
              line: fin && fin.income - fin.expenses > 0
                ? L(`فائضك الشهري ${money(fin.income - fin.expenses)} — كل شهر انضباط يقرّب الدفعة الأولى خطوة.`, `Your monthly surplus is ${money(fin.income - fin.expenses)} — every disciplined month walks the down payment one step closer.`)
                : L('الدفعة الأولى تبدأ من فائضٍ يُصنع — والبيت يستحق أن يُصنع له.', 'The down payment starts from a surplus made on purpose — and a home is worth making one for.'),
              cta: L('اجعل الدفعة صندوق هدف ←', 'Make the down payment a goal fund →'), href: '/goal-fund',
            }),
          },
          {
            k: 'school', icon: '🏫', label: L('مدارس العيال', "The kids' schools"),
            tie: () => ({
              line: L('رسوم المدارس موعدٌ يتكرر كل سنة — والذي يُدَّخر له باسمٍ ووتيرة لا يفاجئ أحداً.', "School fees are an appointment that returns every year — saved for by name and pace, they surprise no one."),
              cta: L('افتح لها صندوقاً باسمها ←', 'Open a fund in their name →'), href: '/goal-fund',
            }),
          },
          {
            k: 'car', icon: '🚗', label: L('هل أقدر على السيارة؟', 'Can I afford the car?'),
            tie: () => ({
              line: L('«القسط ١,٢٠٠ ريال» ليس السعر الحقيقي — التأمين والوقود والصيانة والقسط معاً هي ما تأكله السيارة من دخلك فعلاً. القدرة على التمويل شيء، والقدرة على التحمّل بارتياح شيء آخر.', '"SAR 1,200 a month" isn’t the real price — insurance, fuel, maintenance and the installment together are what the car truly takes from your income. Qualifying for finance is one thing; affording it comfortably is another.'),
              cta: L('قارن وقرّر ←', 'Compare & decide →'), href: '/compare',
            }),
          },
          {
            k: 'travel', icon: '✈️', label: L('سفرة العائلة', 'The family trip'),
            tie: () => ({
              line: L('السفرة التي لها صندوقٌ يمتلئ شهرياً تُحجز براحة بال — لا ببطاقة ائتمان.', 'A trip with its own monthly-fed fund gets booked with peace of mind — not with a credit card.'),
              cta: L('ابدأ صندوق السفرة ←', 'Start the trip fund →'), href: '/goal-fund',
            }),
          },
          {
            k: 'income', icon: '💼', label: L('هل دخلي يكفي أصلاً؟', 'Is my income even enough?'),
            tie: () => ({
              line: fin && fin.income - fin.expenses < 0
                ? L(`الشهر الحالي ينقصه ${money(Math.abs(fin.income - fin.expenses))} — لكن «هل يكفي؟» لا يجيب عنها الراتب وحده، بل علاقته بمدينتك وعائلتك والتزاماتك.`, `This month runs ${money(Math.abs(fin.income - fin.expenses))} short — but "is it enough?" is never answered by the salary alone; it's the salary against your city, family and commitments.`)
                : L('«هل ٨ آلاف تكفي؟» سؤالٌ لا يُجاب بالرقم — بل بعلاقة الرقم بمدينتك وعائلتك والتزاماتك أنت.', '"Is 8k enough?" is a question no number answers — only the number measured against your city, your family, your commitments.'),
              cta: L('قِس دخلك على حياتك ←', 'Measure your income against your life →'), href: '/standard-of-living',
            }),
          },
          {
            k: 'safety', icon: '🛟', label: L('لو انقطع الراتب؟', 'What if the salary stopped?'),
            tie: () => ({
              line: fin && fin.expenses > 0
                ? L(`لو توقف راتبك اليوم، يغطيك نقدك ${(fin.cash / fin.expenses).toFixed(1)} شهراً من حياتك كما هي — والطمأنينة تكتمل عند ستة.`, `If your salary stopped today, your cash carries your life as it is for ${(fin.cash / fin.expenses).toFixed(1)} months — full calm arrives at six.`)
                : L('الطمأنينة رقم: ستة أشهر مصاريف في مكان آمن — يبدأ بمعرفة كم تغطيك أشهرك اليوم.', 'Peace of mind is a number: six months of costs kept safe — starting with knowing how many months cover you today.'),
              cta: L('ابنِ صندوق الطوارئ ←', 'Build the emergency fund →'), href: '/goal-fund',
            }),
          },
          {
            k: 'umrah', icon: '🕋', label: L('عمرة أو حج العائلة', "The family's Umrah or Hajj"),
            tie: () => ({
              line: L('أجمل الرحلات تُدَّخر لها بنية — صندوقٌ باسمها يجعل الموسم القادم قراراً لا أمنية.', 'The most beautiful journeys are saved for with intention — a named fund turns next season into a decision, not a wish.'),
              cta: L('افتح صندوقها ←', 'Open its fund →'), href: '/goal-fund',
            }),
          },
          {
            k: 'business', icon: '🚀', label: L('مشروعي الخاص', 'My own venture'),
            tie: () => ({
              line: L('المشروع يبدأ مرتين: مرة في رأسك، ومرة في «ماذا لو» — جرّب أثر ترك الراتب بالأرقام قبل أن تعيشه.', 'A venture starts twice: once in your head, once in What-If — try leaving the salary in numbers before living it.'),
              cta: L('جرّبه في ماذا لو ←', 'Try it in What-If →'), href: '/what-if',
            }),
          },
        ];
        const MAX_CONCERNS = 3;
        // The chosen concerns, in the order they were picked.
        const chosen = concern.types
          .map((k) => TYPES.find((x) => x.k === k))
          .filter((x): x is (typeof TYPES)[number] => !!x);
        const showPicker = mode === 'hero' && (concernEdit || (chosen.length === 0 && !concern.text));

        // D2 — the control room keeps the concerns as a compact strip: each
        // chip walks straight to its tool; the full hero lives at the surface
        if (mode === 'strip') {
          return (
            <div className="drv-story flex items-center gap-2 flex-wrap bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 mb-4">
              <span className="text-[10px] tracking-[0.12em] uppercase text-[var(--gold-text-strong)] font-semibold">
                {L('هواجسك', 'Your concerns')}
              </span>
              {chosen.length === 0 && !concern.text.trim() ? (
                <button
                  onClick={() => { setDepth(1); setConcernEdit(true); }}
                  className="text-xs text-[var(--green-dark)] font-medium"
                >
                  {L('حدّدها على السطح ←', 'Set them at the surface →')}
                </button>
              ) : (
                <>
                  {concern.text.trim() && (
                    <span className="text-xs text-[var(--ink-2)]">«{concern.text.trim()}»</span>
                  )}
                  {chosen.map((c) => (
                    <Link
                      key={c.k}
                      href={c.tie().href}
                      className="inline-flex items-center gap-1 text-[11px] border border-[var(--border-default)] rounded-full px-2.5 py-1 text-[var(--ink-2)] hover:border-[var(--gold)] hover:text-[var(--ink)] transition-colors"
                    >
                      <span>{c.icon}</span><span>{c.label}</span>
                    </Link>
                  ))}
                  <button
                    onClick={() => setDepth(1)}
                    title={L('اصعد إلى هاجسك', 'Surface to your concern')}
                    className="ms-auto text-[10px] text-[var(--muted)] hover:text-[var(--ink-2)] transition-colors"
                  >
                    {L('السطح ↑', 'surface ↑')}
                  </button>
                </>
              )}
            </div>
          );
        }
        const toggleDraftType = (k: string) => {
          const has = concernDraft.types.includes(k);
          if (!has && concernDraft.types.length >= MAX_CONCERNS) return; // three is the cap
          setConcernDraft({
            ...concernDraft,
            types: has ? concernDraft.types.filter((t) => t !== k) : [...concernDraft.types, k],
          });
        };

        if (showPicker) {
          return (
            <div className="drv-story bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl mt-4 mb-4 p-5 sm:p-6 text-white">
              <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--gold)] font-semibold mb-1.5">
                {L('قبل الأرقام', 'Before the numbers')}
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold mb-1.5">
                {L('ما أكبر هاجس يشغل بالك هذه الأيام؟', "What's the biggest thing on your mind these days?")}
              </h2>
              <p className="text-[11px] text-white/70 leading-relaxed mb-4 max-w-xl">
                {L(
                  'الناس لا تفكر بأرقام — تفكر بشيء: بيت، قرض، مدارس، سفرة. اختر حتى ثلاثة هواجس أو اكتبها بكلماتك، وسيدور المنتج كله حولها.',
                  "People don't think in numbers — they think of a thing: a home, a loan, schools, a trip. Pick up to three concerns or write them in your own words, and the whole product turns around them."
                )}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TYPES.map((x) => {
                  const picked = concernDraft.types.includes(x.k);
                  const full = !picked && concernDraft.types.length >= MAX_CONCERNS;
                  return (
                    <button
                      key={x.k}
                      onClick={() => toggleDraftType(x.k)}
                      aria-pressed={picked}
                      disabled={full}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all ${
                        picked
                          ? 'bg-[var(--gold)] border-[var(--gold)] text-[#2A1F05] font-semibold'
                          : full
                            ? 'border-white/10 text-white/30'
                            : 'border-white/25 text-white/80 hover:border-white/50'
                      }`}
                    >
                      <span>{x.icon}</span><span>{x.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-white/45 mb-3.5">
                {concernDraft.types.length === 0
                  ? L('اختر حتى ثلاثة', 'Pick up to three')
                  : L(`اخترت ${concernDraft.types.length} من ٣`, `${concernDraft.types.length} of 3 picked`)}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={concernDraft.text}
                  onChange={(e) => setConcernDraft({ ...concernDraft, text: e.target.value })}
                  placeholder={L('…أو اكتبه كما تحكيه لأعز أصحابك', '…or write it the way you’d tell your best friend')}
                  className="flex-1 min-w-[220px] bg-white/10 border border-white/25 rounded-full px-4 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:border-[var(--gold)]"
                />
                <button
                  onClick={() => saveConcern(concernDraft)}
                  disabled={concernDraft.types.length === 0 && !concernDraft.text.trim()}
                  className="text-xs font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-full px-4 py-2 disabled:opacity-40"
                >
                  {concernDraft.types.length > 1 ? L('هذه هواجسي ✓', 'These are my concerns ✓') : L('هذا هاجسي ✓', "That's my concern ✓")}
                </button>
                {(concern.types.length > 0 || concern.text) && (
                  <button onClick={() => setConcernEdit(false)} className="text-[11px] text-white/60 hover:text-white">
                    {L('إلغاء', 'Cancel')}
                  </button>
                )}
              </div>
            </div>
          );
        }

        const many = chosen.length > 1;
        return (
          <div className="drv-story bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] rounded-2xl mt-4 mb-4 p-5 sm:p-6 text-white relative overflow-hidden">
            <div className="absolute -top-12 -end-12 w-44 h-44 rounded-full bg-[var(--gold)]/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--gold)] font-semibold">
                  {many
                    ? L('أكبر هواجس تشغل بالك هذه الأيام', 'The biggest things on your mind these days')
                    : L('أكبر هاجس يشغل بالك هذه الأيام', 'The biggest thing on your mind these days')}
                </div>
                <button
                  onClick={() => { setConcernDraft(concern); setConcernEdit(true); }}
                  className="text-[10px] text-white/50 hover:text-white border border-white/20 hover:border-white/40 rounded-full px-2.5 py-1 transition-colors"
                >
                  {many ? L('غيّرها', 'Change them') : L('غيّره', 'Change it')}
                </button>
              </div>

              {/* the written hājis leads when present; the picked ones follow */}
              {concern.text.trim() && (
                <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-snug mb-2.5">
                  {`«${concern.text.trim()}»`}
                </h2>
              )}
              {!concern.text.trim() && chosen.length === 1 && (
                <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-snug mb-2.5">
                  <span className="me-2">{chosen[0].icon}</span>
                  {chosen[0].label}
                </h2>
              )}

              {/* each concern gets its own answer: the live line + the tool
                  built for exactly that pain */}
              {chosen.length > 0 && (
                <div className={many ? 'divide-y divide-white/10' : ''}>
                  {chosen.map((c) => {
                    const tie = c.tie();
                    return (
                      <div key={c.k} className={many ? 'py-3 first:pt-0 last:pb-0' : ''}>
                        {(many || concern.text.trim()) && (
                          <div className="font-serif text-base font-bold mb-1">
                            <span className="me-1.5">{c.icon}</span>
                            {c.label}
                          </div>
                        )}
                        <p className="text-xs text-white/80 leading-relaxed mb-2 max-w-xl">{tie.line}</p>
                        <Link href={tie.href} className="inline-block text-xs font-semibold text-[#2A1F05] bg-[var(--gold)] rounded-lg px-3.5 py-2">
                          {tie.cta}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}

              {chosen.length === 0 && concern.text.trim() && (
                <p className="text-xs text-white/80 leading-relaxed mb-3 max-w-xl">
                  {L(
                    'هاجسٌ بكلماتك سؤالٌ في جوهره — والعقل يقرأ أرقامك الحقيقية ويجيبك عمّا يعنيه لوضعك أنت.',
                    'A concern in your own words is really a question — and the Brain reads your real numbers and answers what it means for your situation.'
                  )}
                </p>
              )}

              {concern.text.trim() && (
                <div className={chosen.length > 0 ? 'mt-3 pt-3 border-t border-white/10' : ''}>
                  <button
                    onClick={() => {
                      // a written hājis is a question at heart — hand it to the
                      // Brain, together with any picked concerns for context
                      const names = chosen.map((c) => c.label).join(ar ? '، ' : ', ');
                      try {
                        window.sessionStorage.setItem('mm-ask', L(
                          `أكبر هواجسي هذه الأيام: «${concern.text.trim()}»${names ? ` — ومعها: ${names}` : ''}. اقرأ أرقامي وأخبرني ماذا يعني هذا لوضعي، ومن أين أبدأ؟`,
                          `The biggest things on my mind these days: "${concern.text.trim()}"${names ? ` — along with: ${names}` : ''}. Read my numbers and tell me what this means for my situation, and where do I start?`
                        ));
                      } catch { /* ignore */ }
                      router.push('/advisor');
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs rounded-lg px-3.5 py-2 border transition-colors ${
                      chosen.length > 0
                        ? 'border-white/25 text-white/85 hover:border-white/50'
                        : 'font-semibold text-[#2A1F05] bg-[var(--gold)] border-[var(--gold)]'
                    }`}
                  >
                    <span aria-hidden>🧠</span>
                    {L('اسأل العقل عن هاجسك ←', 'Ask the Brain about it →')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
