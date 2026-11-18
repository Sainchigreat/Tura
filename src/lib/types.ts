export type Role = 'creator' | 'student';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  roles: string[];
  username: string | null;
  avatar_url: string | null;
};

export type CreatorProfile = {
  user_id: string;
  display_name: string;
  bio: string;
  accent_color: string;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string;
  youtube_url: string;
  position: number;
  duration: string | null;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
};

export type CourseWithContent = Course & { modules: Module[] };

export type CatalogCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  creator_name: string;
  module_count: number;
  lesson_count: number;
  student_count: number;
  created_at: string;
};

export type CourseOutlineLesson = {
  id: string;
  title: string;
  duration: string | null;
  position: number;
};

export type CourseOutline = {
  course_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  creator_name: string;
  is_published: boolean;
  module_count: number;
  lesson_count: number;
  student_count: number;
  modules: { id: string; title: string; description: string; position: number; lessons: CourseOutlineLesson[] }[];
};

export type InvitePreview = {
  course_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  creator_name: string;
  lesson_count: number;
  student_count: number;
  expires_at: string;
};

export type Enrollment = {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
  profiles: { full_name: string; email: string | null; username: string | null } | null;
};

export type CourseInvite = {
  id: string;
  token: string;
  active: boolean;
  expires_at: string;
  created_at: string;
};

export type ProgressRow = {
  lesson_id: string;
  is_completed: boolean;
};
