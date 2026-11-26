// The Showcase — the four problems MalMind exists to solve, each played end
// to end on a demo persona's data, with the Brain working as the agentic AI
// layer. The scenarios themselves live in lib/showcase.ts (shared with the
// iPhone app); this page only picks which one opens first (?s=faisal).

import ShowcasePlayer from './ShowcasePlayer';

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const s = (await searchParams).s;
  return <ShowcasePlayer initial={typeof s === 'string' ? s : undefined} />;
}
