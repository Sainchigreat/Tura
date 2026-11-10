# Tura

Tura is a course workspace for creators and students. Course videos stay on YouTube; Tura stores the YouTube URL and organizes lessons into modules.

## Stack

- React + TypeScript + Vite
- Supabase Auth, Postgres, Row Level Security and Realtime
- YouTube standard embedded player (no YouTube Data API)

## Local development

1. Install Node.js 20 or later.
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
