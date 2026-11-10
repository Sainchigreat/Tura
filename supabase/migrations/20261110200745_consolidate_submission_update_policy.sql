-- Keep student submission edits and creator reviews under one update policy.
drop policy "Students update their submissions" on public.assignment_submissions;
drop policy "Creators review submissions" on public.assignment_submissions;
create policy "Students and creators update submissions"
on public.assignment_submissions for update to authenticated
using (
  (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and a.published = true
        and (a.target_student_id is null or a.target_student_id = (select auth.uid()))
        and (select public.is_course_member(a.course_id))
    )
  )
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and (select public.is_course_creator(a.course_id))
  )
)
with check (
  (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and a.published = true
        and (a.target_student_id is null or a.target_student_id = (select auth.uid()))
        and (select public.is_course_member(a.course_id))
    )
  )
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and (select public.is_course_creator(a.course_id))
  )
);
