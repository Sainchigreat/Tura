-- Public read helpers.
--
-- The workspace tables are locked down by row level security: modules and
-- lessons are only readable by the course creator or an enrolled student, and
-- profiles are only readable by the owner or a creator the student is enrolled
-- with. That is correct for private data, but it leaves the marketing surface
-- and the invitation page with nothing to render.
--
-- These three functions expose exactly the fields needed to present a
-- *published* course, an invitation, or the catalog. They never expose lesson
-- video URLs or student identity.

create or replace function public.public_course_catalog()
returns table (
  id uuid,
  title text,
  description text,
  category text,
  thumbnail_url text,
  creator_name text,
  module_count bigint,
  lesson_count bigint,
  student_count bigint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.title,
    c.description,
    c.category,
    c.thumbnail_url,
    coalesce(nullif(cp.display_name, ''), 'Tura creator'),
    (select count(*) from public.modules m where m.course_id = c.id),
    (select count(*) from public.lessons l
       join public.modules m on m.id = l.module_id
      where m.course_id = c.id),
    (select count(*) from public.enrollments e where e.course_id = c.id),
    c.created_at
  from public.courses c
  left join public.creator_profiles cp on cp.user_id = c.creator_id
  where c.is_published = true
  order by c.created_at desc;
$$;

create or replace function public.public_course_outline(p_course_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'course_id', c.id,
    'title', c.title,
    'description', c.description,
    'category', c.category,
    'thumbnail_url', c.thumbnail_url,
    'creator_name', coalesce(nullif(cp.display_name, ''), 'Tura creator'),
    'is_published', c.is_published,
    'module_count', (select count(*) from public.modules m where m.course_id = c.id),
    'lesson_count', (select count(*) from public.lessons l
                       join public.modules m on m.id = l.module_id
                      where m.course_id = c.id),
    'student_count', (select count(*) from public.enrollments e where e.course_id = c.id),
    'modules', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', m.id,
                 'title', m.title,
                 'description', m.description,
                 'position', m.position,
                 'lessons', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'id', l.id,
                              'title', l.title,
                              'duration', l.duration,
                              'position', l.position
                            ) order by l.position, l.created_at
                          )
                     from public.lessons l
                    where l.module_id = m.id
                 ), '[]'::jsonb)
               ) order by m.position, m.created_at
             )
        from public.modules m
       where m.course_id = c.id
    ), '[]'::jsonb)
  )
  from public.courses c
  left join public.creator_profiles cp on cp.user_id = c.creator_id
  where c.id = p_course_id
    and (
      c.is_published = true
      or c.creator_id = (select auth.uid())
      or private.is_nivo_course_enrolled(c.id, (select auth.uid()))
    );
$$;

create or replace function public.course_invite_preview(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'course_id', c.id,
    'title', c.title,
    'description', c.description,
    'category', c.category,
    'thumbnail_url', c.thumbnail_url,
    'creator_name', coalesce(nullif(cp.display_name, ''), 'Tura creator'),
    'lesson_count', (select count(*) from public.lessons l
                       join public.modules m on m.id = l.module_id
                      where m.course_id = c.id),
    'student_count', (select count(*) from public.enrollments e where e.course_id = c.id),
    'expires_at', ci.expires_at
  )
  from public.course_invites ci
  join public.courses c on c.id = ci.course_id
  left join public.creator_profiles cp on cp.user_id = c.creator_id
  where ci.token = p_token
    and ci.active = true
    and ci.expires_at > now();
$$;

revoke all on function public.public_course_catalog() from public;
revoke all on function public.public_course_outline(uuid) from public;
revoke all on function public.course_invite_preview(uuid) from public;

grant execute on function public.public_course_catalog() to anon, authenticated;
grant execute on function public.public_course_outline(uuid) to anon, authenticated;
grant execute on function public.course_invite_preview(uuid) to anon, authenticated;
