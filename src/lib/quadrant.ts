// src/lib/quadrant.ts
// The A→B→C→D "where you stand" diagnosis, shared between the Today
// dashboard's quadrant map and the home profile card. One rule everywhere:
// same inputs → same quadrant, so the product never disagrees with itself.

export type QuadKey = 'A' | 'B' | 'C' | 'D';

export interface QuadCopy {
  title: string;
  mood: string; // the situation in a few words (fits the map's small print)
  meaning: string; // what being here means, in one plain sentence
  move: string; // the single move that matters most from here
}

export const QUADRANT_META: Record<QuadKey, { icon: string; ar: QuadCopy; en: QuadCopy }> = {
  A: {
    icon: '🌱',
    ar: {
      title: 'وضع البناء',
      mood: 'دخل وأصول في بدايتهما',
      meaning: 'دخلك وأصولك ما زالا في البداية — وجودك هنا يعني أن مهمتك الأولى بناء مصدر دخل وأول أصولك.',
      move: 'ولّد دخلاً وابنِ أول أصولك',
    },
    en: {
      title: 'Build mode',
      mood: 'Little income or assets yet',
      meaning: "Little income or assets yet — being here means your first job is building an income source and your first assets.",
      move: 'Generate income & first assets',
    },
  },
  B: {
    icon: '🍂',
    ar: {
      title: 'التعثّر',
      mood: 'المصروف يتجاوز الدخل',
      meaning: 'مصروفك يتجاوز دخلك والفجوة تُسدّ من أصولك — وجودك هنا يعني أن الأولوية قلبُ المعادلة قبل أن تتآكل ثروتك.',
      move: 'اقلب المعادلة',
    },
    en: {
      title: 'Falling behind',
      mood: 'Outflow exceeds income',
      meaning: 'Outflow exceeds income and the gap eats into your assets — being here means priority one is flipping that balance.',
      move: 'Flip the balance',
    },
  },
  C: {
    icon: '⚖️',
    ar: {
      title: 'التعادل',
      mood: 'يغطي التكاليف بلا فائض',
      meaning: 'دخلك يغطي مصاريفك بلا فائض يُذكر — وجودك هنا يعني أن خطوتك القادمة صنعُ فائض شهري وحمايته.',
      move: 'اصنع فائضاً واحمِه',
    },
    en: {
      title: 'Break-even',
      mood: 'Covers costs, nothing left',
      meaning: 'Income covers costs with almost nothing left — being here means your next step is creating a monthly surplus and protecting it.',
      move: 'Create surplus & protect it',
    },
  },
  D: {
    icon: '🌳',
    ar: {
      title: 'الوفرة',
      mood: 'فائض ثابت جاهز للتشغيل',
      meaning: 'لديك فائض ثابت بعد المصاريف — وجودك هنا يعني أن اللعبة الآن تشغيلُ هذا الفائض ومضاعفته.',
      move: 'ضاعِف الفائض',
    },
    en: {
      title: 'Abundance',
      mood: 'Durable surplus to deploy',
      meaning: 'A durable surplus is left after costs — being here means the game now is deploying that surplus and multiplying it.',
      move: 'Multiply the surplus',
    },
  },
};

// Same thresholds the Today dashboard has always used.
export function diagnoseQuadrant(avgIncome: number, avgExpenses: number, totalAssets: number): QuadKey | null {
  if (avgIncome <= 0 && avgExpenses <= 0) return null;
  if (avgIncome <= 0) return 'A';
  const surplus = avgIncome - avgExpenses;
  if (surplus < 0) return totalAssets < 3 * avgExpenses ? 'A' : 'B';
  if (surplus / avgIncome < 0.1) return 'C';
  return 'D';
}
