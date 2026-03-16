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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let mounted = true;

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
        setProfileError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o perfil do usuario."
        );
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
        await loadProfile(current);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    const subscription = onAuthStateChange((nextSession) => {
      void (async () => {
        setSession(nextSession);
        await loadProfile(nextSession);
        setLoading(false);
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
          return;
        }
        const nextProfile = await bootstrapUserProfile(session.user);
        setProfile(nextProfile);
        setProfileResolved(true);
        setProfileError("");
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
