# MalMind — the real app, with real accounts

This is a working Next.js application with a **real database and real user
accounts** — no more demo-only state. Every user who signs up gets their own
private rows in a real Postgres database; no one can see anyone else's data,
enforced by the database itself (Row Level Security), not just app code.

## What's real now

- **Real sign-up and login** (`/signup`, `/login`) — powered by Supabase Auth
- **Real per-user data** — profile, financial story chapters, net worth
  snapshots, and advisor chat history are all saved to your own Supabase
  database, one row per user, per item
- **A secure AI advisor** (`/advisor`) — the server verifies who's actually
  logged in via their session, pulls *that* user's real stored profile and
  story, and only then calls Claude. A user can never see or spoof another
  user's context.
- **Onboarding personas as real starting data** — picking a persona writes
  real rows into your profile and story, not local demo state. Everything
  is yours to edit afterward.

## What you need before this works

Two accounts, both free to start:

1. **A Supabase project** — this is your real database + authentication.
   Go to https://supabase.com, sign up, create a new project (pick any
   name/region — closer to your users is slightly faster, but not critical
   at this stage). It takes about two minutes to provision.

2. **An Anthropic API key** (if you don't have one yet) — from
   https://console.anthropic.com/. This powers the real AI advisor
   responses. Without it, the advisor still works but tells the user
   honestly that it isn't connected yet.

## Setting up the real database

1. In your Supabase project, go to the **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open `supabase/schema.sql` in this project, copy its entire contents,
   paste into the SQL Editor, and click **Run**.
4. Click **New query** again. Open `supabase/schema_part2.sql`, copy its
   entire contents, paste in, and click **Run**.
5. Click **New query** once more. Open `supabase/schema_part3.sql`, copy
   its contents, paste in, and click **Run** — this adds three columns to
   `profiles` for the Lifetime Income page's "Understand" projection view.
6. Click **New query** one more time. Open `supabase/schema_part4.sql`,
   copy its contents, paste in, and click **Run** — this adds two more
   columns to `profiles` (side income, monthly expense) for the Velocity
   of Money page.
7. One more. Open `supabase/schema_part5.sql`, copy its contents, paste
   in, and click **Run** — this adds an `icon` column to `goal_funds`.
8. Open `supabase/schema_part6.sql`, copy its contents, paste in, and
   click **Run** — this adds five self-reported columns to `profiles`
   (liquid savings, monthly debt payments, total debt, monthly housing
   payment, monthly investment contribution) for the Ratios & Stats page.
9. Open `supabase/schema_part7.sql`, copy its contents, paste in, and
   click **Run** — this adds an end year, editable theme/to-do/
   net-worth-goal fields, and a 4th tier to `life_phases`, and switches
   `living_standard_actuals` to tier-based tracking, for the Standard of
   Living page.
10. Last one. Open `supabase/schema_part8.sql`, copy its contents, paste
   in, and click **Run** — this creates the `assets` table used by the
   3D "your life, in space" world on the home page.
11. That's it — together these files create every table MalMind needs:
   profiles, story chapters, net worth snapshots, goal funds, advisor
   messages, budget items, life phases, year plans, income entries,
   investment settings, and assets — each with Row Level Security already
   configured so users can only ever touch their own data.

If you already ran earlier schema files before (from an earlier version
of this app), you only need to run whichever of `schema_part3.sql` /
`schema_part4.sql` / `schema_part5.sql` / `schema_part6.sql` /
`schema_part7.sql` / `schema_part8.sql` you haven't yet — they only add
new tables/columns and won't touch what already exists.

## Getting your Supabase credentials

1. In your Supabase project, go to **Settings → API**.
2. Copy the **Project URL** and the **anon public** key (not the
   `service_role` key — that one is more powerful and should never be used
   in this app).

## Running it locally

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

Then:

```bash
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`. Click through to
**Create an account**, sign up with a real email and password, and you're in
a genuinely working, empty account — pick a persona on the onboarding
screen to get a real starting point, then edit everything freely.

Note: Supabase sends a confirmation email by default. For faster local
testing, you can turn this off temporarily in your Supabase project under
**Authentication → Providers → Email → Confirm email** (toggle off), then
turn it back on before you have real public users.

## Deploying to malmind.ai

The GitHub → Vercel → GoDaddy DNS steps are unchanged from before. The one
addition: when you set environment variables in Vercel (**Project Settings
→ Environment Variables**), add all three:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

### Step 1 — push this code to GitHub

```bash
cd malmind-app
git init
git add .
git commit -m "Real database and real accounts"
git remote add origin https://github.com/YOUR_USERNAME/malmind-app.git
git branch -M main
git push -u origin main
```

(If you already have this repo from before, just commit and push as usual —
no need to recreate it.)

### Step 2 — deploy on Vercel

1. https://vercel.com → **Add New → Project** → select your repo.
2. Expand **Environment Variables**, add the three keys listed above.
3. Click **Deploy**.

### Step 3 — connect malmind.ai

Unchanged from before — **Settings → Domains** in Vercel, add `malmind.ai`,
then add the DNS records Vercel shows you into GoDaddy's DNS settings for
the domain.

## Do you need to buy or rent servers?

No. Both Vercel (hosting) and Supabase (database + auth) are serverless —
you don't provision or manage a machine. Both have real free tiers that
comfortably cover testing and early users:

- **Vercel free tier**: enough for a project at this stage, scales with
  real traffic later.
- **Supabase free tier**: a real Postgres database, up to 50,000 monthly
  active users on auth, no credit card required to start.

You'll eventually pay for both as usage genuinely grows past free-tier
limits — not before.

## All 13 tools are now real

Every tool originally built as a standalone HTML prototype is now a real,
connected page in this app, reading and writing its own Supabase tables
under the logged-in user's account:

**Think** — My Financial Story, Lifetime Income, Financial Positioning,
Velocity of Money, Doubling Path, Ratios & Stats, Standard of Living (tracked)

**Decide** — Standard of Living (design), Year Master Plan, Money Waterfall,
Goal Fund, Dynamic Budgeting

**Always on** — AI Advisor

Money Waterfall and Year Master Plan intentionally read the *same*
`year_plans` table — same numbers, two different visual treatments, exactly
as designed in the original HTML prototypes. Standard of Living is one page
with two modes, reached via `?mode=plan` (Decide) and `?mode=track` (Think),
matching the original tabbed design.

## What's still demo/placeholder, and where

- **Financial Positioning's comparison lines** (national average, higher
  peer) are explicitly labeled "illustrative" in the UI — MalMind doesn't
  have enough real aggregate user data yet to compute genuine benchmarks.
  Your own logged net worth data is 100% real.
- **Nafath login** is not implemented — that requires a formal government
  partnership, a separate track from this engineering work.
- **Ratios & Stats** only shows a ratio once you have real data feeding it
  (a Year Master Plan, a logged net worth snapshot, a goal fund, or budget
  items) — rather than showing fake numbers before you've entered anything.

## Architecture, in one paragraph

Browser → Next.js pages (client components) call Supabase directly for
simple reads/writes (like adding a story chapter), using the public anon
key — safe because Row Level Security enforces per-user access at the
database level regardless of what the client claims. For anything sensitive
or that needs Claude (like the advisor), the request goes through a Next.js
API route running on the server, which independently verifies the user's
session and pulls their data itself before doing anything — the client
never gets to just assert who it is.
