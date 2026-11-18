import { supabase } from './supabase';
import type {
  CatalogCourse,
  Course,
  CourseInvite,
  CourseOutline,
  CreatorProfile,
  Enrollment,
  InvitePreview,
  Lesson,
  Module,
  Profile,
} from './types';

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export const isConfigured = Boolean(supabase);

export async function fetchProfile(userId: string): Promise<{ profile: Profile | null; creator: CreatorProfile | null }> {
  const sb = client();
  const [profile, creator] = await Promise.all([
    sb.from('profiles').select('id, full_name, email, role, roles, username, avatar_url').eq('id', userId).maybeSingle(),
    sb.from('creator_profiles').select('user_id, display_name, bio, accent_color').eq('user_id', userId).maybeSingle(),
  ]);
  return {
    profile: (profile.data as Profile | null) ?? null,
    creator: (creator.data as CreatorProfile | null) ?? null,
  };
}

export async function fetchCreatorProfile(userId: string): Promise<CreatorProfile | null> {
  const { data, error } = await client()
    .from('creator_profiles')
    .select('user_id, display_name, bio, accent_color')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CreatorProfile | null) ?? null;
}

export async function becomeCreator(): Promise<void> {
  const { error } = await client().rpc('become_nivo_creator');
  if (error) throw new Error(error.message);
}

export async function updateCreatorProfile(userId: string, values: { display_name: string; bio: string }): Promise<void> {
  const sb = client();
  const { error } = await sb.from('creator_profiles').upsert(
    { user_id: userId, ...values },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(error.message);
}

export async function fetchCatalog(): Promise<CatalogCourse[]> {
  const { data, error } = await client().rpc('public_course_catalog');
  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogCourse[];
}

export async function fetchCourseOutline(courseId: string): Promise<CourseOutline | null> {
  const { data, error } = await client().rpc('public_course_outline', { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return (data as CourseOutline | null) ?? null;
}

export async function fetchInvitePreview(token: string): Promise<InvitePreview | null> {
  const { data, error } = await client().rpc('course_invite_preview', { p_token: token });
  if (error) throw new Error(error.message);
  return (data as InvitePreview | null) ?? null;
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await client().rpc('accept_nivo_course_invite', { p_token: token });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function fetchCourseContent(courseIds: string[]): Promise<Record<string, Module[]>> {
  if (!courseIds.length) return {};
  const { data, error } = await client()
    .from('modules')
    .select('id, course_id, title, description, position, lessons(id, module_id, title, description, youtube_url, position, duration)')
    .in('course_id', courseIds)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  const grouped: Record<string, Module[]> = {};
  for (const row of (data ?? []) as unknown as Module[]) {
    const module: Module = {
      ...row,
      lessons: [...(row.lessons ?? [])].sort((a: Lesson, b: Lesson) => a.position - b.position),
    };
    grouped[row.course_id] = [...(grouped[row.course_id] ?? []), module];
  }
  return grouped;
}

export async function fetchMyCourses(profile: Profile): Promise<Course[]> {
  const sb = client();
  const isCreator = profile.roles?.includes('creator') || profile.role === 'creator';
  if (isCreator) {
    const { data, error } = await sb
      .from('courses')
      .select('*')
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Course[];
  }
  const { data, error } = await sb
    .from('enrollments')
    .select('course_id, courses(*)')
    .eq('student_id', profile.id)
    .order('enrolled_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as { courses: Course | null }[])
    .map((row) => row.courses)
    .filter((row): row is Course => Boolean(row));
}

export async function fetchEnrolledCourseIds(studentId: string): Promise<string[]> {
  const { data, error } = await client().from('enrollments').select('course_id').eq('student_id', studentId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.course_id as string);
}

export async function fetchProgress(studentId: string): Promise<Set<string>> {
  const { data, error } = await client()
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('student_id', studentId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).filter((row) => row.is_completed).map((row) => row.lesson_id as string));
}

export async function saveProgress(studentId: string, lessonId: string, completed: boolean): Promise<void> {
  const { error } = await client()
    .from('lesson_progress')
    .upsert(
      {
        student_id: studentId,
        lesson_id: lessonId,
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: 'lesson_id,student_id' },
    );
  if (error) throw new Error(error.message);
}

export async function fetchRoster(courseId: string): Promise<Enrollment[]> {
  const { data, error } = await client()
    .from('enrollments')
    .select('id, course_id, student_id, enrolled_at, profiles(full_name, email, username)')
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Enrollment[];
}

export async function enrollByEmail(courseId: string, email: string): Promise<void> {
  const { error } = await client().rpc('enroll_nivo_student_by_email', {
    p_course_id: courseId,
    p_student_email: email.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function revokeEnrollment(enrollmentId: string): Promise<void> {
  const { error } = await client().from('enrollments').delete().eq('id', enrollmentId);
  if (error) throw new Error(error.message);
}

export async function fetchInvites(courseId: string): Promise<CourseInvite[]> {
  const { data, error } = await client()
    .from('course_invites')
    .select('id, token, active, expires_at, created_at')
    .eq('course_id', courseId)
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CourseInvite[];
}

export async function createInvite(courseId: string, creatorId: string): Promise<CourseInvite> {
  const { data, error } = await client()
    .from('course_invites')
    .insert({ course_id: courseId, creator_id: creatorId })
    .select('id, token, active, expires_at, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as CourseInvite;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await client().from('course_invites').update({ active: false }).eq('id', inviteId);
  if (error) throw new Error(error.message);
}

export async function createCourse(values: {
  creator_id: string;
  title: string;
  description: string;
  category: string;
}): Promise<Course> {
  const { data, error } = await client()
    .from('courses')
    .insert({ ...values, is_published: false })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Course;
}

export async function updateCourse(courseId: string, values: Partial<Course>): Promise<void> {
  const { error } = await client().from('courses').update(values).eq('id', courseId);
  if (error) throw new Error(error.message);
}

export async function createModule(courseId: string, title: string, position: number): Promise<Module> {
  const { data, error } = await client()
    .from('modules')
    .insert({ course_id: courseId, title, position })
    .select('id, course_id, title, description, position')
    .single();
  if (error) throw new Error(error.message);
  return { ...(data as Module), lessons: [] };
}

export async function createLesson(values: {
  module_id: string;
  title: string;
  youtube_url: string;
  position: number;
}): Promise<Lesson> {
  const { data, error } = await client()
    .from('lessons')
    .insert(values)
    .select('id, module_id, title, description, youtube_url, position, duration')
    .single();
  if (error) throw new Error(error.message);
  return data as Lesson;
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await client().from('lessons').delete().eq('id', lessonId);
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await client().auth.signOut();
}
