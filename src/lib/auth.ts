import { supabase } from './supabase';

export type AuthMode = 'signin' | 'signup';

export function authConfigured() {
  return Boolean(supabase);
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message);
}

export async function signUp(values: {
  email: string;
  password: string;
  fullName: string;
  asCreator: boolean;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signUp({
    email: values.email.trim(),
    password: values.password,
    options: {
      data: {
        full_name: values.fullName.trim(),
        initial_role: values.asCreator ? 'creator' : 'student',
      },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw new Error(error.message);
  return { needsConfirmation: !data.session };
}

export async function resendConfirmation(email: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(error.message);
}

export function readAuthError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const description = hash.get('error_description') ?? query.get('error_description');
  if (description) return description.replace(/\+/g, ' ');
  if (hash.get('error') || query.get('error')) return 'That sign-in link could not be used.';
  return null;
}

export function clearAuthHash() {
  if (window.location.hash) {
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
  }
}
