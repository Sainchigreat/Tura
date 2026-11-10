import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Check, CheckCircle2, ChevronDown, ClipboardList, GraduationCap, LayoutDashboard, LogOut, MessageCircle, Plus, Search, Send, Settings, Share2, Users, Video, X } from 'lucide-react';
import { demoAssignments, demoCourses, demoMessages } from './lib/demo';
import { getYouTubeEmbedUrl, getYouTubeId } from './lib/youtube';
import { supabase } from './lib/supabase';
import type { Assignment, ClassroomMessage, Course, Lesson, Page, Role } from './lib/types';

type User = { id: string; email?: string; full_name?: string; avatar_url?: string | null };
type ModalKind = 'course' | 'module' | 'lesson' | 'task' | 'invite' | null;
const initials = (value: string) => value.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'T';
const dueLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(value)) : 'No due date';
const allLessons = (course?: Course) => course?.modules.flatMap((module) => module.lessons) ?? [];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('student');
  const [availableRoles, setAvailableRoles] = useState<Role[]>(['student', 'teacher']);
  const [page, setPage] = useState<Page>('home');
  const [courses, setCourses] = useState<Course[]>(demoCourses);
  const [assignments, setAssignments] = useState<Assignment[]>(demoAssignments);
  const [messages, setMessages] = useState<ClassroomMessage[]>(demoMessages);
  const [courseId, setCourseId] = useState('course-design-ai');
  const [lessonId, setLessonId] = useState('lesson-3');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null);
  const [toast, setToast] = useState('');
  const [moduleOpen, setModuleOpen] = useState<Record<string, boolean>>({});
  const [taskFilter, setTaskFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [submitText, setSubmitText] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formWeek, setFormWeek] = useState('1');
  const [formDue, setFormDue] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [lessonModule, setLessonModule] = useState('');

  const demo = !supabase || !user;
  const name = user?.full_name || user?.email?.split('@')[0] || 'Chisom Ogbonna';
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const lessons = allLessons(course);
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0];
  const filteredCourses = useMemo(() => courses.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())), [courses, search]);
  const filteredTasks = assignments.filter((item) => taskFilter === 'all' || String(item.week_number) === taskFilter);

  function notify(value: string) {
    setToast(value);
    window.setTimeout(() => setToast((current) => current === value ? '' : current), 2400);
  }

  async function loadWorkspace(current: User) {
    const client = supabase;
    if (!client) return;
    const [profile, roles, owned, enrolled, taskRows] = await Promise.all([
      client.from('profiles').select('full_name, avatar_url').eq('id', current.id).maybeSingle(),
      client.from('user_roles').select('role').eq('user_id', current.id),
      client.from('courses').select('id, creator_id, title, description, cover_url, published, course_modules(id, title, position, lessons(id, title, youtube_url, position, duration_seconds))').eq('creator_id', current.id),
      client.from('course_enrollments').select('courses(id, creator_id, title, description, cover_url, published, course_modules(id, title, position, lessons(id, title, youtube_url, position, duration_seconds)))').eq('student_id', current.id).eq('status', 'active'),
      client.from('assignments').select('id, course_id, title, instructions, week_number, due_at, published, assignment_submissions(id, student_id, response, submission_url, status, feedback)').eq('published', true).order('week_number', { ascending: false }),
    ]);
    if (profile.data) setUser({ ...current, ...profile.data });
    const roleList = (roles.data ?? []).map((item) => item.role as Role);
    setAvailableRoles(roleList);
    setRole(roleList.includes('teacher') ? 'teacher' : 'student');
    const rows = [...(owned.data ?? []), ...(enrolled.data ?? []).map((item: any) => item.courses).filter(Boolean)] as any[];
    const unique = Array.from(new Map(rows.map((item) => [item.id, item])).values());
    const progressRows = await client.from('lesson_progress').select('lesson_id, completed').eq('student_id', current.id);
    const completed = new Set((progressRows.data ?? []).filter((row) => row.completed).map((row) => row.lesson_id));
    const mapped = unique.map((item) => {
      const modules = (item.course_modules ?? []).sort((a: any, b: any) => a.position - b.position).map((module: any) => ({
        ...module,
        lessons: (module.lessons ?? []).sort((a: any, b: any) => a.position - b.position).map((item: any) => ({ ...item, completed: completed.has(item.id) })),
      }));
      const items = modules.flatMap((module: any) => module.lessons);
      return { ...item, modules, progress: items.length ? Math.round(items.filter((item: any) => item.completed).length / items.length * 100) : 0 };
    }) as Course[];
    setCourses(mapped);
    setCourseId(mapped[0]?.id ?? '');
    setLessonId(mapped[0]?.modules[0]?.lessons[0]?.id ?? '');
    if (taskRows.data) setAssignments(taskRows.data.map((item: any) => ({
      ...item,
      submission: item.assignment_submissions?.find((row: any) => row.student_id === current.id) ?? null,
    })));
  }

  useEffect(() => {=> {
    const client = supabase;
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      const current = data.session?.user;
      if (current) {
        const next = { id: current.id, email: current.email };
        setUser(next);
        void loadWorkspace(next);
      }
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { setUser(null); setRole('student'); return; }
      const next = { id: session.user.id, email: session.user.email };
      setUser(next);
      window.setTimeout(() => void loadWorkspace(next), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('invite');
    if (!token) return;
    if (!user || !supabase) { setAuthMode('signup'); return; }
    void supabase.rpc('accept_course_invitation', { p_token: token }).then(({ error }) => {
      if (error) notify(error.message);
      else { notify('Course added'); window.history.replaceState({}, '', '/'); void loadWorkspace(user); }
    });
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client || demo || page !== 'classroom' || !courseId) return;
    const refresh = () => client.from('classroom_messages').select('id, course_id, author_id, body, created_at, profiles(full_name, avatar_url)').eq('course_id', courseId).order('created_at').then(({ data }) => {
      if (data) setMessages(data.map((row: any) => ({ ...row, author: row.profiles })));
    });
    void refresh();
    const channel = client.channel(`classroom-${courseId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_messages', filter: `course_id=eq.${courseId}` }, refresh).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [courseId, page, demo]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const fullName = String(data.get('fullName') ?? '').trim();
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}${window.location.search}` } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) notify(result.error.message);
    else if (authMode === 'signup' && !result.data.session) notify('Check your email to verify your account');
    else { setAuthMode(null); notify('Signed in'); }
  }

  async function createCourse() {
    if (!formTitle.trim()) return;
    if (!demo && supabase && user) {
      const { data, error } = await supabase.from('courses').insert({ creator_id: user.id, title: formTitle.trim(), description: formDescription }).select('id').single();
      if (error) return notify(error.message);
      const next: Course = { id: data.id, title: formTitle, description: formDescription, modules: [], progress: 0 };
      setCourses((current) => [next, ...current]); setCourseId(next.id);
    } else {
      const next: Course = { id: `course-${Date.now()}`, title: formTitle, description: formDescription, modules: [], progress: 0 };
      setCourses((current) => [next, ...current]); setCourseId(next.id);
    }
    setRole('teacher'); setPage('courses'); closeModal(); notify('Course created');
  }

  async function addModule() {
    if (!course || !formTitle.trim()) return;
    let id = `module-${Date.now()}`;
    if (!demo && supabase) {
      const { data, error } = await supabase.from('course_modules').insert({ course_id: course.id, title: formTitle.trim(), position: course.modules.length + 1 }).select('id').single();
      if (error) return notify(error.message);
      id = data.id;
    }
    setCourses((current) => current.map((item) => item.id === course.id ? { ...item, modules: [...item.modules, { id, title: formTitle, position: item.modules.length + 1, lessons: [] }] } : item));
    closeModal(); notify('Module added');
  }

  async function addLesson() {
    if (!course || !getYouTubeId(formUrl) || !formTitle.trim()) return;
    const parent = course.modules.find((item) => item.id === lessonModule);
    if (!parent) return;
    let id = `lesson-${Date.now()}`;
    if (!demo && supabase) {
      const { data, error } = await supabase.from('lessons').insert({ module_id: parent.id, title: formTitle.trim(), youtube_url: formUrl.trim(), position: parent.lessons.length + 1 }).select('id').single();
      if (error) return notify(error.message);
      id = data.id;
    }
    const next: Lesson = { id, title: formTitle, youtube_url: formUrl, position: parent.lessons.length + 1 };
    setCourses((current) => current.map((item) => item.id === course.id ? { ...item, modules: item.modules.map((module) => module.id === parent.id ? { ...module, lessons: [...module.lessons, next] } : module) } : item));
    setLessonId(id); closeModal(); notify('Lesson added');
  }

  async function markComplete(item: Lesson) {
    if (!course) return;
    if (!demo && supabase && user) {
      const { error } = await supabase.from('lesson_progress').upsert({ lesson_id: item.id, student_id: user.id, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'lesson_id,student_id' });
      if (error) return notify(error.message);
    }
    setCourses((current) => current.map((entry) => {
      if (entry.id !== course.id) return entry;
      const modules = entry.modules.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => lesson.id === item.id ? { ...lesson, completed: true } : lesson) }));
      const total = modules.flatMap((module) => module.lessons);
      return { ...entry, modules, progress: total.length ? Math.round(total.filter((lesson) => lesson.completed).length / total.length * 100) : 0 };
    }));
    notify('Lesson completed');
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course || !reply.trim()) return;
    if (!demo && supabase && user) {
      const { error } = await supabase.from('classroom_messages').insert({ course_id: course.id, author_id: user.id, body: reply.trim() });
      if (error) return notify(error.message);
    } else setMessages((current) => [...current, { id: String(Date.now()), course_id: course.id, author_id: 'preview', body: reply.trim(), created_at: new Date().toISOString(), author: { full_name: name } }]);
    setReply('');
  }

  async function createTask() {
    if (!course || !formTitle.trim()) return;
    if (!demo && supabase && user) {
      const { data, error } = await supabase.from('assignments').insert({ course_id: course.id, created_by: user.id, title: formTitle.trim(), instructions: formDescription, week_number: Number(formWeek), due_at: formDue ? new Date(formDue).toISOString() : null, published: true }).select('id').single();
      if (error) return notify(error.message);
      setAssignments((current) => [{ id: data.id, course_id: course.id, title: formTitle, instructions: formDescription, week_number: Number(formWeek), due_at: formDue || null }, ...current]);
    } else setAssignments((current) => [{ id: String(Date.now()), course_id: course.id, title: formTitle, instructions: formDescription, week_number: Number(formWeek), due_at: formDue || null }, ...current]);
    closeModal(); notify('Task published');
  }

  async function submitTask(id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!demo && supabase && user) {
      const { error } = await supabase.from('assignment_submissions').upsert({ assignment_id: id, student_id: user.id, response: submitText, submission_url: submitUrl || null, status: 'submitted', submitted_at: new Date().toISOString() }, { onConflict: 'assignment_id,student_id' });
      if (error) return notify(error.message);
    }
    setAssignments((current) => current.map((item) => item.id === id ? { ...item, submission: { id: String(Date.now()), response: submitText, submission_url: submitUrl, status: 'submitted', feedback: '' } } : item));
    notify('Task submitted');
  }

  async function createInvite() {
    if (!course) return;
    let link = `${window.location.origin}/?invite=preview`;
    if (!demo && supabase && user) {
      const { data, error } = await supabase.from('course_invitations').insert({ course_id: course.id, created_by: user.id, invited_email: formEmail.trim() || null }).select('token').single();
      if (error) return notify(error.message);
      link = `${window.location.origin}/?invite=${data.token}`;
    }
    try { await navigator.clipboard.writeText(link); notify('Invitation link copied'); }
    catch { notify('Copy this invitation link: ' + link); }
    closeModal();
  }

  async function signOut() { await supabase?.auth.signOut(); setUser(null); setRole('student'); setAvailableRoles(['student', 'teacher']); setPage('home'); }

  function openModal(kind: ModalKind, moduleId = '') {
    setFormTitle(''); setFormDescription(''); setFormUrl(''); setFormWeek('1'); setFormDue(''); setFormEmail(''); setLessonModule(moduleId); setModal(kind);
  }
  function closeModal() { setModal(null); }

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setPage('home')}><span className="brand-symbol">t</span><span>Tura</span></button>
      <div className="workspace-user"><span className="avatar">{initials(name)}</span><div><strong>{role === 'teacher' ? 'Creator' : 'Student'}</strong><small>{name}</small></div></div>
      <nav className="navigation">
        {([{ id: 'home', label: 'Overview', icon: LayoutDashboard }, { id: 'courses', label: 'Courses', icon: BookOpen }, { id: 'classroom', label: 'Classroom', icon: MessageCircle }, { id: 'tasks', label: 'Tasks', icon: ClipboardList }, { id: 'profile', label: 'Profile', icon: Settings }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(id)}><Icon size={17} /><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-footer">
        <div className="role-toggle"><button className={role === 'student' ? 'selected' : ''} disabled={!demo && !availableRoles.includes('student')} onClick={() => setRole('student')}><GraduationCap size={14} /> Student</button><button className={role === 'teacher' ? 'selected' : ''} disabled={!demo && !availableRoles.includes('teacher')} title={!demo && !availableRoles.includes('teacher') ? 'Creator access has not been enabled for this account' : 'Switch to creator'} onClick={() => setRole('teacher')}><Users size={14} /> Creator</button></div>
        {user ? <button className="signout" onClick={signOut}><LogOut size={15} /> Sign out</button> : <button className="signout" onClick={() => setAuthMode('signin')}>Sign in</button>}
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> {page[0].toUpperCase() + page.slice(1)}</div><div className="top-actions"><label className="search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" /></label>{user ? <span className="avatar">{initials(name)}</span> : <button className="button subtle" onClick={() => setAuthMode('signin')}>Sign in</button>}</div></header>

      <div className="content">
        {demo && <div className="preview-bar"><span>Preview</span><button onClick={() => setAuthMode('signup')}>Create account</button></div>}
        {page === 'home' && <section className="stack">
          <div className="page-title"><h1>{role === 'teacher' ? 'Your workspace' : `Welcome back, ${name.split(' ')[0]}`}</h1>{role === 'teacher' && <button className="button primary" onClick={() => openModal('course')}><Plus size={15} /> New course</button>}</div>
          <div className="stats"><div className="stat"><BookOpen size={17} /><div><small>{role === 'teacher' ? 'Courses' : 'Enrolled courses'}</small><strong>{courses.length}</strong></div></div><div className="stat"><CheckCircle2 size={17} /><div><small>Lessons completed</small><strong>{courses.reduce((sum, item) => sum + allLessons(item).filter((lesson) => lesson.completed).length, 0)} / {courses.reduce((sum, item) => sum + allLessons(item).length, 0)}</strong></div></div><div className="stat"><ClipboardList size={17} /><div><small>Tasks remaining</small><strong>{assignments.filter((item) => !item.submission).length}</strong></div></div></div>
          <div className="section-heading"><h2>{role === 'teacher' ? 'Your courses' : 'Continue learning'}</h2><button className="text-link" onClick={() => setPage('courses')}>View all</button></div>
          {filteredCourses.length ? <div className="course-grid">{filteredCourses.slice(0, 3).map((item) => <button className="course-card" key={item.id} onClick={() => { setCourseId(item.id); setLessonId(allLessons(item).find((lesson) => !lesson.completed)?.id ?? allLessons(item)[0]?.id ?? ''); setPage('courses'); }}><div className="course-art" style={item.cover_url ? { backgroundImage: `url(${item.cover_url})` } : undefined}><BookOpen size={22} /></div><div className="course-card-content"><strong>{item.title}</strong><small>{item.modules.length} modules · {allLessons(item).length} lessons</small><div className="progress"><span style={{ width: `${item.progress ?? 0}%` }} /></div><small>{item.progress ?? 0}% complete</small></div></button>)}</div> : <div className="empty">No courses yet.{role === 'teacher' && <button className="text-link" onClick={() => openModal('course')}>Create course</button>}</div>}
          <div className="section-heading"><h2>This week</h2><button className="text-link" onClick={() => setPage('tasks')}>All tasks</button></div>
          <div className="list-card">{assignments.filter((item) => !item.submission).slice(0, 4).map((item) => <button className="task-row" key={item.id} onClick={() => { setSelectedTask(item.id); setPage('tasks'); }}><span className="task-marker" /><span><strong>{item.title}</strong><small>Week {item.week_number}</small></span><time>{dueLabel(item.due_at)}</time></button>)}{!assignments.some((item) => !item.submission) && <div className="empty">You're all caught up.</div>}</div>
        </section>}

        {page === 'courses' && <section className="stack">
          <div className="page-title"><h1>Courses</h1>{role === 'teacher' && <div className="button-row"><button className="button subtle" onClick={() => openModal('invite')}><Share2 size={15} /> Invite</button><button className="button primary" onClick={() => openModal('module')}><Plus size={15} /> Module</button></div>}</div>
          {!courses.length ? <div className="empty">No courses available.</div> : <><select className="course-picker" value={courseId} onChange={(event) => { setCourseId(event.target.value); const next = courses.find((item) => item.id === event.target.value); setLessonId(allLessons(next)[0]?.id ?? ''); }}>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
            <div className="course-workspace"><div className="course-title"><div><h2>{course.title}</h2><p>{course.description}</p></div><div className="course-progress-label"><strong>{course.progress ?? 0}%</strong><small>complete</small></div></div>
              <div className="learning-grid"><div><div className="video-box">{lesson && getYouTubeEmbedUrl(lesson.youtube_url) ? <iframe src={getYouTubeEmbedUrl(lesson.youtube_url)!} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <div className="no-video"><Video size={25} /> Add a YouTube lesson</div>}</div><div className="lesson-bottom"><div><small>{course.modules.find((item) => item.lessons.some((row) => row.id === lesson?.id))?.title ?? 'Lesson'}</small><h3>{lesson?.title ?? 'Select a lesson'}</h3></div>{lesson && <button className="button subtle" onClick={() => void markComplete(lesson)}>{lesson.completed ? <Check size={15} /> : <CheckCircle2 size={15} />}{lesson.completed ? 'Completed' : 'Mark complete'}</button>}</div><button className="text-link" onClick={() => setPage('classroom')}>Open classroom</button></div>
              <aside className="curriculum"><div className="curriculum-title"><strong>Course content</strong><small>{allLessons(course).filter((item) => item.completed).length}/{allLessons(course).length}</small></div>{course.modules.map((module) => <div className="module" key={module.id}><div className="module-header"><button onClick={() => setModuleOpen((current) => ({ ...current, [module.id]: !(current[module.id] ?? true) }))}><ChevronDown size={15} className={(moduleOpen[module.id] ?? true) ? '' : 'collapsed'} /><span>{module.title}</span><small>{module.lessons.length}</small></button>{role === 'teacher' && <button className="icon-button" onClick={() => openModal('lesson', module.id)}><Plus size={15} /></button>}</div>{(moduleOpen[module.id] ?? true) && module.lessons.map((item) => <button className={lesson?.id === item.id ? 'lesson active' : 'lesson'} key={item.id} onClick={() => setLessonId(item.id)}><span className="lesson-check">{item.completed ? <Check size={12} /> : <Video size={12} />}</span><span>{item.title}</span></button>)}</div>)}{!course.modules.length && <div className="empty small-empty">No modules yet.</div>}</aside>
              </div>
            </div>
          </>}
        </section>}

        {page === 'classroom' && <section className="stack"><div className="page-title"><h1>Classroom</h1>{courses.length > 1 && <select className="course-picker small-picker" value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</div><div className="classroom"><div className="classroom-head"><strong>{course?.title ?? 'Classroom'}</strong><span>{messages.filter((item) => item.course_id === courseId).length} messages</span></div><div className="message-list">{messages.filter((item) => item.course_id === courseId).map((item) => <article className="message" key={item.id}><span className="avatar">{initials(item.author?.full_name ?? 'Student')}</span><div><div className="message-meta"><strong>{item.author?.full_name ?? 'Student'}</strong><time>{new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(item.created_at))}</time></div><p>{item.body}</p></div></article>)}{!messages.some((item) => item.course_id === courseId) && <div className="empty">Start a conversation with your class.</div>}</div><form className="message-input" onSubmit={sendMessage}><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a message" /><button className="button primary" disabled={!reply.trim()}><Send size={15} /></button></form></div></section>}

        {page === 'tasks' && <section className="stack"><div className="page-title"><h1>Tasks</h1>{role === 'teacher' && <button className="button primary" onClick={() => openModal('task')}><Plus size={15} /> New task</button>}</div><div className="filters"><button className={taskFilter === 'all' ? 'active' : ''} onClick={() => setTaskFilter('all')}>All weeks</button>{Array.from(new Set(assignments.map((item) => item.week_number))).sort((a, b) => b - a).map((week) => <button className={taskFilter === String(week) ? 'active' : ''} key={week} onClick={() => setTaskFilter(String(week))}>Week {week}</button>)}</div><div className="task-layout"><div className="task-list">{filteredTasks.map((item) => <button className={selectedTask === item.id ? 'task-card selected' : 'task-card'} key={item.id} onClick={() => { setSelectedTask(item.id); setSubmitText(item.submission?.response ?? ''); setSubmitUrl(item.submission?.submission_url ?? ''); }}><span className="task-marker" /><span><strong>{item.title}</strong><small>Week {item.week_number} · Due {dueLabel(item.due_at)}</small></span><em>{item.submission ? 'Submitted' : 'To do'}</em></button>)}{!filteredTasks.length && <div className="empty">No tasks for this week.</div>}</div><div className="task-detail">{assignments.find((item) => item.id === selectedTask) ? (() => { const item = assignments.find((row) => row.id === selectedTask)!; return <><small>Week {item.week_number}</small><h2>{item.title}</h2><p>{item.instructions}</p><div className="due">Due {dueLabel(item.due_at)}</div>{role === 'student' && <form className="submit-form" onSubmit={(event) => void submitTask(item.id, event)}><label>Your response</label><textarea rows={4} value={submitText} onChange={(event) => setSubmitText(event.target.value)} placeholder="Write your response" /><label>Work link</label><input value={submitUrl} onChange={(event) => setSubmitUrl(event.target.value)} placeholder="https://" /><button className="button primary" type="submit"><Send size={15} /> Submit</button></form>}{role === 'teacher' && <div className="empty">Student submissions will appear here.</div>}{item.submission?.feedback && <div className="feedback"><strong>Teacher feedback</strong><p>{item.submission.feedback}</p></div>}</>; })() : <div className="empty">Select a task.</div>}</div></div></section>}

        {page === 'profile' && <section className="stack"><div className="page-title"><h1>Profile</h1></div><div className="profile-card"><span className="profile-avatar">{initials(name)}</span><div><h2>{name}</h2><p>{user?.email ?? 'Preview account'}</p><span>{role === 'teacher' ? 'Creator' : 'Student'}</span></div></div></section>}
      </div>
    </main>

    {modal && <div className="overlay" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}><form className="modal" onSubmit={(event) => { event.preventDefault(); if (modal === 'course') void createCourse(); if (modal === 'module') void addModule(); if (modal === 'lesson') void addLesson(); if (modal === 'task') void createTask(); if (modal === 'invite') void createInvite(); }}><div className="modal-top"><h2>{({ course: 'New course', module: 'New module', lesson: 'New lesson', task: 'Weekly task', invite: 'Invite students' })[modal]}</h2><button type="button" className="icon-button" onClick={closeModal}><X size={18} /></button></div>{modal === 'course' && <><label>Course name</label><input autoFocus value={formTitle} onChange={(event) => setFormTitle(event.target.value)} required /><label>Description</label><textarea rows={3} value={formDescription} onChange={(event) => setFormDescription(event.target.value)} /></>}{modal === 'module' && <><label>Module title</label><input autoFocus value={formTitle} onChange={(event) => setFormTitle(event.target.value)} required /></>}{modal === 'lesson' && <><label>Lesson title</label><input autoFocus value={formTitle} onChange={(event) => setFormTitle(event.target.value)} required /><label>YouTube URL</label><input value={formUrl} onChange={(event) => setFormUrl(event.target.value)} placeholder="Paste a YouTube link" required />{formUrl && <small className={getYouTubeId(formUrl) ? 'valid' : 'invalid'}>{getYouTubeId(formUrl) ? 'YouTube link recognized' : 'Enter a valid YouTube link'}</small>}</>}{modal === 'task' && <><label>Task title</label><input autoFocus value={formTitle} onChange={(event) => setFormTitle(event.target.value)} required /><label>Instructions</label><textarea rows={4} value={formDescription} onChange={(event) => setFormDescription(event.target.value)} /><div className="form-columns"><div><label>Week</label><input type="number" min="1" value={formWeek} onChange={(event) => setFormWeek(event.target.value)} /></div><div><label>Due date</label><input type="date" value={formDue} onChange={(event) => setFormDue(event.target.value)} /></div></div></>}{modal === 'invite' && <><label>Student email</label><input type="email" value={formEmail} onChange={(event) => setFormEmail(event.target.value)} placeholder="Optional" /></>}<button className="button primary full" disabled={modal !== 'invite' && !formTitle.trim() || (modal === 'lesson' && !getYouTubeId(formUrl))}>{modal === 'invite' ? 'Copy invitation link' : modal === 'task' ? 'Publish task' : modal === 'lesson' ? 'Add lesson' : modal === 'module' ? 'Add module' : 'Create course'}</button></form></div>}

    {authMode && <div className="overlay" onClick={(event) => { if (event.target === event.currentTarget) setAuthMode(null); }}><form className="modal" onSubmit={authenticate}><div className="modal-top"><h2>{authMode === 'signup' ? 'Create account' : 'Sign in'}</h2><button type="button" className="icon-button" onClick={() => setAuthMode(null)}><X size={18} /></button></div>{authMode === 'signup' && <><label>Name</label><input name="fullName" autoFocus required /></>}<label>Email</label><input name="email" type="email" required autoFocus={authMode === 'signin'} /><label>Password</label><input name="password" type="password" minLength={8} required /><button className="button primary full">{authMode === 'signup' ? 'Create account' : 'Sign in'}</button><div className="switch-auth">{authMode === 'signup' ? 'Already registered?' : 'New to Tura?'} <button type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}>{authMode === 'signup' ? 'Sign in' : 'Create account'}</button></div></form></div>}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
