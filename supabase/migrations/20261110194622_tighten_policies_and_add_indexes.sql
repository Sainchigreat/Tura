-- Remove redundant permissive policies and constrain student updates to their own course access.
drop policy "Course creators manage modules" on public.course_modules;
create policy "Creators insert modules" on public.course_modules for insert to authenticated with check ((select public.is_course_creator(course_id)));
create policy "Creators update modules" on public.course_modules for update to authenticated using ((select public.is_course_creator(course_id))) with check ((select public.is_course_creator(course_id)));
create policy "Creators delete modules" on public.course_modules for delete to authenticated using ((select public.is_course_creator(course_id)));

drop policy "Course creators manage lessons" on public.lessons;
create policy "Creators insert lessons" on public.lessons for insert to authenticated with check (exists (select 1 from public.course_modules m where m.id = module_id and (select public.is_course_creator(m.course_id))));
create policy "Creators update lessons" on public.lessons for update to authenticated using (exists (select 1 from public.course_modules m where m.id = module_id and (select public.is_course_creator(m.course_id)))) with check (exists (select 1 from public.course_modules m where m.id = module_id and (select public.is_course_creator(m.course_id))));
create policy "Creators delete lessons" on public.lessons for delete to authenticated using (exists (select 1 from public.course_modules m where m.id = module_id and (select public.is_course_creator(m.course_id))));

drop policy "Students update their progress" on public.lesson_progress;
create policy "Students update their progress" on public.lesson_progress for update to authenticated
using (student_id = (select auth.uid()) and exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and (select public.is_course_member(m.course_id))))
with check (student_id = (select auth.uid()) and exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and (select public.is_course_member(m.course_id))));

drop policy "Authors and creators can edit messages" on public.classroom_messages;
create policy "Authors and creators can edit messages" on public.classroom_messages for update to authenticated
using ((author_id = (select auth.uid()) and ((select public.is_course_creator(course_id)) or (select public.is_course_member(course_id)))) or (select public.is_course_creator(course_id)))
with check ((author_id = (select auth.uid()) and ((select public.is_course_creator(course_id)) or (select public.is_course_member(course_id)))) or (select public.is_course_creator(course_id)));

drop policy "Students and creators update submissions" on public.assignment_submissions;
create policy "Students update their submissions" on public.assignment_submissions for update to authenticated
using (student_id = (select auth.uid()) and exists (select 1 from public.assignments a where a.id = assignment_id and a.published = true and (a.target_student_id is null or a.target_student_id = (select auth.uid())) and (select public.is_course_member(a.course_id))))
with check (student_id = (select auth.uid()) and exists (select 1 from public.assignments a where a.id = assignment_id and a.published = true and (a.target_student_id is null or a.target_student_id = (select auth.uid())) and (select public.is_course_member(a.course_id))));
create policy "Creators review submissions" on public.assignment_submissions for update to authenticated
using (exists (select 1 from public.assignments a where a.id = assignment_id and (select public.is_course_creator(a.course_id))))
with check (exists (select 1 from public.assignments a where a.id = assignment_id and (select public.is_course_creator(a.course_id))));

drop policy "Review authors can edit or remove reviews" on public.creator_reviews;
create policy "Review authors can edit reviews" on public.creator_reviews for update to authenticated
using (reviewer_id = (select auth.uid()))
with check (reviewer_id = (select auth.uid()) and exists (select 1 from public.courses c where c.id = course_id and c.creator_id = creator_id and (select public.is_course_member(c.id))));

create index assignment_submissions_reviewed_by_idx on public.assignment_submissions(reviewed_by);
create index assignments_created_by_idx on public.assignments(created_by);
create index assignments_target_student_idx on public.assignments(target_student_id);
create index classroom_messages_author_idx on public.classroom_messages(author_id);
create index classroom_messages_parent_idx on public.classroom_messages(parent_id);
create index course_invitations_accepted_by_idx on public.course_invitations(accepted_by);
create index course_invitations_created_by_idx on public.course_invitations(created_by);
create index creator_reviews_reviewer_idx on public.creator_reviews(reviewer_id);

revoke all on function public.handle_new_user() from public, anon, authenticated;
