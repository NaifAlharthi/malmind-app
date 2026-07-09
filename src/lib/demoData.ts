// src/lib/demoData.ts
// Seed content used by onboarding to give a newly signed-up user a real,
// editable starting point saved to their own database rows — not demo-only
// state. Picking a persona writes these values into the real profiles and
// story_chapters tables for that user.

import { Profile, StoryChapter } from './types';

export interface PersonaSeed {
  id: string;
  name: string;
  role: string;
  avatarEmoji: string;
  description: string;
  profile: Profile;
  chapters: StoryChapter[];
}

export const PERSONAS: PersonaSeed[] = [
  {
    id: 'faisal',
    name: 'Faisal',
    role: 'Analyst at a Riyadh bank',
    avatarEmoji: '👨🏻‍💼',
    description:
      'Fresh out of KSU, two years into his first real job. Good salary, new car, renting his own apartment.',
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
        startYear: 2019,
        endYear: 2022,
        note: 'Studied at KSU, part-time work on the side.',
        vividness: 'sketch',
      },
      {
        id: 'c2',
        title: 'First job at the bank',
        startYear: 2022,
        endYear: 2026,
        note: 'Joined as a junior analyst, steady salary growth since.',
        vividness: 'clear',
      },
    ],
  },
  {
    id: 'sara',
    name: 'Sara',
    role: 'Engineer at Aramco',
    avatarEmoji: '👩🏻‍🔬',
    description:
      'Established on a strong corporate track in the Eastern Province. High income, growing savings.',
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
        startYear: 2015,
        endYear: 2019,
        note: 'Studied mechanical engineering, internship at Aramco.',
        vividness: 'sketch',
      },
      {
        id: 'c2',
        title: 'Joined Aramco full-time',
        startYear: 2019,
        endYear: 2026,
        note: 'Steady promotions, strong benefits, growing investment portfolio.',
        vividness: 'clear',
      },
    ],
  },
  {
    id: 'reem',
    name: 'Reem',
    role: 'Government ministry employee',
    avatarEmoji: '👩🏻‍💻',
    description:
      'Stable mid-career role in Riyadh. Married with kids, a mortgage in progress.',
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
        startYear: 2014,
        endYear: 2018,
        note: 'First government role, building a foundation.',
        vividness: 'sketch',
      },
      {
        id: 'c2',
        title: 'Marriage and mortgage',
        startYear: 2018,
        endYear: 2022,
        note: 'Got married, took on a mortgage, growing family responsibilities.',
        vividness: 'clear',
      },
      {
        id: 'c3',
        title: 'Present day',
        startYear: 2022,
        endYear: 2026,
        note: 'Stable role, focused on kids education and paying down the mortgage.',
        vividness: 'clear',
      },
    ],
  },
];
