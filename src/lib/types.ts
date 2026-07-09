// src/lib/types.ts
// These types describe the seed content used only by onboarding (demoData.ts)
// to give a new user a real, editable starting point in their own database
// rows. Once saved, each page defines its own row type matching the actual
// Supabase table it reads (see e.g. the Chapter interface in story/page.tsx),
// since that's the real source of truth from here on.

export interface Profile {
  name: string;
  age: number;
  city: string;
  employment: string;
  monthlyIncome: number; // SAR
  persona: string;
}

export type ChapterVividness = 'sketch' | 'clear';

export interface StoryChapter {
  id: string;
  title: string;
  startYear: number;
  endYear: number;
  note: string;
  vividness: ChapterVividness;
}
