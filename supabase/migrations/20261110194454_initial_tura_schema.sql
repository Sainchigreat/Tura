-- Tura's first schema. Course media remains on YouTube; this database stores URLs only.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text not null default '',
  handle text unique,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  cover_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  youtube_url text not null,
  position integer not null default 0,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, position)
);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create table public.course_invitations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  invited_email text,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (invited_email is null or position('@' in invited_email) > 1)
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  completed boolean not null default false,
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create table public.classroom_messages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.classroom_messages(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  target_student_id uuid references public.profiles(id) on delete cascade,
  week_number integer not null default 1 check (week_number > 0),
  title text not null,
  instructions text not null default '',
  due_at timestamptz,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  response text not null default '',
  submission_url text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'reviewed')),
  feedback text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.creator_reviews (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (course_id, reviewer_id)
);

create index courses_creator_idx on public.courses(creator_id);
create index course_modules_course_idx on public.course_modules(course_id, position);
create index lessons_module_idx on public.lessons(module_id, position);
create index enrollments_student_idx on public.course_enrollments(student_id, status);
create index invitations_course_idx on public.course_invitations(course_id);
create index progress_student_idx on public.lesson_progress(student_id, completed);
create index classroom_course_created_idx on public.classroom_messages(course_id, created_at desc);
create index assignments_course_week_idx on public.assignments(course_id, week_number);
create index submissions_student_idx on public.assignment_submissions(student_id, status);
create index reviews_creator_idx on public.creator_reviews(creator_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'student') on conflict do nothing;
  return new;
end;
$$;

create or replace function public.is_course_creator(p_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.courses c where c.id = p_course_id and c.creator_id = (select auth.uid()));
$$;

create or replace function public.is_course_member(p_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.course_enrollments e where e.course_id = p_course_id and e.student_id = (select auth.uid()) and e.status = 'active');
$$;

create or replace function public.accept_course_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invitation public.course_invitations%rowtype; v_email text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  select * into v_invitation from public.course_invitations
    where token = p_token and accepted_at is null and expires_at > now() for update;
  if not found then raise exception 'Invitation is invalid, expired, or already used'; end if;
  if v_invitation.invited_email is not null and lower(v_invitation.invited_email) <> v_email then
    raise exception 'This invitation belongs to a different email address';
  end if;
  insert into public.course_enrollments (course_id, student_id)
    values (v_invitation.course_id, (select auth.uid()))
    on conflict (course_id, student_id) do update set status = 'active';
  update public.course_invitations set accepted_by = (select auth.uid()), accepted_at = now() where id = v_invitation.id;
  return v_invitation.course_id;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger modules_updated_at before update on public.course_modules for each row execute function public.set_updated_at();
create trigger lessons_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger classroom_messages_updated_at before update on public.classroom_messages for each row execute function public.set_updated_at();
create trigger assignments_updated_at before update on public.assignments for each row execute function public.set_updated_at();
create trigger submissions_updated_at before update on public.assignment_submissions for each row execute function public.set_updated_at();
create trigger lesson_progress_updated_at before update on public.lesson_progress for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_invitations enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.classroom_messages enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.creator_reviews enable row level security;
create policy "Authenticated users can view public profile fields" on public.profiles for select to authenticated using (true);
create policy "Users can update their own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Users can view their roles" on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can add their own capabilities" on public.user_roles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can remove their own capabilities" on public.user_roles for delete to authenticated using (user_id = (select auth.uid()));

create policy "Creators and enrolled students can view courses" on public.courses for select to authenticated using (creator_id = (select auth.uid()) or (select public.is_course_member(id)));
create policy "Signed in users can create courses" on public.courses for insert to authenticated with check (creator_id = (select auth.uid()));
create policy "Creators can update their courses" on public.courses for update to authenticated using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "Creators can delete their courses" on public.courses for delete to authenticated using (creator_id = (select auth.uid()));

create policy "Course members can view modules" on public.course_modules for select to authenticated using ((select public.is_course_creator(course_id)) or (select public.is_course_member(course_id)));
create policy "Course creators manage modules" on public.course_modules for all to authenticated using ((select public.is_course_creator(course_id))) with check ((select public.is_course_creator(course_id)));
create policy "Course members can view lessons" on public.lessons for select to authenticated using (exists (select 1 from public.course_modules m where m.id = module_id and ((select public.is_course_creator(m.course_id)) or (select public.is_course_member(m.course_id)))));
create policy "Course creators manage lessons" on public.lessons for all to authenticated using (exists (select 1 from public.course_modules m where m.id = module_id and (select public.is_course_creator(m.course_id)))) with check (exists (select 1 from public.course_modules m where m.id = module_id and (select public.is_course_creator(m.course_id))));

