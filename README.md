# Tura

Tura is a course workspace for creators and students. Course videos stay on YouTube; Tura stores the YouTube URL, organizes lessons into modules, and handles enrolment.

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth, Postgres, Row Level Security
- YouTube standard embedded player (no YouTube Data API)

## Design direction

The UI follows the supplied SuperHi reference: a Chalk Blue (`#f0f6ff`) canvas littered with oversized flat paper-cut shapes in candy primaries, white cards with hard offset shadows, chunky 48px pill buttons, and type set entirely at weight 400 with hierarchy carried by size and tight negative tracking. Electric Iris (`#2727e6`) owns every filled action; the five accent colours are decoration only.

Tokens live at the top of `src/styles.css`. Shapes are composed in `src/components/Shapes.tsx`.

## Local development

1. Install Node.js 22.12 or later.
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable key.
3. Run `npm install`.
4. Run `npm run dev`.

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key — safe in the browser |

Never put a Supabase secret/service-role key in frontend code.

## Product areas

- **Public site** — hero, catalog, how-it-works, creator pitch.
- **Course landing** — what is inside a course, reached from the catalog or an invitation link.
- **Auth** — sign in, sign up as a student or a creator, email confirmation, password reset.
- **Workspace** — overview, courses, course room (player + curriculum + builder), students, profile.

## Roles

Every new account gets the `student` role. Choosing "I'm a creator" at sign-up also grants `creator` on creation. Existing students can self-upgrade from the workspace with one click (`become_nivo_creator()`), which adds `creator` to `user_roles` and creates their `creator_profiles` row.

Course creation is gated at the database level: the insert policy requires the `creator` role.

## Enrolment

Two paths, both real:

1. **Add by email** — a creator enters a student's email. `enroll_nivo_student_by_email()` resolves it against `auth.users` and inserts the enrolment. The student needs an account first.
2. **Invitation link** — `/?invite=<token>` renders a public preview of the course (`course_invite_preview`), keeps the token in session storage through email confirmation, then calls `accept_nivo_course_invite()` once the visitor is signed in. Links expire after 30 days and can be revoked.

An invitation link is the shareable "course link" for a class.

## Database

Migrations live in `supabase/migrations`. They are applied to the Supabase project in order; the newest one adds the public read helpers:

- `public_course_catalog()` — published courses with counts, readable anonymously.
- `public_course_outline(uuid)` — a course outline with lesson titles but **no video URLs**, readable when the course is published or the viewer owns/enrolled.

Video URLs stay behind row level security, so the catalog can never leak lesson content.

## Deploy

The app is a static Vite build, deployed on Vercel (`vercel.json`). Pushes to `main` deploy to production; every other branch gets a preview URL.

Build command: `npm run build` · Output: `dist`.

## First creator account

If you already have an account and need creator access, sign in and press **Become a creator** in the workspace. As a fallback, run this once in the Supabase SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'creator'
from auth.users
where lower(email) = lower('you@example.com')
on conflict (user_id, role) do nothing;
```
