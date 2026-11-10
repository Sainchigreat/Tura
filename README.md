# Tura

Tura is a course workspace for creators and students. Course videos stay on YouTube; Tura stores the YouTube URL and organizes lessons into modules.

## Stack

- React + TypeScript + Vite
- Supabase Auth, Postgres, Row Level Security and Realtime
- YouTube standard embedded player (no YouTube Data API)

## Local development

1. Install Node.js 22.12 or later.
2. Copy `.env.example` to `.env.local`.
3. Run `npm install`.
4. Run `npm run dev`.

## Product areas

- Courses, modules and YouTube lessons
- Student invitations and enrolment access
- Lesson completion and course progress
- Course classroom discussions
- Weekly assignments and student submissions
- Creator profiles and reviews

## Design direction

The product UI follows the supplied SuperHi reference for warmth and rounded geometry, but prioritizes the direct instruction to keep Tura as quiet and focused as Linear or Apple Notes: no marketing copy in the workspace, no unnecessary helper text, and only the labels needed for navigation and comprehension.

## Supabase

The database schema and row-level security policies are in `supabase/migrations`. The application uses a Supabase publishable key in the browser. Never put a Supabase secret/service-role key in frontend code.

## Video embeds

Creators paste a standard YouTube URL. Tura extracts the video ID and renders the standard YouTube embed URL. It does not call the YouTube Data API or upload video files.


## First creator account

New sign-ups receive the student role. To enable the first creator account, sign up and verify your email, then run this once in the Tura Supabase SQL Editor, replacing the email address:

```sql
insert into public.user_roles (user_id, role)
select id, 'teacher'
from auth.users
where lower(email) = lower('you@example.com')
on conflict (user_id, role) do nothing;
```

Course creation is restricted to accounts with the teacher role. Do not add a self-service role grant to the browser client.

## Invitations

The app currently creates secure, expiring invitation links and can bind a link to an email address. Email delivery is not configured yet; connect an email provider/SMTP before expecting Tura to send invitation messages automatically.


## Preview

The repository includes a GitHub Pages workflow. In the repository settings, open **Pages** and set the build source to **GitHub Actions**. Every push to `main` then publishes the UI preview. The Pages build runs in demo mode so the screens can be reviewed without exposing or requiring backend credentials. Local development can connect to Supabase using `.env.local`.
