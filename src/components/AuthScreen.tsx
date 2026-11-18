import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Loader2, Sparkles } from 'lucide-react';
import { requestPasswordReset, resendConfirmation, signIn, signUp } from '../lib/auth';
import { HeroShapes } from './Shapes';

type Props = {
  mode: 'signin' | 'signup';
  onMode: (mode: 'signin' | 'signup') => void;
  onBack: () => void;
  onSignedIn: () => void;
  invitePending?: boolean;
};

export function AuthScreen({ mode, onMode, onBack, onSignedIn, invitePending }: Props) {
  const [asCreator, setAsCreator] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [showReset, setShowReset] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const fullName = String(form.get('fullName') ?? '');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onSignedIn();
      } else {
        const result = await signUp({ email, password, fullName, asCreator });
        if (result.needsConfirmation) {
          setPendingEmail(email);
          setNotice(`We sent a confirmation link to ${email}. Open it to activate your ${asCreator ? 'creator' : 'student'} account.`);
        } else {
          onSignedIn();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const email = String(new FormData(event.currentTarget).get('email') ?? '');
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setNotice(`Password reset link sent to ${email}.`);
      setShowReset(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset link.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError('');
    try {
      await resendConfirmation(pendingEmail);
      setNotice(`A fresh confirmation link is on its way to ${pendingEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <HeroShapes />
      <div className="auth-card fade-up">
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ justifySelf: 'start', marginLeft: -6 }}>
          <ArrowLeft size={16} /> Back to site
        </button>

        <div style={{ display: 'grid', gap: 10 }}>
          {invitePending && <span className="tag tag--iris">Invitation waiting</span>}
          <h1>{mode === 'signup' ? 'Start your Tura account.' : 'Welcome back.'}</h1>
          <p style={{ fontSize: 17, color: 'rgba(17,17,24,0.68)' }}>
            {mode === 'signup'
              ? 'Pick how you want to use Tura. You can be both — creator access is one click away later.'
              : 'Sign in to your workspace, your courses and your roster.'}
          </p>
        </div>

        {error && <p className="error-text"><AlertCircle size={17} style={{ flex: 'none', marginTop: 1 }} />{error}</p>}
        {notice && <p className="success-text"><CheckCircle2 size={17} style={{ flex: 'none', marginTop: 1 }} />{notice}</p>}

        {mode === 'signup' && (
          <div className="role-picker" role="group" aria-label="Account type">
            <button type="button" className="role-card" aria-pressed={!asCreator} onClick={() => setAsCreator(false)}>
              <GraduationCap size={20} />
              <strong>I'm a student</strong>
              <span>Join courses with an invite link and track your progress.</span>
            </button>
            <button type="button" className="role-card" aria-pressed={asCreator} onClick={() => setAsCreator(true)}>
              <Sparkles size={20} />
              <strong>I'm a creator</strong>
              <span>Build courses, add lessons and enrol your own students.</span>
            </button>
          </div>
        )}

        {showReset ? (
          <form className="auth-form" onSubmit={handleReset}>
            <div className="field">
              <label htmlFor="reset-email">Account email</label>
              <input className="input" id="reset-email" name="email" type="email" required autoFocus placeholder="you@studio.com" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? <Loader2 size={18} className="spin" /> : null} Send reset link
            </button>
            <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => setShowReset(false)}>
              Never mind
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submit} key={mode}>
            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <input className="input" id="fullName" name="fullName" required autoFocus placeholder="Chisom Ogbonna" autoComplete="name" />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                className="input"
                id="email"
                name="email"
                type="email"
                required
                autoFocus={mode === 'signin'}
                placeholder="you@studio.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                className="input"
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? <Loader2 size={18} /> : null}
              {mode === 'signup' ? (asCreator ? 'Create creator account' : 'Create student account') : 'Sign in'}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <p className="auth-switch">
            {mode === 'signup' ? 'Already have an account?' : 'New to Tura?'}{' '}
            <button onClick={() => onMode(mode === 'signup' ? 'signin' : 'signup')}>
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </p>
          {mode === 'signin' && !showReset && (
            <p className="auth-switch">
              <button onClick={() => setShowReset(true)}>Forgot your password?</button>
            </p>
          )}
          {pendingEmail && (
            <button className="btn btn-outline btn-sm" style={{ justifySelf: 'start' }} onClick={resend} disabled={busy}>
              Resend confirmation email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
