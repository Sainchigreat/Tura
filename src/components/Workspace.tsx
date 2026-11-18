import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  MailPlus,
  PlayCircle,
  Plus,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  UserMinus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { getYouTubeEmbedUrl, getYouTubeId } from '../lib/youtube';
import type {
  Course,
  CourseInvite,
  CourseWithContent,
  Enrollment,
  Lesson,
  Module,
  Profile,
} from '../lib/types';
import { formatDate, formatShortDate, initials } from './Shapes';

export type Page = 'overview' | 'courses' | 'students' | 'profile';

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'profile', label: 'Profile', icon: Settings },
];

export type WorkspaceProps = {
  profile: Profile;
  creatorBio: string;
  isCreator: boolean;
  courses: CourseWithContent[];
  enrolledIds: Set<string>;
  completed: Set<string>;
  page: Page;
  activeCourseId: string | null;
  activeLessonId: string | null;
  toast: (message: string) => void;
  onPage: (page: Page) => void;
  onOpenCourse: (courseId: string) => void;
  onSelectLesson: (lessonId: string) => void;
  onToggleLesson: (lesson: Lesson, completed: boolean) => Promise<void>;
  onBecomeCreator: () => Promise<void>;
  onCreateCourse: (values: { title: string; description: string; category: string }) => Promise<void>;
  onCreateModule: (courseId: string, title: string) => Promise<void>;
  onCreateLesson: (input: { moduleId: string; title: string; youtubeUrl: string }) => Promise<void>;
  onDeleteLesson: (lessonId: string) => Promise<void>;
  onTogglePublish: (course: Course, publish: boolean) => Promise<void>;
  onEnroll: (courseId: string, email: string) => Promise<void>;
  onRevoke: (enrollmentId: string) => Promise<void>;
  loadRoster: (courseId: string) => Promise<Enrollment[]>;
  loadInvites: (courseId: string) => Promise<CourseInvite[]>;
  onCreateInvite: (courseId: string) => Promise<CourseInvite>;
  onRevokeInvite: (inviteId: string) => Promise<void>;
  onUpdateProfile: (values: { display_name: string; bio: string }) => Promise<void>;
  onSignOut: () => Promise<void>;
};

function countLessons(course: CourseWithContent) {
  return course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
}

function courseProgress(course: CourseWithContent, completed: Set<string>) {
  const lessons = course.modules.flatMap((module) => module.lessons);
  if (!lessons.length) return 0;
  return Math.round((lessons.filter((lesson) => completed.has(lesson.id)).length / lessons.length) * 100);
}

