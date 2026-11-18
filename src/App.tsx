import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, LogIn, Sparkles } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import {
  Catalog,
  ClosingCta,
  CreatorBand,
  Hero,
  HowItWorks,
  PublicCourse,
  SiteFooter,
  SiteNav,
  Ticker,
} from './components/Site';
import { initials } from './components/Shapes';
import { Workspace } from './components/Workspace';
import type { Page } from './components/Workspace';
import {
  acceptInvite,
  becomeCreator,
  createCourse,
  createInvite,
  createLesson,
  createModule,
  deleteLesson,
  enrollByEmail,
  fetchCatalog,
  fetchCourseContent,
  fetchCourseOutline,
  fetchEnrolledCourseIds,
  fetchInvitePreview,
  fetchInvites,
  fetchMyCourses,
  fetchProfile,
  fetchProgress,
  fetchRoster,
  isConfigured,
  revokeEnrollment,
  revokeInvite,
  saveProgress,
  signOut,
  updateCourse,
  updateCreatorProfile,
} from './lib/data';
import { authConfigured, clearAuthHash, readAuthError } from './lib/auth';
import { supabase } from './lib/supabase';
import type {
  CatalogCourse,
  Course,
  CourseWithContent,
  InvitePreview,
  Lesson,
  Profile,
} from './lib/types';

type Screen = 'site' | 'course' | 'auth' | 'workspace' | 'invite';

const TICKER = [
  'New: enrol students by email in one step',
  'Lessons stream from YouTube — nothing to upload',
  'Creator access is one click, no waitlist',
  'Invitation links expire — revoke any time',
];

const INVITE_KEY = 'tura.pending-invite';

function pathToPage(): Page | null {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/courses') return 'courses';
  if (path === '/students') return 'students';
  if (path === '/profile') return 'profile';
  if (path === '/workspace') return 'overview';
  return null;
}

/** Read the invite from the URL, or from the last visit if the user bounced out to confirm their email. */
function readInvite(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('invite');
  if (fromUrl) {
    window.sessionStorage.setItem(INVITE_KEY, fromUrl);
    return fromUrl;
  }
  return window.sessionStorage.getItem(INVITE_KEY);
}

function clearInvite() {
  window.sessionStorage.removeItem(INVITE_KEY);
}

/** Supabase appends #access_token=…&type=signup after an email confirmation. */
function readConfirmation(): boolean {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return hash.get('type') === 'signup' && Boolean(hash.get('access_token'));
}

