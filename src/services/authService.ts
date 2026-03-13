import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { hasSupabaseConfig, supabase } from "../lib/supabase";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthSession = {
  user: AuthUser;
};

const MOCK_AUTH_KEY = "bomm_auth_session";
const listeners = new Set<(session: AuthSession | null) => void>();

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
    },
  };
}

function readMockSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(MOCK_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function writeMockSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;

  if (session) {
    window.localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(MOCK_AUTH_KEY);
  }
}

function emit(session: AuthSession | null) {
  listeners.forEach((listener) => listener(session));
}

export async function signIn(email: string, password: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return toAuthSession(data.session);
  }

  if (!email || !password) {
    throw new Error("Informe e-mail e senha.");
  }

  const session: AuthSession = {
    user: {
      id: email,
      email,
    },
  };

  writeMockSession(session);
  emit(session);
  return session;
}

export async function signOut() {
  if (hasSupabaseConfig && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }

  writeMockSession(null);
  emit(null);
}

export async function getSession(): Promise<AuthSession | null> {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return toAuthSession(data.session);
  }

  return readMockSession();
}

export function onAuthStateChange(
  callback: (session: AuthSession | null) => void
) {
  if (hasSupabaseConfig && supabase) {
    const { data } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        callback(toAuthSession(session));
      }
    );

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  }

  listeners.add(callback);
  return {
    unsubscribe: () => listeners.delete(callback),
  };
}
