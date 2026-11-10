drop policy "Users can add their own capabilities" on public.user_roles;
create policy "Users can add their own student capability"
on public.user_roles for insert to authenticated
with check (user_id = (select auth.uid()) and role = 'student');

drop policy "Users can remove their own capabilities" on public.user_roles;
create policy "Users can remove their own student capability"
on public.user_roles for delete to authenticated
using (user_id = (select auth.uid()) and role = 'student');

drop policy "Signed in users can create courses" on public.courses;
create policy "Teachers can create courses"
on public.courses for insert to authenticated
with check (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'teacher'
  )
);
