export type Role = 'student' | 'teacher';
export type Page = 'home' | 'courses' | 'classroom' | 'tasks' | 'profile';
export type Lesson = { id: string; title: string; youtube_url: string; position: number; duration_seconds?: number | null; completed?: boolean };
export type Module = { id: string; title: string; position: number; lessons: Lesson[] };
export type Course = { id: string; title: string; description: string; cover_url?: string | null; creator_id?: string; published?: boolean; progress?: number; modules: Module[] };
export type ClassroomMessage = { id: string; course_id: string; author_id: string; body: string; created_at: string; parent_id?: string | null; author?: { full_name: string; avatar_url?: string | null } };
export type Assignment = { id: string; course_id: string; title: string; instructions: string; week_number: number; due_at?: string | null; published?: boolean; submission?: { id: string; response: string; submission_url?: string | null; status: string; feedback: string } | null };