export function Workspace(props: WorkspaceProps) {
  const {
    profile,
    isCreator,
    courses,
    page,
    activeCourseId,
    onPage,
    onSignOut,
  } = props;

  const [mobileOpen, setMobileOpen] = useState(false);
  const name = profile.full_name || profile.email?.split('@')[0] || 'Tura member';
  const activeCourse = courses.find((course) => course.id === activeCourseId) ?? null;

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Workspace">
        <button className="brand" onClick={() => onPage('overview')} style={{ textAlign: 'left' }}>
          <span className="brand-mark" aria-hidden="true">t</span>
          <span>Tura</span>
        </button>

        <div className="side-user">
          <span className="avatar">{initials(name)}</span>
          <div style={{ minWidth: 0 }}>
            <strong>{name}</strong>
            <small>{isCreator ? 'Creator' : 'Student'}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Sections">
          {NAV.filter((item) => item.id !== 'students' || isCreator).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className="nav-item"
              aria-current={page === id ? 'page' : undefined}
              onClick={() => { onPage(id); setMobileOpen(false); }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'courses' && <span className="nav-count">{courses.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="nav-item" onClick={() => void onSignOut()}>
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
        {mobileOpen && <span className="sr-only">Menu open</span>}
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="topbar-title">
            {page === 'overview' ? 'Overview' : page === 'courses' ? 'Courses' : page === 'students' ? 'Students' : 'Profile'}
          </span>
          <div className="topbar-actions">
            {!isCreator && (
              <span className="tag hide-sm">Student</span>
            )}
            {isCreator && <span className="tag hide-sm" style={{ background: 'var(--yellow)' }}>Creator</span>}
            <span className="avatar avatar--sm" title={name}>{initials(name)}</span>
          </div>
        </header>

        <div className="view">
          {page === 'overview' && (
            <Overview {...props} />
          )}
          {page === 'courses' && (
            activeCourse
              ? <CourseRoom {...props} course={activeCourse} />
              : <CourseList {...props} />
          )}
          {page === 'students' && isCreator && <StudentsView {...props} />}
          {page === 'profile' && <ProfileView {...props} />}
        </div>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Overview
   --------------------------------------------------------------------------- */

function Overview(props: WorkspaceProps) {
  const { profile, isCreator, courses, completed, onOpenCourse, onPage, onCreateCourse, onBecomeCreator, toast } = props;
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const totalLessons = courses.reduce((sum, course) => sum + countLessons(course), 0);
  const doneLessons = courses.reduce(
    (sum, course) => sum + course.modules.flatMap((module) => module.lessons).filter((lesson) => completed.has(lesson.id)).length,
    0,
  );
  const firstName = (profile.full_name || 'there').split(' ')[0];
  const nextLesson = useMemo(() => {
    for (const course of courses) {
      for (const module of course.modules) {
        const lesson = module.lessons.find((row) => !completed.has(row.id));
        if (lesson) return { course, module, lesson };
      }
    }
    return null;
  }, [courses, completed]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await onCreateCourse({
        title: String(form.get('title') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        category: String(form.get('category') ?? 'Other').trim(),
      });
      setCreating(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create the course.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="view-head">
        <div>
          <h1>Hi {firstName}.</h1>
          <p>
            {isCreator
              ? 'Here is what is happening across your courses today.'
              : 'Pick up a lesson, or check what your creator has added lately.'}
          </p>
        </div>
        {isCreator ? (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={18} /> New course
          </button>
        ) : (
          <button className="btn btn-outline" onClick={() => onPage('courses')}>
            My courses <ArrowRight size={17} />
          </button>
        )}
      </div>

      <div className="stat-row">
        <div className="stat">
          <small>{isCreator ? 'Courses you run' : 'Courses joined'}</small>
          <strong>{courses.length}</strong>
        </div>
        <div className="stat">
          <small>{isCreator ? 'Lessons published' : 'Lessons completed'}</small>
          <strong>{isCreator ? totalLessons : `${doneLessons}/${totalLessons}`}</strong>
        </div>
        <div className="stat">
          <small>Account type</small>
          <strong style={{ fontSize: 24, letterSpacing: '-0.02em' }}>{isCreator ? 'Creator' : 'Student'}</strong>
        </div>
      </div>

      {!isCreator && nextLesson && (
        <div className="card" style={{ display: 'grid', gap: 16, marginBottom: 26, background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="tag" style={{ background: 'var(--yellow)', color: 'var(--ink)' }}>Up next</span>
            <span className="mono" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{nextLesson.course.title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <span className="mono" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{nextLesson.module.title}</span>
              <h2 style={{ fontSize: 30, fontWeight: 400, letterSpacing: '-0.024em', lineHeight: 1.1 }}>{nextLesson.lesson.title}</h2>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => { onOpenCourse(nextLesson.course.id); }}
            >
              Start lesson <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="section-head" style={{ marginBottom: 16 }}>
        <h2 className="h-md">{isCreator ? 'Your courses' : 'Your courses'}</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => onPage('courses')}>See all</button>
      </div>

      {courses.length ? (
        <div className="row-list">
          {courses.slice(0, 4).map((course) => {
            const percent = courseProgress(course, completed);
            return (
              <button className="row-item" key={course.id} onClick={() => onOpenCourse(course.id)}>
                <span className="avatar" style={{ borderRadius: 14, background: 'var(--frost)', color: 'var(--iris)', borderColor: 'var(--frost)' }}>
                  <BookOpen size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{course.title}</strong>
                  <small>{course.modules.length} modules · {countLessons(course)} lessons · {course.is_published ? 'Published' : 'Draft'}</small>
                </span>
                {!isCreator && (
                  <span style={{ width: 120, display: 'grid', gap: 6 }} className="hide-sm">
                    <span className="progress-line"><span style={{ width: `${percent}%` }} /></span>
                    <small style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{percent}%</small>
                  </span>
                )}
                <ArrowRight size={18} style={{ flex: 'none' }} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <span className="empty-mark"><BookOpen size={24} /></span>
          <strong>{isCreator ? 'No courses yet.' : 'No courses yet.'}</strong>
          <p>
            {isCreator
              ? 'Create your first course, then add modules and lessons.'
              : 'When a creator adds you to a course, or you accept an invitation link, it lands right here.'}
          </p>
          {isCreator ? (
            <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={16} /> New course</button>
          ) : null}
        </div>
      )}

      {!isCreator && (
        <div className="card" style={{ marginTop: 26, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', background: 'var(--frost)', borderColor: 'var(--frost)', boxShadow: 'none' }}>
          <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--iris)', color: 'var(--paper)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Sparkles size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong style={{ fontSize: 18, fontWeight: 400, display: 'block' }}>Want to teach on Tura too?</strong>
            <span style={{ fontSize: 15.5, color: 'rgba(17,17,24,0.68)' }}>Your student account can also run courses. It takes one click.</span>
          </div>
          <button
            className="btn btn-dark btn-sm"
            onClick={async () => {
              try { await onBecomeCreator(); toast('Creator access enabled.'); }
              catch (error) { toast(error instanceof Error ? error.message : 'Could not enable creator access.'); }
            }}
          >
            Become a creator
          </button>
        </div>
      )}

      {creating && (
        <Modal title="New course" onClose={() => setCreating(false)}>
          <form onSubmit={create} style={{ display: 'grid', gap: 16 }}>
            <div className="field">
              <label htmlFor="course-title">Course title</label>
              <input className="input" id="course-title" name="title" required autoFocus placeholder="Graphic Design with AI" />
            </div>
            <div className="field">
              <label htmlFor="course-category">Category</label>
              <input className="input" id="course-category" name="category" placeholder="Design & Creativity" />
            </div>
            <div className="field">
              <label htmlFor="course-desc">Short description</label>
              <textarea className="textarea" id="course-desc" name="description" rows={3} placeholder="What will students walk away with?" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy && <Loader2 size={17} />} Create course
            </button>
            <p className="helper">The course starts as a draft. Publish it once lessons are in.</p>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Course list
   --------------------------------------------------------------------------- */

function CourseList({ courses, isCreator, completed, enrolledIds, onOpenCourse, onPage, onCreateCourse, onBecomeCreator, toast }: WorkspaceProps) {
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await onCreateCourse({
        title: String(form.get('title') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        category: String(form.get('category') ?? 'Other').trim(),
      });
      setCreating(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create the course.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="view-head">
        <div>
          <h1>{isCreator ? 'Your courses' : 'Your courses'}</h1>
          <p>{isCreator ? 'Everything you publish lives here.' : 'Courses you have been enrolled in.'}</p>
        </div>
        {isCreator ? (
          <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={18} /> New course</button>
        ) : (
          <button className="btn btn-outline" onClick={() => void onBecomeCreator().then(() => toast('Creator access enabled.')).catch((error) => toast(error instanceof Error ? error.message : 'Could not enable creator access.'))}>
            <Sparkles size={17} /> Become a creator
          </button>
        )}
      </div>

      {courses.length ? (
        <div className="grid-3">
          {courses.map((course) => {
            const percent = courseProgress(course, completed);
            return (
              <button className="course-card" key={course.id} onClick={() => onOpenCourse(course.id)} style={{ textAlign: 'left' }}>
                <div className="course-art">
                  {course.thumbnail_url
                    ? <img src={course.thumbnail_url} alt="" loading="lazy" />
                    : <div className="course-art-fallback"><BookOpen size={38} /></div>}
                  <span className="course-badge">{course.is_published ? 'Live' : 'Draft'}</span>
                </div>
                <div className="course-body">
                  <h3>{course.title}</h3>
                  <div className="course-meta">
                    <span>{course.modules.length} modules</span>
                    <span>{countLessons(course)} lessons</span>
                  </div>
                  {!isCreator && (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <span className="progress-line"><span style={{ width: `${percent}%` }} /></span>
                      <span className="mono" style={{ fontSize: 12, color: 'rgba(17,17,24,0.55)' }}>{percent}% complete</span>
                    </div>
                  )}
                  <div className="course-cta">
                    <span style={{ fontSize: 14.5, color: 'rgba(17,17,24,0.62)' }}>{course.category || 'Course'}</span>
                    <span className="course-cta-arrow"><ArrowRight size={17} /></span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <span className="empty-mark"><BookOpen size={24} /></span>
          <strong>Nothing here yet.</strong>
          <p>{isCreator ? 'Create a course to get started.' : 'Ask your creator for an invitation link.'}</p>
          {isCreator
            ? <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={16} /> New course</button>
            : <button className="btn btn-outline btn-sm" onClick={() => onPage('overview')}>Back to overview</button>}
        </div>
      )}

      {creating && (
        <Modal title="New course" onClose={() => setCreating(false)}>
          <form onSubmit={create} style={{ display: 'grid', gap: 16 }}>
            <div className="field">
              <label htmlFor="c-title">Course title</label>
              <input className="input" id="c-title" name="title" required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="c-category">Category</label>
              <input className="input" id="c-category" name="category" placeholder="Design & Creativity" />
            </div>
            <div className="field">
              <label htmlFor="c-desc">Short description</label>
              <textarea className="textarea" id="c-desc" name="description" rows={3} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy && <Loader2 size={17} />} Create course
            </button>
          </form>
        </Modal>
      )}
      {enrolledIds.size > 0 && <span className="sr-only">{enrolledIds.size} enrolments</span>}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Course room
   --------------------------------------------------------------------------- */

function CourseRoom(props: WorkspaceProps & { course: CourseWithContent }) {
  const {
    course, isCreator, completed, activeLessonId, onSelectLesson,
    onToggleLesson, onCreateModule, onCreateLesson, onDeleteLesson, onTogglePublish, toast,
  } = props;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<'module' | { moduleId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const lessons = course.modules.flatMap((module) => module.lessons);
  const active = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0] ?? null;
  const activeModule = course.modules.find((module) => module.lessons.some((lesson) => lesson.id === active?.id)) ?? null;
  const doneCount = lessons.filter((lesson) => completed.has(lesson.id)).length;
  const percent = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
  const isOpen = (moduleId: string) => open[moduleId] ?? true;

  async function addModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get('title') ?? '').trim();
    if (!title) return;
    setBusy(true); setError('');
    try { await onCreateModule(course.id, title); setAdding(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not add the module.'); }
    finally { setBusy(false); }
  }

  async function addLesson(event: FormEvent<HTMLFormElement>, moduleId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const url = String(form.get('url') ?? '').trim();
    if (!getYouTubeId(url)) { setError('Paste a valid YouTube link.'); return; }
    setBusy(true); setError('');
    try { await onCreateLesson({ moduleId, title, youtubeUrl: url }); setAdding(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not add the lesson.'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="room-head">
        {course.thumbnail_url && (
          <div className="room-head-art"><img src={course.thumbnail_url} alt="" /></div>
        )}
        <div className="room-head-body">
          <div className="room-meta">
            <span className={course.is_published ? 'tag tag--green' : 'tag'} style={course.is_published ? undefined : { background: 'var(--yellow)' }}>
              {course.is_published ? 'Published' : 'Draft'}
            </span>
            {course.category && <span className="tag tag--outline">{course.category}</span>}
          </div>
          <h1>{course.title}</h1>
          {course.description && <p style={{ fontSize: 17, color: 'rgba(17,17,24,0.68)', maxWidth: '60ch' }}>{course.description}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 11, color: 'rgba(17,17,24,0.56)' }}>{course.modules.length} modules · {lessons.length} lessons</span>
            <span style={{ flex: 1, minWidth: 140, maxWidth: 260 }}>
              <span className="progress-line"><span style={{ width: `${percent}%` }} /></span>
            </span>
            <span className="mono" style={{ fontSize: 11 }}>{percent}%</span>
          </div>
          {isCreator && (
            <div className="btn-row">
              <button className="btn btn-outline btn-sm" onClick={() => setAdding('module')}><Plus size={16} /> Add module</button>
              <button
                className="btn btn-dark btn-sm"
                onClick={() => void onTogglePublish(course, !course.is_published)}
              >
                {course.is_published ? 'Unpublish' : 'Publish course'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="room-grid">
        <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
          <div className="player">
            <div className="player-frame">
              {active && getYouTubeEmbedUrl(active.youtube_url) ? (
                <iframe
                  key={active.id}
                  src={getYouTubeEmbedUrl(active.youtube_url)!}
                  title={active.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <div className="player-placeholder">
                  <Video size={30} />
                  <span>{isCreator ? 'Add a lesson to start the course.' : 'This course has no lessons yet.'}</span>
                </div>
              )}
            </div>
            <div className="lesson-info">
              {active ? (
                <>
                  <span className="lesson-eyebrow">{activeModule?.title ?? 'Lesson'}</span>
                  <h2>{active.title}</h2>
                  {active.description && <p style={{ fontSize: 16, color: 'rgba(17,17,24,0.68)' }}>{active.description}</p>}
                  <div className="lesson-actions">
                    <button
                      className={completed.has(active.id) ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
                      onClick={() => void onToggleLesson(active, !completed.has(active.id))}
                    >
                      {completed.has(active.id) ? <Check size={16} /> : <CheckCircle2 size={16} />}
                      {completed.has(active.id) ? 'Completed' : 'Mark complete'}
                    </button>
                    <a className="btn btn-ghost btn-sm" href={active.youtube_url} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} /> Open on YouTube
                    </a>
                    {isCreator && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (!window.confirm(`Remove "${active.title}" from this course?`)) return;
                          void onDeleteLesson(active.id).then(() => toast('Lesson removed.'));
                        }}
                        style={{ color: '#b41f1f' }}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 16, color: 'rgba(17,17,24,0.64)' }}>No lesson selected.</p>
              )}
            </div>
          </div>

          {isCreator && (
            <div className="card" style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h2 className="h-sm">Course builder</h2>
                <button className="btn btn-outline btn-sm" onClick={() => setAdding('module')}><Plus size={15} /> Module</button>
              </div>
              <p className="helper">Add a module, then paste a YouTube link into it. Changes appear for students immediately.</p>
              {course.modules.length === 0 && <p style={{ fontSize: 15, color: 'rgba(17,17,24,0.6)' }}>No modules yet.</p>}
              <div style={{ display: 'grid', gap: 10 }}>
                {course.modules.map((module) => (
                  <div key={module.id} className="row-item" style={{ flexWrap: 'wrap' }}>
                    <span style={{ flex: 1, minWidth: 160 }}>
                      <strong>{module.title}</strong>
                      <small>{module.lessons.length} lessons</small>
                    </span>
                    <button className="btn btn-outline btn-sm" onClick={() => setAdding({ moduleId: module.id })}>
                      <Plus size={15} /> Lesson
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside style={{ display: 'grid', gap: 12 }}>
          <div className="curriculum-head">
            <span>Course content</span>
            <span>{doneCount}/{lessons.length}</span>
          </div>
          <div className="curriculum">
            {course.modules.map((module, index) => (
              <div className="module" key={module.id}>
                <button
                  className="module-top"
                  data-open={isOpen(module.id)}
                  onClick={() => setOpen((current) => ({ ...current, [module.id]: !isOpen(module.id) }))}
                >
                  <ChevronDown size={16} className="chev" />
                  <span>{module.title}</span>
                  <small>{String(index + 1).padStart(2, '0')} · {module.lessons.length}</small>
                </button>
                {isOpen(module.id) && module.lessons.map((lesson) => {
                  const done = completed.has(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      className={`lesson-row${done ? ' done' : ''}`}
                      aria-current={active?.id === lesson.id}
                      onClick={() => onSelectLesson(lesson.id)}
                    >
                      <span className="lesson-dot">{done ? <Check size={10} /> : null}</span>
                      <span>{lesson.title}</span>
                      {lesson.duration && <small className="mono" style={{ fontSize: 10, opacity: 0.6 }}>{lesson.duration}</small>}
                    </button>
                  );
                })}
              </div>
            ))}
            {!course.modules.length && (
              <div className="empty" style={{ padding: 28 }}>
                <span className="empty-mark"><PlayCircle size={22} /></span>
                <strong>No modules yet.</strong>
                {isCreator && <button className="btn btn-primary btn-sm" onClick={() => setAdding('module')}><Plus size={15} /> Add the first one</button>}
              </div>
            )}
          </div>
          {isCreator && (
            <div className="card card--flat" style={{ background: 'var(--frost)', borderColor: 'var(--frost)', display: 'grid', gap: 10 }}>
              <span className="label">Share with students</span>
              <p className="helper">Head to Students to enrol someone by email or copy an invitation link.</p>
              <button className="btn btn-dark btn-sm" onClick={() => props.onPage('students')}>
                <Share2 size={15} /> Manage access
              </button>
            </div>
          )}
        </aside>
      </div>

      {adding === 'module' && (
        <Modal title="New module" onClose={() => setAdding(null)}>
          <form onSubmit={addModule} style={{ display: 'grid', gap: 16 }}>
            <div className="field">
              <label htmlFor="module-title">Module title</label>
              <input className="input" id="module-title" name="title" required autoFocus placeholder="Getting started" />
            </div>
            {error && <p className="error-text"><AlertCircle size={16} />{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy && <Loader2 size={17} />} Add module</button>
          </form>
        </Modal>
      )}

      {adding && adding !== 'module' && (
        <Modal title="New lesson" onClose={() => setAdding(null)}>
          <form onSubmit={(event) => void addLesson(event, adding.moduleId)} style={{ display: 'grid', gap: 16 }}>
            <div className="field">
              <label htmlFor="lesson-title">Lesson title</label>
              <input className="input" id="lesson-title" name="title" required autoFocus placeholder="Understanding the brief" />
            </div>
            <div className="field">
              <label htmlFor="lesson-url">YouTube URL</label>
              <input className="input" id="lesson-url" name="url" required placeholder="https://youtu.be/..." />
              <span className="helper">Any standard YouTube link works. The video stays on YouTube.</span>
            </div>
            {error && <p className="error-text"><AlertCircle size={16} />{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy && <Loader2 size={17} />} Add lesson</button>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Students (creator roster + invites)
   --------------------------------------------------------------------------- */

function StudentsView(props: WorkspaceProps) {
  const { courses, activeCourseId, isCreator, loadRoster, loadInvites, onCreateInvite, onRevokeInvite, onEnroll, onRevoke, toast } = props;
  const [courseId, setCourseId] = useState(activeCourseId ?? courses[0]?.id ?? '');
  const [roster, setRoster] = useState<Enrollment[] | null>(null);
  const [invites, setInvites] = useState<CourseInvite[] | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const course = courses.find((row) => row.id === courseId) ?? courses[0] ?? null;

  const courseKey = course?.id ?? '';
  useEffect(() => {
    if (!courseKey) return;
    let cancelled = false;
    setRoster(null);
    setInvites(null);
    void Promise.all([loadRoster(courseKey), loadInvites(courseKey)])
      .then(([nextRoster, nextInvites]) => {
        if (cancelled) return;
        setRoster(nextRoster);
        setInvites(nextInvites);
      })
      .catch(() => { if (!cancelled) { setRoster([]); setInvites([]); } });
    return () => { cancelled = true; };
  }, [courseKey, loadRoster, loadInvites]);

  if (!isCreator) {
    return (
      <div className="empty">
        <span className="empty-mark"><Users size={22} /></span>
        <strong>Students only see their own courses.</strong>
        <p>Creator access is needed to manage a roster. You can enable it from the Overview page.</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="empty">
        <span className="empty-mark"><BookOpen size={22} /></span>
        <strong>Create a course first.</strong>
        <p>Students are added to a specific course, so start there.</p>
      </div>
    );
  }

  async function invite() {
    setBusy(true); setError('');
    try {
      const next = await onCreateInvite(course!.id);
      setInvites((current) => [next, ...(current ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create an invitation.');
    } finally { setBusy(false); }
  }

  async function enrol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setError('');
    try {
      await onEnroll(course!.id, email.trim());
      const [nextRoster, nextInvites] = await Promise.all([loadRoster(course!.id), loadInvites(course!.id)]);
      setRoster(nextRoster); setInvites(nextInvites);
      setEmail('');
      toast('Student added. They can sign in now.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that student.');
    } finally { setBusy(false); }
  }

  async function copy(value: string, label: string) {
    const url = `${window.location.origin}/?invite=${value}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 2200);
    } catch {
      window.prompt('Copy this invitation link', url);
    }
  }

  return (
    <>
      <div className="view-head">
        <div>
          <h1>Students</h1>
          <p>Add people by email, or send one link that works for anyone you invite.</p>
        </div>
        {courses.length > 1 && (
          <select className="select" style={{ width: 'auto', minWidth: 220 }} value={courseId} onChange={(event) => setCourseId(event.target.value)} aria-label="Course">
            {courses.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
          </select>
        )}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <h2 className="h-sm">Add a student</h2>
            <p className="helper">They need a Tura account first. If they do not have one, send them the invite link instead.</p>
          </div>
          <form onSubmit={enrol} style={{ display: 'grid', gap: 12 }}>
            <div className="field">
              <label htmlFor="student-email">Student email</label>
              <input
                className="input"
                id="student-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@email.com"
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? <Loader2 size={17} /> : <MailPlus size={17} />} Add to course
            </button>
          </form>
          {error && <p className="error-text"><AlertCircle size={16} style={{ flex: 'none' }} />{error}</p>}
          <p className="helper" style={{ borderTop: '1px solid var(--frost)', paddingTop: 14 }}>
            Course: <strong style={{ fontWeight: 400 }}>{course.title}</strong> · {course.is_published ? 'Published' : 'Draft'}
          </p>
        </div>

        <div className="card" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <h2 className="h-sm">Invitation links</h2>
            <p className="helper">A link enrols whoever opens it. Revoke one any time.</p>
          </div>
          <button className="btn btn-dark" onClick={() => void invite()} disabled={busy}>
            {busy ? <Loader2 size={17} /> : <Link2 size={17} />} Create invitation link
          </button>
          <div style={{ display: 'grid', gap: 8 }}>
            {(invites ?? []).map((row) => (
              <div key={row.id} className="roster-row" style={{ flexWrap: 'wrap', gap: 10 }}>
                <span style={{ flex: 1, minWidth: 140 }}>
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 400 }}>…{row.token.slice(-8)}</strong>
                  <small>expires {formatShortDate(row.expires_at)}</small>
                </span>
                <button className="btn btn-outline btn-sm" onClick={() => void copy(row.token, row.id)}>
                  <Copy size={14} /> {copied === row.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  className="icon-btn"
                  aria-label="Revoke invitation"
                  onClick={() => void onRevokeInvite(row.id).then(() => setInvites((current) => (current ?? []).filter((item) => item.id !== row.id)))}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            {invites && invites.length === 0 && <p className="helper">No active links yet.</p>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <div className="section-head" style={{ marginBottom: 14 }}>
          <h2 className="h-md">Roster</h2>
          <span className="tag">{roster?.length ?? 0} enrolled</span>
        </div>
        {roster === null ? (
          <div className="row-list">
            {[0, 1, 2].map((index) => <div className="row-item" key={index} style={{ height: 68, opacity: 0.4 }} />)}
          </div>
        ) : roster.length ? (
          <div className="roster">
            {roster.map((row) => (
              <div className="roster-row" key={row.id}>
                <span className="avatar avatar--sm">{initials(row.profiles?.full_name ?? 'Student')}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{row.profiles?.full_name || 'Student'}</strong>
                  <small>{row.profiles?.email || 'No email on file'} · joined {formatDate(row.enrolled_at)}</small>
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => void onRevoke(row.id).then(() => setRoster((current) => (current ?? []).filter((item) => item.id !== row.id)))}
                >
                  <UserMinus size={15} /> Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <span className="empty-mark"><Users size={22} /></span>
            <strong>No students yet.</strong>
            <p>Add someone by email above, or share an invitation link.</p>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
   Profile
   --------------------------------------------------------------------------- */

function ProfileView(props: WorkspaceProps) {
  const { profile, creatorBio, isCreator, courses, completed, onBecomeCreator, onUpdateProfile, toast } = props;
  const [displayName, setDisplayName] = useState(profile.full_name);
  const [bio, setBio] = useState(creatorBio);
  const [busy, setBusy] = useState(false);
  const name = profile.full_name || profile.email?.split('@')[0] || 'Tura member';
  const done = courses.reduce(
    (sum, course) => sum + course.modules.flatMap((module) => module.lessons).filter((lesson) => completed.has(lesson.id)).length,
    0,
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onUpdateProfile({ display_name: displayName.trim() || name, bio: bio.trim() });
      toast('Creator profile saved.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="view-head">
        <div>
          <h1>Profile</h1>
          <p>Your details, your account type, and how students see you.</p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <span className="avatar avatar--lg">{initials(name)}</span>
        <div style={{ flex: 1, minWidth: 220, display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 26, fontWeight: 400, letterSpacing: '-0.022em' }}>{name}</strong>
          <span style={{ fontSize: 16, color: 'rgba(17,17,24,0.66)' }}>{profile.email}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <span className="tag tag--iris">{isCreator ? 'Creator' : 'Student'}</span>
            <span className="tag">{courses.length} courses</span>
            {!isCreator && <span className="tag">{done} lessons done</span>}
          </div>
        </div>
        {!isCreator && (
          <button
            className="btn btn-dark"
            onClick={() => void onBecomeCreator().then(() => toast('Creator access enabled.')).catch((error) => toast(error instanceof Error ? error.message : 'Could not enable creator access.'))}
          >
            <Sparkles size={17} /> Become a creator
          </button>
        )}
      </div>

      {isCreator ? (
        <form className="card" onSubmit={save} style={{ display: 'grid', gap: 16, maxWidth: 620 }}>
          <h2 className="h-sm">Public creator profile</h2>
          <div className="field">
            <label htmlFor="display-name">Display name</label>
            <input className="input" id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="bio">Short bio</label>
            <textarea className="textarea" id="bio" rows={3} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Practical learning, clearly organized." />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy && <Loader2 size={17} />} Save profile</button>
        </form>
      ) : (
        <div className="card" style={{ display: 'grid', gap: 10, maxWidth: 620 }}>
          <h2 className="h-sm">Student account</h2>
          <p className="helper">You can join courses with an invite link. Turning on creator access adds a course builder to this same account — nothing is lost.</p>
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Modal
   --------------------------------------------------------------------------- */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal fade-up">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export type { Course, Module };
