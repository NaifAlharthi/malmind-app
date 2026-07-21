// src/lib/demoData.ts
// Seed content used by onboarding to give a newly signed-up user a real,
// editable starting point saved to their own database rows — not demo-only
// state. Picking a persona writes these values into the real profiles and
// story_chapters tables for that user.

import { Profile, StoryChapter } from './types';

export interface PersonaSeed {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  avatarEmoji: string;
  description: string;
  descriptionAr: string;
  profile: Profile;
  chapters: (StoryChapter & { titleAr: string; noteAr: string })[];
}

export const PERSONAS: PersonaSeed[] = [
  {
    id: 'faisal',
    name: 'Faisal',
    nameAr: 'فيصل',
    role: 'Analyst at a Riyadh bank',
    roleAr: 'محلّل في بنك بالرياض',
    avatarEmoji: '👨🏻‍💼',
    description:
      'Fresh out of KSU, two years into his first real job. Good salary, new car, renting his own apartment.',
    descriptionAr:
      'حديث التخرّج من جامعة الملك سعود، وله سنتان في أول وظيفة حقيقية. راتب جيّد، وسيارة جديدة، ويستأجر شقّته الخاصّة.',
    profile: {
      name: 'Faisal',
      age: 25,
      city: 'Riyadh',
      employment: 'Private sector (banking)',
      monthlyIncome: 12000,
      persona: 'faisal',
    },
    chapters: [
      {
        id: 'c1',
        title: 'University years',
        titleAr: 'سنوات الجامعة',
        startYear: 2019,
        endYear: 2022,
        note: 'Studied at KSU, part-time work on the side.',
        noteAr: 'درس في جامعة الملك سعود، مع عمل جزئي على الجانب.',
        vividness: 'sketch',
      },
      {
        id: 'c2',
        title: 'First job at the bank',
        titleAr: 'أول وظيفة في البنك',
        startYear: 2022,
        endYear: 2026,
        note: 'Joined as a junior analyst, steady salary growth since.',
        noteAr: 'التحق محلّلاً مبتدئاً، ونما راتبه باطّراد منذ ذلك الحين.',
        vividness: 'clear',
      },
    ],
  },
  {
    id: 'sara',
    name: 'Sara',
    nameAr: 'سارة',
    role: 'Engineer at Aramco',
    roleAr: 'مهندسة في أرامكو',
    avatarEmoji: '👩🏻‍🔬',
    description:
      'Established on a strong corporate track in the Eastern Province. High income, growing savings.',
    descriptionAr:
      'راسخة في مسار مؤسّسي قويّ بالمنطقة الشرقية. دخل مرتفع، ومدّخرات متنامية.',
    profile: {
      name: 'Sara',
      age: 29,
      city: 'Dhahran',
      employment: 'Aramco (corporate)',
      monthlyIncome: 32000,
      persona: 'sara',
    },
    chapters: [
      {
        id: 'c1',
        title: 'Engineering degree',
        titleAr: 'شهادة الهندسة',
        startYear: 2015,
        endYear: 2019,
        note: 'Studied mechanical engineering, internship at Aramco.',
        noteAr: 'درست الهندسة الميكانيكية، مع تدريب في أرامكو.',
        vividness: 'sketch',
      },
      {
        id: 'c2',
        title: 'Joined Aramco full-time',
        titleAr: 'الالتحاق بأرامكو بدوام كامل',
        startYear: 2019,
        endYear: 2026,
        note: 'Steady promotions, strong benefits, growing investment portfolio.',
        noteAr: 'ترقيات مطّردة، ومزايا قويّة، ومحفظة استثمارية متنامية.',
        vividness: 'clear',
      },
    ],
  },
  {
    id: 'reem',
    name: 'Reem',
    nameAr: 'ريم',
    role: 'Government ministry employee',
    roleAr: 'موظّفة في وزارة حكومية',
    avatarEmoji: '👩🏻‍💻',
    description:
      'Stable mid-career role in Riyadh. Married with kids, a mortgage in progress.',
    descriptionAr:
      'وظيفة مستقرّة في منتصف المسار بالرياض. متزوّجة ولديها أطفال، ورهن عقاري قيد السداد.',
    profile: {
      name: 'Reem',
      age: 34,
      city: 'Riyadh',
      employment: 'Government (ministry)',
      monthlyIncome: 18000,
      persona: 'reem',
    },
    chapters: [
      {
        id: 'c1',
        title: 'Early career',
        titleAr: 'بداية المسار المهني',
        startYear: 2014,
        endYear: 2018,
        note: 'First government role, building a foundation.',
        noteAr: 'أول وظيفة حكومية، وبناء الأساس.',
        vividness: 'sketch',
      },
      {
        id: 'c2',
        title: 'Marriage and mortgage',
        titleAr: 'الزواج والرهن العقاري',
        startYear: 2018,
        endYear: 2022,
        note: 'Got married, took on a mortgage, growing family responsibilities.',
        noteAr: 'تزوّجت، وأخذت رهناً عقارياً، ومسؤوليات أسرية متنامية.',
        vividness: 'clear',
      },
      {
        id: 'c3',
        title: 'Present day',
        titleAr: 'الوقت الحاضر',
        startYear: 2022,
        endYear: 2026,
        note: 'Stable role, focused on kids education and paying down the mortgage.',
        noteAr: 'وظيفة مستقرّة، مع التركيز على تعليم الأطفال وسداد الرهن.',
        vividness: 'clear',
      },
    ],
  },
];
