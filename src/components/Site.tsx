import { ArrowRight, BookOpen, PlayCircle, Sparkles, Users } from 'lucide-react';
import { HeroShapes, SoftShapes, ShapeLayer } from './Shapes';
import type { CatalogCourse } from '../lib/types';

/* ---------------------------------------------------------------------------
   Shared chrome
   --------------------------------------------------------------------------- */

export function Ticker({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {doubled.map((item, index) => (
          <span className="ticker-item" key={index}>
            {item} <span style={{ opacity: 0.5, paddingLeft: 28 }}>•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

type NavProps = {
  onSignIn: () => void;
  onSignUp: () => void;
  onOpenWorkspace?: () => void;
  signedIn: boolean;
};

export function SiteNav({ onSignIn, onSignUp, onOpenWorkspace, signedIn }: NavProps) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="brand" href="#top" aria-label="Tura home">
          <span className="brand-mark" aria-hidden="true">t</span>
          <span>Tura</span>
        </a>
        <nav className="nav-links hide-sm" aria-label="Primary">
          <a className="nav-link" href="#courses">Courses</a>
          <a className="nav-link" href="#how">How it works</a>
          <a className="nav-link" href="#creators">For creators</a>
        </nav>
        {signedIn ? (
          <button className="btn btn-dark btn-sm" onClick={onOpenWorkspace}>
            Open workspace <ArrowRight size={16} />
          </button>
        ) : (
          <div className="btn-row" style={{ gap: 10 }}>
            <button className="btn btn-ghost btn-sm hide-sm" onClick={onSignIn}>Sign in</button>
            <button className="btn btn-dark btn-sm" onClick={onSignUp}>Start free</button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------------
   Hero
   --------------------------------------------------------------------------- */

export function Hero({ courseCount, lessonCount, onSignUp, onBrowse }: {
  courseCount: number;
  lessonCount: number;
  onSignUp: () => void;
  onBrowse: () => void;
}) {
  return (
    <section className="hero" id="top" style={{ position: 'relative' }}>
      <HeroShapes />
      <div className="page hero-inner">
        <span className="hero-mark" aria-hidden="true">✦</span>
        <h1 className="h-mega">
          Teach something<br />worth learning.
        </h1>
        <p className="lede" style={{ maxWidth: 600 }}>
          Tura is the course workspace that gets out of your way. Publish YouTube lessons,
          invite your class with one link, and watch the work actually happen.
        </p>
        <div className="btn-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button className="btn btn-primary btn-lg" onClick={onSignUp}>
            Start teaching free <ArrowRight size={20} />
          </button>
          <button className="btn btn-dark btn-lg" onClick={onBrowse}>Browse courses</button>
        </div>
        <div className="hero-facts">
          <span className="tag">{courseCount} live {courseCount === 1 ? 'course' : 'courses'}</span>
          <span className="tag tag--yellow">{lessonCount} lessons</span>
          <span className="tag">No credit card</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Catalog
   --------------------------------------------------------------------------- */

export function Catalog({ courses, onOpen, signedIn }: {
  courses: CatalogCourse[];
  onOpen: (courseId: string) => void;
  signedIn: boolean;
}) {
  return (
    <section className="section" id="courses">
      <div className="page">
        <div className="section-head">
          <div style={{ display: 'grid', gap: 10 }}>
            <p className="mono" style={{ color: 'rgba(17,17,24,0.6)' }}>The catalog</p>
            <h2 className="h-display">Courses in session.</h2>
          </div>
          {!signedIn && (
            <a className="btn btn-outline btn-sm" href="#how">How enrolment works <ArrowRight size={16} /></a>
          )}
        </div>
        {courses.length ? (
          <div className="grid-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <span className="empty-mark"><BookOpen size={24} /></span>
            <strong>The first course is warming up.</strong>
            <p>Creators are setting up lessons right now. Check back shortly.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CourseCard({ course, onOpen }: { course: CatalogCourse; onOpen: (id: string) => void }) {
  return (
    <button className="course-card" onClick={() => onOpen(course.id)} style={{ textAlign: 'left' }}>
      <div className="course-art">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt="" loading="lazy" />
        ) : (
          <div className="course-art-fallback"><BookOpen size={40} /></div>
        )}
        <span className="course-badge">{course.category || 'Course'}</span>
      </div>
      <div className="course-body">
        <h3>{course.title}</h3>
        <div className="course-meta">
          <span>{course.module_count} modules</span>
          <span>{course.lesson_count} lessons</span>
        </div>
        <p style={{ fontSize: 16, color: 'rgba(17,17,24,0.66)', lineHeight: 1.45 }}>
          {course.description || 'A guided course on Tura.'}
        </p>
        <div className="course-cta">
          <span style={{ fontSize: 15, color: 'rgba(17,17,24,0.66)' }}>with {course.creator_name}</span>
          <span className="course-cta-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
        </div>
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------------------
   How it works
   --------------------------------------------------------------------------- */

export function HowItWorks() {
  return (
    <section className="band band--pink" id="how">
      <ShapeLayer
        shapes={[
          { kind: 'circle', color: 'sky', size: 240, top: '-60px', right: '4%' },
          { kind: 'star', color: 'yellow', size: 150, bottom: '8%', left: '3%', rotate: 10 },
          { kind: 'semicircle', color: 'red', size: 200, bottom: '-70px', right: '22%' },
        ]}
      />
      <div className="page band-inner">
        <div className="section-head">
          <div style={{ display: 'grid', gap: 10 }}>
            <p className="mono" style={{ color: 'rgba(17,17,24,0.62)' }}>How it works</p>
            <h2 className="h-display">Three moves. That's it.</h2>
          </div>
        </div>
        <div className="steps">
          <article className="step">
            <span className="step-num">01</span>
            <h3>Build the course</h3>
            <p>Paste a YouTube link for every lesson. Group them into modules and publish when it feels right.</p>
          </article>
          <article className="step">
            <span className="step-num">02</span>
            <h3>Add your students</h3>
            <p>Enrol a student by email in seconds, or send one invitation link that works for the whole class.</p>
          </article>
          <article className="step">
            <span className="step-num">03</span>
            <h3>They pick up where they left off</h3>
            <p>Students open the same link, sign in, and land straight in the lesson list with their progress saved.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Creator band
   --------------------------------------------------------------------------- */

export function CreatorBand({ onSignUp }: { onSignUp: () => void }) {
  return (
    <section className="band band--paper" id="creators">
      <div className="page band-inner" style={{ display: 'grid', gap: 40 }}>
        <div className="grid-2" style={{ alignItems: 'center', gap: 44 }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <p className="mono" style={{ color: 'rgba(17,17,24,0.6)' }}>For creators</p>
            <h2 className="h-display">Your classroom,<br />without the admin.</h2>
            <p className="lede" style={{ color: 'rgba(17,17,24,0.72)' }}>
              You keep the videos where they already live. Tura handles the roster, the
              invite links, the progress tracking and the single place your students go.
            </p>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={onSignUp}>
                Create a course <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              { icon: Sparkles, title: 'One-click creator access', copy: 'Flip the switch on any account. No waitlist, no approval email.' },
              { icon: Users, title: 'Roster you can actually read', copy: 'Every enrolled student, their email, and when they joined — in one list.' },
              { icon: PlayCircle, title: 'YouTube-first, forever', copy: 'No uploads, no transcoding, no storage bill. Just the links you already have.' },
            ].map(({ icon: Icon, title, copy }) => (
              <div className="card" key={title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', background: 'var(--yellow)', border: '1px solid var(--ink)', display: 'grid', placeItems: 'center' }}>
                  <Icon size={20} />
                </span>
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong style={{ fontSize: 19, fontWeight: 400, letterSpacing: '-0.02em' }}>{title}</strong>
                  <span style={{ fontSize: 16, color: 'rgba(17,17,24,0.66)', lineHeight: 1.45 }}>{copy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Closing CTA
   --------------------------------------------------------------------------- */

export function ClosingCta({ onSignUp, onSignIn, signedIn, onOpenWorkspace }: {
  onSignUp: () => void;
  onSignIn: () => void;
  signedIn: boolean;
  onOpenWorkspace: () => void;
}) {
  return (
    <section className="band band--iris" style={{ position: 'relative' }}>
      <ShapeLayer
        shapes={[
          { kind: 'circle', color: 'yellow', size: 210, top: '-70px', left: '-50px' },
          { kind: 'pentagon', color: 'pink', size: 240, bottom: '-90px', right: '-60px', rotate: 16 },
          { kind: 'star', color: 'sky', size: 140, top: '20%', right: '12%', rotate: -10 },
          { kind: 'circle', color: 'red', size: 90, bottom: '18%', left: '14%' },
        ]}
      />
      <div className="page band-inner" style={{ display: 'grid', justifyItems: 'center', gap: 24, textAlign: 'center' }}>
        <h2 className="h-display" style={{ maxWidth: 760 }}>
          {signedIn ? 'Your classroom is ready.' : 'Start the course you keep postponing.'}
        </h2>
        <p className="lede" style={{ maxWidth: 520, color: 'rgba(255,255,255,0.86)' }}>
          {signedIn
            ? 'Pick up where you left off, or add another student to the roster.'
            : 'Create an account as a creator or a student. It takes about forty seconds.'}
        </p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          {signedIn ? (
            <button className="btn btn-lg" onClick={onOpenWorkspace} style={{ background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--ink)' }}>
              Open workspace <ArrowRight size={20} />
            </button>
          ) : (
            <>
              <button className="btn btn-lg" onClick={onSignUp} style={{ background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--ink)' }}>
                Create your account <ArrowRight size={20} />
              </button>
              <button className="btn btn-lg" onClick={onSignIn} style={{ background: 'transparent', color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.6)' }}>
                I already have one
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="brand-mark" style={{ width: 30, height: 30, fontSize: 16 }} aria-hidden="true">t</span>
          Tura — a course workspace with a pulse.
        </span>
        <span className="mono" style={{ fontSize: 11 }}>Lessons stay on YouTube</span>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------------------
   Public course landing (reached from the catalog or an invite)
   --------------------------------------------------------------------------- */

export function PublicCourse({
  course,
  modules,
  isMember,
  signedIn,
  onSignIn,
  onSignUp,
  onOpenCourse,
}: {
  course: { title: string; description: string; category: string; thumbnail_url: string | null; creator_name: string; lesson_count: number; student_count: number; module_count: number };
  modules: { id: string; title: string; lessons: { id: string; title: string }[] }[];
  isMember: boolean;
  signedIn: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  onOpenCourse: () => void;
}) {
  return (
    <>
      <section style={{ position: 'relative', overflow: 'hidden', padding: '56px 0 64px' }}>
        <SoftShapes />
        <div className="page" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-head" style={{ alignItems: 'flex-start', gap: 36 }}>
            <div style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
              <span className="tag tag--iris">{course.category || 'Course'}</span>
              <h1 className="h-display">{course.title}</h1>
              <p className="lede" style={{ color: 'rgba(17,17,24,0.7)' }}>{course.description}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <span className="tag">{course.module_count} modules</span>
                <span className="tag tag--yellow">{course.lesson_count} lessons</span>
                <span className="tag">{course.student_count} enrolled</span>
              </div>
              <div className="btn-row" style={{ marginTop: 6 }}>
                {isMember || signedIn ? (
                  <button className="btn btn-primary btn-lg" onClick={onOpenCourse}>
                    {isMember ? 'Continue learning' : 'Open in workspace'} <ArrowRight size={20} />
                  </button>
                ) : (
                  <>
                    <button className="btn btn-primary btn-lg" onClick={onSignUp}>
                      Join this course <ArrowRight size={20} />
                    </button>
                    <button className="btn btn-ghost" onClick={onSignIn}>I have an account</button>
                  </>
                )}
              </div>
              <p className="helper">Taught by {course.creator_name}. Enrolment is by invitation or creator-added email.</p>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', width: 'min(440px, 100%)', flex: '1 1 320px' }}>
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt="" style={{ aspectRatio: '16 / 10', objectFit: 'cover', width: '100%' }} />
              ) : (
                <div className="course-art-fallback" style={{ aspectRatio: '16 / 10' }}><BookOpen size={48} /></div>
              )}
              <div style={{ padding: 22, display: 'grid', gap: 8 }}>
                <p className="mono" style={{ color: 'rgba(17,17,24,0.6)' }}>Course outline</p>
                <strong style={{ fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em' }}>{course.module_count} modules, {course.lesson_count} lessons</strong>
                <p style={{ fontSize: 15.5, color: 'rgba(17,17,24,0.66)' }}>Videos play right inside Tura. Your progress is saved as you go.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{ background: 'var(--paper)', borderTop: '1px solid var(--frost)', borderBottom: '1px solid var(--frost)' }}>
        <div className="page">
          <div className="section-head" style={{ marginBottom: 24 }}>
            <h2 className="h-lg">What's inside</h2>
          </div>
          {modules.length ? (
            <div className="grid-2">
              {modules.map((module, index) => (
                <div className="card" key={module.id} style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="step-num" style={{ width: 38, height: 38, fontSize: 12 }}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="h-sm">{module.title}</h3>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15.5, color: 'rgba(17,17,24,0.72)' }}>
                        <PlayCircle size={15} style={{ flex: 'none', color: 'var(--iris)' }} />
                        {lesson.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <span className="empty-mark"><PlayCircle size={24} /></span>
              <strong>Lessons are being added.</strong>
              <p>The creator has not published the outline yet. Sign in to check your access.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