create policy "Students and course creators can view enrollments" on public.course_enrollments for select to authenticated using (student_id = (select auth.uid()) or (select public.is_course_creator(course_id)));
create policy "Creators can enroll students" on public.course_enrollments for insert to authenticated with check ((select public.is_course_creator(course_id)));
create policy "Creators can update enrollment access" on public.course_enrollments for update to authenticated using ((select public.is_course_creator(course_id))) with check ((select public.is_course_creator(course_id)));
create policy "Creators can remove enrollment access" on public.course_enrollments for delete to authenticated using ((select public.is_course_creator(course_id)));

create policy "Creators can view invitations" on public.course_invitations for select to authenticated using ((select public.is_course_creator(course_id)));
create policy "Creators can create invitations" on public.course_invitations for insert to authenticated with check (created_by = (select auth.uid()) and (select public.is_course_creator(course_id)));
create policy "Creators can revoke invitations" on public.course_invitations for delete to authenticated using ((select public.is_course_creator(course_id)));

create policy "Students view their progress and creators view course progress" on public.lesson_progress for select to authenticated using (student_id = (select auth.uid()) or exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and (select public.is_course_creator(m.course_id))));
create policy "Students create their progress" on public.lesson_progress for insert to authenticated with check (student_id = (select auth.uid()) and exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and (select public.is_course_member(m.course_id))));
create policy "Students update their progress" on public.lesson_progress for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "Course members can read classroom messages" on public.classroom_messages for select to authenticated using ((select public.is_course_creator(course_id)) or (select public.is_course_member(course_id)));
create policy "Course members can post messages" on public.classroom_messages for insert to authenticated with check (author_id = (select auth.uid()) and ((select public.is_course_creator(course_id)) or (select public.is_course_member(course_id))) and (parent_id is null or exists (select 1 from public.classroom_messages parent where parent.id = parent_id and parent.course_id = course_id)));
create policy "Authors and creators can edit messages" on public.classroom_messages for update to authenticated using (author_id = (select auth.uid()) or (select public.is_course_creator(course_id))) with check (author_id = (select auth.uid()) or (select public.is_course_creator(course_id)));
create policy "Authors and creators can delete messages" on public.classroom_messages for delete to authenticated using (author_id = (select auth.uid()) or (select public.is_course_creator(course_id)));

create policy "Students see assignments for their course" on public.assignments for select to authenticated using ((select public.is_course_creator(course_id)) or ((select public.is_course_member(course_id)) and published = true and (target_student_id is null or target_student_id = (select auth.uid()))));
create policy "Creators manage assignments" on public.assignments for insert to authenticated with check (created_by = (select auth.uid()) and (select public.is_course_creator(course_id)));
create policy "Creators update assignments" on public.assignments for update to authenticated using ((select public.is_course_creator(course_id))) with check ((select public.is_course_creator(course_id)));
create policy "Creators delete assignments" on public.assignments for delete to authenticated using ((select public.is_course_creator(course_id)));

create policy "Students and creators view submissions" on public.assignment_submissions for select to authenticated using (student_id = (select auth.uid()) or exists (select 1 from public.assignments a where a.id = assignment_id and (select public.is_course_creator(a.course_id))));
create policy "Students submit their own work" on public.assignment_submissions for insert to authenticated with check (student_id = (select auth.uid()) and exists (select 1 from public.assignments a where a.id = assignment_id and a.published = true and (a.target_student_id is null or a.target_student_id = (select auth.uid())) and (select public.is_course_member(a.course_id))));
create policy "Students and creators update submissions" on public.assignment_submissions for update to authenticated using (student_id = (select auth.uid()) or exists (select 1 from public.assignments a where a.id = assignment_id and (select public.is_course_creator(a.course_id)))) with check (student_id = (select auth.uid()) or exists (select 1 from public.assignments a where a.id = assignment_id and (select public.is_course_creator(a.course_id))));

create policy "Creator reviews are public" on public.creator_reviews for select to authenticated using (true);
create policy "Enrolled students can review a creator" on public.creator_reviews for insert to authenticated with check (reviewer_id = (select auth.uid()) and exists (select 1 from public.courses c where c.id = course_id and c.creator_id = creator_id and (select public.is_course_member(c.id))));
create policy "Review authors can edit or remove reviews" on public.creator_reviews for update to authenticated using (reviewer_id = (select auth.uid())) with check (reviewer_id = (select auth.uid()));
create policy "Review authors can delete reviews" on public.creator_reviews for delete to authenticated using (reviewer_id = (select auth.uid()));

revoke all on function public.is_course_creator(uuid) from public, anon;
revoke all on function public.is_course_member(uuid) from public, anon;
revoke all on function public.accept_course_invitation(uuid) from public, anon;
grant execute on function public.is_course_creator(uuid) to authenticated;
grant execute on function public.is_course_member(uuid) to authenticated;
grant execute on function public.accept_course_invitation(uuid) to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter publication supabase_realtime add table public.classroom_messages;