export default function App() {
  const [ready, setReady] = useState(!isConfigured ? true : false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creatorBio, setCreatorBio] = useState('');
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [screen, setScreen] = useState<Screen>('site');
  const [page, setPage] = useState<Page>('overview');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [publicCourseId, setPublicCourseId] = useState<string | null>(null);
  const [publicCourse, setPublicCourse] = useState<Awaited<ReturnType<typeof fetchCourseOutline>>>(null);
  const [courses, setCourses] = useState<CourseWithContent[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [joining, setJoining] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [justConfirmed, setJustConfirmed] = useState(false);

  const notify = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage((current) => (current === message ? '' : current)), 3200);
  }, []);

  const isCreator = Boolean(profile && (profile.roles?.includes('creator') || profile.role === 'creator'));

  /* ---------------------------------------------------------------- catalog */

  const loadCatalog = useCallback(async () => {
    try {
      setCatalog(await fetchCatalog());
    } catch {
      setCatalog([]);
    }
  }, []);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  /* ------------------------------------------------------------------ auth */

  const loadWorkspace = useCallback(async (userId: string) => {
    setLoadingWorkspace(true);
    try {
      const { profile: nextProfile, creator } = await fetchProfile(userId);
      if (!nextProfile) return;
      setProfile(nextProfile);
      const [myCourses, progress, enrolled] = await Promise.all([
        fetchMyCourses(nextProfile),
        fetchProgress(userId),
        fetchEnrolledCourseIds(userId),
      ]);
      const content = await fetchCourseContent(myCourses.map((course) => course.id));
      const withContent = myCourses.map((course) => ({
        ...course,
        modules: content[course.id] ?? [],
      })) as CourseWithContent[];
      setCourses(withContent);
      setCompleted(progress);
      setEnrolledIds(new Set(enrolled));
      setActiveCourseId((current) => current ?? withContent[0]?.id ?? null);
      setActiveLessonId((current) => {
        if (current) return current;
        const first = withContent[0]?.modules.flatMap((module) => module.lessons)[0];
        return first?.id ?? null;
      });
      setCreatorBio(creator?.bio ?? '');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not load your workspace.');
    } finally {
      setLoadingWorkspace(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!isConfigured || !supabase) return;
    let mounted = true;
    const error = readAuthError();
    if (error) { setAuthError(error); clearAuthHash(); }
    else if (readConfirmation()) setJustConfirmed(true);

    const invite = readInvite();
    if (invite) {
      setInviteToken(invite);
      setScreen('invite');
      void fetchInvitePreview(invite)
        .then((preview) => {
          if (!mounted) return;
          if (preview) setInvitePreview(preview);
          else setInviteError('That invitation link is no longer valid or has expired.');
        })
        .catch(() => { if (mounted) setInviteError('That invitation link is no longer valid.'); });
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (user && mounted) {
        await loadWorkspace(user.id);
        if (!invite) {
          const target = pathToPage();
          if (target) { setPage(target); setScreen('workspace'); }
        }
      }
      if (mounted) setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
        setCourses([]);
        setCompleted(new Set());
        setEnrolledIds(new Set());
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        window.setTimeout(() => { void loadWorkspace(session.user.id); }, 0);
      }
    });

    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadWorkspace]);

  /* --------------------------------------------------------------- routing */

  const navigate = useCallback((next: Screen, nextPage: Page = 'overview') => {
    setScreen(next);
    if (next === 'workspace') setPage(nextPage);
    const slug = next === 'workspace'
      ? (nextPage === 'overview' ? '/' : `/${nextPage}`)
      : next === 'site' ? '/' : window.location.pathname;
    if (window.location.pathname !== slug && !(next === 'site' && window.location.search)) {
      window.history.replaceState({}, '', slug);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  function openPublicCourse(courseId: string) {
    setPublicCourseId(courseId);
    setScreen('course');
    setPublicCourse(null);
    window.scrollTo({ top: 0 });
    void fetchCourseOutline(courseId).then((outline) => setPublicCourse(outline)).catch(() => setPublicCourse(null));
  }

  function openWorkspaceCourse(courseId: string) {
    const course = courses.find((row) => row.id === courseId);
    if (!course) {
      openPublicCourse(courseId);
      return;
    }
    setActiveCourseId(courseId);
    const nextLesson = course.modules.flatMap((module) => module.lessons).find((lesson) => !completed.has(lesson.id));
    setActiveLessonId(nextLesson?.id ?? course.modules[0]?.lessons[0]?.id ?? null);
    navigate('workspace', 'courses');
  }

  async function afterAuth() {
    const { data } = await supabase!.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setAuthError('Your email is not confirmed yet. Open the confirmation link we sent, then sign in.');
      return;
    }
    await loadWorkspace(user.id);
    setAuthError('');
    if (inviteToken) {
      await joinWithInvite();
      return;
    }
    navigate('workspace', pathToPage() ?? 'overview');
  }

  /* -------------------------------------------------------------- invitations */

  async function joinWithInvite() {
    if (!inviteToken || !supabase) return;
    setJoining(true);
    setInviteError('');
    try {
      const courseId = await acceptInvite(inviteToken);
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) await loadWorkspace(data.session.user.id);
      await loadCatalog();
      clearInvite();
      window.history.replaceState({}, '', '/courses');
      setInviteToken(null);
      setInvitePreview(null);
      setActiveCourseId(courseId);
      navigate('workspace', 'courses');
      notify('You are in. The course has been added to your workspace.');
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Could not accept the invitation.');
    } finally {
      setJoining(false);
    }
  }

  /* ------------------------------------------------------------------ actions */

  const actions = useMemo(() => ({
    toast: notify,
    loadRoster: fetchRoster,
    loadInvites: fetchInvites,
    onToggleLesson: async (lesson: Lesson, next: boolean) => {
      if (!profile) return;
      setCompleted((current) => {
        const copy = new Set(current);
        if (next) copy.add(lesson.id); else copy.delete(lesson.id);
        return copy;
      });
      try { await saveProgress(profile.id, lesson.id, next); }
      catch (error) { notify(error instanceof Error ? error.message : 'Could not save progress.'); }
    },
    onBecomeCreator: async () => {
      if (!profile) return;
      await becomeCreator();
      const { profile: next } = await fetchProfile(profile.id);
      if (next) setProfile(next);
      await loadWorkspace(profile.id);
    },
    onCreateCourse: async (values: { title: string; description: string; category: string }) => {
      if (!profile) return;
      const created = await createCourse({ ...values, creator_id: profile.id });
      const next: CourseWithContent = { ...created, modules: [] };
      setCourses((current) => [next, ...current]);
      setActiveCourseId(created.id);
      setPage('courses');
      notify('Course created. Add a module next.');
    },
    onCreateModule: async (courseId: string, title: string) => {
      const course = courses.find((row) => row.id === courseId);
      const created = await createModule(courseId, title, course?.modules.length ?? 0);
      setCourses((current) => current.map((row) => row.id === courseId ? { ...row, modules: [...row.modules, created] } : row));
      notify('Module added.');
    },
    onCreateLesson: async ({ moduleId, title, youtubeUrl }: { moduleId: string; title: string; youtubeUrl: string }) => {
      const course = courses.find((row) => row.modules.some((module) => module.id === moduleId));
      const parent = course?.modules.find((module) => module.id === moduleId);
      const created = await createLesson({ module_id: moduleId, title, youtube_url: youtubeUrl, position: parent?.lessons.length ?? 0 });
      setCourses((current) => current.map((row) => row.id !== course?.id ? row : {
        ...row,
        modules: row.modules.map((module) => module.id === moduleId ? { ...module, lessons: [...module.lessons, created] } : module),
      }));
      setActiveLessonId(created.id);
      notify('Lesson added.');
    },
    onDeleteLesson: async (lessonId: string) => {
      await deleteLesson(lessonId);
      setCourses((current) => current.map((row) => ({
        ...row,
        modules: row.modules.map((module) => ({ ...module, lessons: module.lessons.filter((lesson) => lesson.id !== lessonId) })),
      })));
      setActiveLessonId((current) => (current === lessonId ? null : current));
      notify('Lesson removed.');
    },
    onTogglePublish: async (course: Course, publish: boolean) => {
      await updateCourse(course.id, { is_published: publish });
      setCourses((current) => current.map((row) => row.id === course.id ? { ...row, is_published: publish } : row));
      await loadCatalog();
      notify(publish ? 'Course is live.' : 'Course moved back to draft.');
    },
    onEnroll: async (courseId: string, email: string) => { await enrollByEmail(courseId, email); },
    onRevoke: async (enrollmentId: string) => { await revokeEnrollment(enrollmentId); notify('Student removed.'); },
    onCreateInvite: async (courseId: string) => {
      if (!profile) throw new Error('Sign in first.');
      return createInvite(courseId, profile.id);
    },
    onRevokeInvite: async (inviteId: string) => { await revokeInvite(inviteId); notify('Invitation revoked.'); },
    onUpdateProfile: async (values: { display_name: string; bio: string }) => {
      if (!profile) return;
      await updateCreatorProfile(profile.id, values);
      const { profile: next } = await fetchProfile(profile.id);
      if (next) setProfile(next);
    },
    onSignOut: async () => {
      await signOut();
      setProfile(null);
      setCourses([]);
      setCompleted(new Set());
      setEnrolledIds(new Set());
      setActiveCourseId(null);
      setActiveLessonId(null);
      navigate('site');
    },
  }), [completed, courses, loadCatalog, navigate, notify, profile]);

  /* ------------------------------------------------------------------- render */

  if (!ready) {
    return (
      <div className="loading-shell">
        <span className="loading-mark">t</span>
        <p className="mono" style={{ fontSize: 12, letterSpacing: '0.08em' }}>Loading Tura</p>
      </div>
    );
  }

  if (!authConfigured()) {
    return (
      <div className="loading-shell" style={{ padding: 24 }}>
        <div className="card" style={{ maxWidth: 520, display: 'grid', gap: 12 }}>
          <span className="tag tag--yellow">Configuration</span>
          <h1 className="h-md">Connect Supabase to use Tura.</h1>
          <p className="helper">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild.</p>
        </div>
      </div>
    );
  }

  const signedIn = Boolean(profile);
  const lessonCount = catalog.reduce((sum, course) => sum + Number(course.lesson_count ?? 0), 0);

  if (screen === 'workspace' && profile) {
    return (
      <>
        <Workspace
          profile={profile}
          creatorBio={creatorBio}
          isCreator={isCreator}
          courses={courses}
          enrolledIds={enrolledIds}
          completed={completed}
          page={page}
          activeCourseId={activeCourseId}
          activeLessonId={activeLessonId}
          onPage={(next) => { setPage(next); window.scrollTo({ top: 0 }); }}
          onOpenCourse={openWorkspaceCourse}
          onSelectLesson={(lessonId) => setActiveLessonId(lessonId)}
          {...actions}
        />
        {loadingWorkspace && (
          <div className="toast" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Loader2 size={16} /> Syncing your workspace
          </div>
        )}
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </>
    );
  }

  if (justConfirmed && !profile) {
    return (
      <>
        <Ticker items={TICKER} />
        <div className="invite-shell">
          <div className="invite-card fade-up" style={{ maxWidth: 620 }}>
            <div className="invite-body">
              <span className="tag tag--green">Email confirmed</span>
              <h1>You are verified.</h1>
              <p className="lede" style={{ color: 'rgba(17,17,24,0.7)' }}>
                {inviteToken
                  ? 'One last step: sign in and the course you were invited to will be added to your workspace automatically.'
                  : 'Your account is ready. Sign in to open your workspace.'}
              </p>
              <div className="btn-row">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => { clearAuthHash(); setJustConfirmed(false); setAuthMode('signin'); setScreen('auth'); }}
                >
                  Sign in <ArrowRight size={18} />
                </button>
                <button className="btn btn-ghost" onClick={() => { clearAuthHash(); setJustConfirmed(false); navigate('site'); }}>
                  Back to site
                </button>
              </div>
            </div>
          </div>
        </div>
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </>
    );
  }

  if (screen === 'auth') {
    return (
      <>
        <Ticker items={TICKER} />
        <AuthScreen
          mode={authMode}
          onMode={setAuthMode}
          onBack={() => navigate('site')}
          onSignedIn={() => { void afterAuth(); }}
          invitePending={Boolean(inviteToken)}
        />
        {authError && (
          <div className="toast" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={16} /> {authError}
          </div>
        )}
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </>
    );
  }

  if (screen === 'invite') {
    return (
      <>
        <Ticker items={TICKER} />
        <InviteFlow
          preview={invitePreview}
          error={inviteError}
          signedIn={signedIn}
          joining={joining}
          onJoin={() => void joinWithInvite()}
          onSignIn={() => { setAuthMode('signin'); setScreen('auth'); }}
          onSignUp={() => { setAuthMode('signup'); setScreen('auth'); }}
          onHome={() => navigate('site')}
        />
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </>
    );
  }

  if (screen === 'course') {
    return (
      <>
        <Ticker items={TICKER} />
        <SiteNav
          signedIn={signedIn}
          onSignIn={() => { setAuthMode('signin'); setScreen('auth'); }}
          onSignUp={() => { setAuthMode('signup'); setScreen('auth'); }}
          onOpenWorkspace={() => navigate('workspace', 'overview')}
        />
        {publicCourse ? (
          <PublicCourse
            course={publicCourse}
            modules={publicCourse.modules}
            isMember={Boolean(publicCourseId && enrolledIds.has(publicCourseId))}
            signedIn={signedIn}
            onSignIn={() => { setAuthMode('signin'); setScreen('auth'); }}
            onSignUp={() => { setAuthMode('signup'); setScreen('auth'); }}
            onOpenCourse={() => { if (publicCourseId) openWorkspaceCourse(publicCourseId); }}
          />
        ) : (
          <section className="section">
            <div className="page">
              <div className="empty">
                <span className="empty-mark"><AlertCircle size={22} /></span>
                <strong>{publicCourseId ? 'Loading this course…' : 'Course not found.'}</strong>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('site')}>Back to catalog</button>
              </div>
            </div>
          </section>
        )}
        <SiteFooter />
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </>
    );
  }

  return (
    <>
      <Ticker items={TICKER} />
      <SiteNav
        signedIn={signedIn}
        onSignIn={() => { setAuthMode('signin'); setScreen('auth'); }}
        onSignUp={() => { setAuthMode('signup'); setScreen('auth'); }}
        onOpenWorkspace={() => navigate('workspace', 'overview')}
      />
      <main id="top">
        <Hero
          courseCount={catalog.length}
          lessonCount={lessonCount}
          onSignUp={() => { setAuthMode('signup'); setScreen('auth'); }}
          onBrowse={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <Catalog courses={catalog} onOpen={openPublicCourse} signedIn={signedIn} />
        <HowItWorks />
        <CreatorBand onSignUp={() => { setAuthMode('signup'); setScreen('auth'); }} />
        <ClosingCta
          signedIn={signedIn}
          onSignUp={() => { setAuthMode('signup'); setScreen('auth'); }}
          onSignIn={() => { setAuthMode('signin'); setScreen('auth'); }}
          onOpenWorkspace={() => navigate('workspace', 'overview')}
        />
      </main>
      <SiteFooter />
      {authError && (
        <div className="toast" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertCircle size={16} /> {authError}
        </div>
      )}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Invitation landing
   --------------------------------------------------------------------------- */

function InviteFlow({
  preview,
  error,
  signedIn,
  joining,
  onJoin,
  onSignIn,
  onSignUp,
  onHome,
}: {
  preview: InvitePreview | null;
  error: string;
  signedIn: boolean;
  joining: boolean;
  onJoin: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onHome: () => void;
}) {
  return (
    <div className="invite-shell">
      <div className="invite-card fade-up">
        {preview?.thumbnail_url && (
          <div className="invite-art"><img src={preview.thumbnail_url} alt="" /></div>
        )}
        <div className="invite-body">
          <span className="tag tag--iris">You have been invited</span>
          {preview ? (
            <>
              <h1>{preview.title}</h1>
              <p className="lede" style={{ color: 'rgba(17,17,24,0.7)' }}>{preview.description}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="tag">{preview.lesson_count} lessons</span>
                <span className="tag tag--yellow">{preview.student_count} enrolled</span>
                <span className="tag tag--outline">{preview.category || 'Course'}</span>
              </div>
              <p className="helper">Taught by {preview.creator_name}. This link works until it expires or the creator revokes it.</p>
            </>
          ) : (
            <>
              <h1>{error ? 'This link is not active.' : 'Checking your invitation…'}</h1>
              <p className="helper">{error || 'One moment while we look up the course.'}</p>
            </>
          )}

          {error && <p className="error-text"><AlertCircle size={16} style={{ flex: 'none' }} />{error}</p>}

          {preview && (
            <div className="btn-row" style={{ marginTop: 6 }}>
              {signedIn ? (
                <button className="btn btn-primary btn-lg" onClick={onJoin} disabled={joining}>
                  {joining ? <Loader2 size={18} /> : <Sparkles size={18} />} Join this course
                </button>
              ) : (
                <>
                  <button className="btn btn-primary btn-lg" onClick={onSignUp}>
                    Create an account to join <ArrowRight size={18} />
                  </button>
                  <button className="btn btn-outline btn-lg" onClick={onSignIn}>
                    <LogIn size={18} /> Sign in
                  </button>
                </>
              )}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={onHome}>
            Explore Tura instead
          </button>
        </div>
      </div>
      {preview && <span className="sr-only">{initials(preview.creator_name)}</span>}
    </div>
  );
}
