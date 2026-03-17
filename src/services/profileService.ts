import { supabase } from "../lib/supabase";
import type { AuthUser } from "./authService";
import { ensureUserProfile } from "./usersService";
import type { UserProfile, UserRole } from "../types/user";

const LOCAL_PROFILES_KEY = "rr_crm_profiles_mock";

type ProfileRow = {
  id?: string;
  user_id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  created_at?: string;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeProfile(row: ProfileRow | UserProfile): UserProfile {
  const maybe = row as Partial<UserProfile> & Partial<ProfileRow>;

  return {
    id: String(maybe.id || createId("profile")),
    userId: String(maybe.userId || maybe.user_id || ""),
    nome: String(maybe.nome || "Usuario"),
    email: String(maybe.email || ""),
    role: (maybe.role as UserRole) || "gestor",
    ativo: typeof maybe.ativo === "boolean" ? maybe.ativo : true,
    createdAt: String(maybe.createdAt || maybe.created_at || new Date().toISOString()),
  };
}

function readLocalProfiles() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeProfile) : [];
  } catch {
    return [];
  }
}

function createFallbackProfile(user: AuthUser): UserProfile {
  const normalizedEmail = user.email?.trim().toLowerCase() || "";
  const nomeBase = normalizedEmail.split("@")[0] || "Usuario";

  return {
    id: createId("profile"),
    userId: user.id,
    nome: nomeBase
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    email: normalizedEmail,
    role: "gestor",
    ativo: true,
    createdAt: new Date().toISOString(),
  };
}

async function findRemoteProfileByUser(user: AuthUser): Promise<UserProfile | null> {
  if (!supabase) return null;

  const normalizedEmail = user.email?.trim().toLowerCase() || "";

  const { data: byUserId, error: byUserIdError } = await supabase
    .from("profiles")
    .select("id, user_id, nome, email, role, ativo, created_at")
    .eq("user_id", user.id)
    .limit(1);

  if (byUserIdError) {
    throw byUserIdError;
  }

  if (Array.isArray(byUserId) && byUserId.length > 0) {
    return normalizeProfile(byUserId[0] as ProfileRow);
  }

  if (!normalizedEmail) {
    return null;
  }

  const { data: byEmail, error: byEmailError } = await supabase
    .from("profiles")
    .select("id, user_id, nome, email, role, ativo, created_at")
    .eq("email", normalizedEmail)
    .limit(1);

  if (byEmailError) {
    throw byEmailError;
  }

  if (!Array.isArray(byEmail) || byEmail.length === 0) {
    return null;
  }

  return normalizeProfile(byEmail[0] as ProfileRow);
}

export async function bootstrapUserProfile(user: AuthUser): Promise<UserProfile> {
  try {
    return await ensureUserProfile(user);
  } catch {
    try {
      const existing = await findRemoteProfileByUser(user);
      if (existing) {
        return existing;
      }
    } catch {
      // continua para fallback local
    }

    const normalizedEmail = user.email?.trim().toLowerCase() || "";
    const localProfile = readLocalProfiles().find(
      (profile) =>
        profile.userId === user.id ||
        (!!normalizedEmail && profile.email.trim().toLowerCase() === normalizedEmail)
    );

    if (localProfile) {
      return localProfile;
    }

    return createFallbackProfile(user);
  }
}
