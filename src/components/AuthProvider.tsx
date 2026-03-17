import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getSession,
  onAuthStateChange,
  signIn,
  signOut,
  type AuthSession,
} from "../services/authService";
import { bootstrapUserProfile } from "../services/profileService";
import type { UserProfile } from "../types/user";
import type { AuthChangeEvent } from "@supabase/supabase-js";

type AuthContextValue = {
  session: AuthSession | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  profileResolved: boolean;
  profileError: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown; details?: unknown };
    if (typeof maybeError.message === "string") return maybeError.message;
    if (typeof maybeError.details === "string") return maybeError.details;
  }

  return "Não foi possível carregar o perfil do usuário.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let mounted = true;
    let previousSessionUserId: string | null = null;

    async function loadProfile(nextSession: AuthSession | null) {
      setProfileLoading(true);
      setProfileResolved(false);
      setProfileError("");

      if (!nextSession?.user) {
        if (mounted) {
          setProfile(null);
          setProfileResolved(true);
          setProfileLoading(false);
        }
        return;
      }

      try {
        const nextProfile = await bootstrapUserProfile(nextSession.user);

        if (!mounted) return;

        if (!nextProfile.ativo) {
          await signOut();
          setSession(null);
          setProfile(null);
          setProfileResolved(true);
          return;
        }

        setProfile(nextProfile);
        setProfileResolved(true);
      } catch (error) {
        if (!mounted) return;

        setProfile(null);
        setProfileResolved(true);
        setProfileError(getErrorMessage(error));
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    }

    async function init() {
      try {
        const current = await getSession();
        if (mounted) {
          setSession(current);
        }
        previousSessionUserId = current?.user.id ?? null;
        await loadProfile(current);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    const subscription = onAuthStateChange((event, nextSession) => {
      void (async () => {
        if (!mounted) return;

        const nextUserId = nextSession?.user.id ?? null;

        if (event === "TOKEN_REFRESHED") {
          previousSessionUserId = nextUserId;
          return;
        }

        if (event === "SIGNED_IN") {
          if (previousSessionUserId) {
            previousSessionUserId = nextUserId;
            return;
          }

          previousSessionUserId = nextUserId;
          setSession(nextSession);
          await loadProfile(nextSession);
          setLoading(false);
          return;
        }

        if (event === "SIGNED_OUT") {
          previousSessionUserId = null;
          setSession(null);
          await loadProfile(null);
          setLoading(false);
          return;
        }

        if (event === "INITIAL_SESSION") {
          previousSessionUserId = nextUserId;
          return;
        }

        if (event === ("USER_UPDATED" as AuthChangeEvent)) {
          previousSessionUserId = nextUserId;
          setSession(nextSession);
          return;
        }

        previousSessionUserId = nextUserId;
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      profileLoading,
      profileResolved,
      profileError,
      login: async (email: string, password: string) => {
        await signIn(email, password);
      },
      logout: async () => {
        await signOut();
        setProfile(null);
        setProfileResolved(false);
        setProfileError("");
      },
      refreshProfile: async () => {
        if (!session?.user) {
          setProfile(null);
          setProfileResolved(true);
          setProfileError("");
          return;
        }
        setProfileLoading(true);
        setProfileResolved(false);

        try {
          const nextProfile = await bootstrapUserProfile(session.user);
          setProfile(nextProfile);
          setProfileResolved(true);
          setProfileError("");
        } catch (error) {
          setProfile(null);
          setProfileResolved(true);
          setProfileError(getErrorMessage(error));
        } finally {
          setProfileLoading(false);
        }
      },
    }),
    [loading, profile, profileError, profileLoading, profileResolved, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
