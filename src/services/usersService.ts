import { createClient } from "@supabase/supabase-js";

import { hasSupabaseConfig, supabase, supabaseAnonKey, supabaseUrl } from "../lib/supabase";
import type {
  CreateUserAccessInput,
  UpdateUserAccessInput,
  UserProfile,
  UserRole,
} from "../types/user";

const USERS_STORAGE_KEY = "rr_crm_profiles_mock";

type AuthUserLike = {
  id: string;
  email: string | null;
};

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

function deriveNameFromEmail(email: string | null) {
  if (!email) return "Usuario";
  const base = email.split("@")[0] || "Usuario";
  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

async function findRemoteProfile(user: AuthUserLike) {
  if (!supabase) return null;

  const { data: byUserId, error: byUserIdError } = await supabase
    .from("profiles")
    .select("id, user_id, nome, email, role, ativo, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUserIdError) {
    throw byUserIdError;
  }

  if (byUserId) {
    return normalizeProfile(byUserId as ProfileRow);
  }

  if (!user.email) {
    return null;
  }

  const normalizedEmail = user.email.trim().toLowerCase();
  const { data: byEmail, error: byEmailError } = await supabase
    .from("profiles")
    .select("id, user_id, nome, email, role, ativo, created_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (byEmailError) {
    throw byEmailError;
  }

  if (!byEmail) {
    return null;
  }

  const profile = normalizeProfile(byEmail as ProfileRow);

  if (profile.userId !== user.id) {
    const { data: updatedByEmail, error: updateError } = await supabase
      .from("profiles")
      .update({
        user_id: user.id,
        email: normalizedEmail,
      })
      .eq("id", profile.id)
      .select("id, user_id, nome, email, role, ativo, created_at")
      .single();

    if (updateError) {
      throw updateError;
    }

    return normalizeProfile(updatedByEmail as ProfileRow);
  }

  return profile;
}

function readLocalProfiles() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeProfile) : [];
  } catch (error) {
    console.error("[usersService] erro ao ler perfis locais", error);
    return [];
  }
}

function writeLocalProfiles(profiles: UserProfile[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(profiles));
}

function createSecondaryClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase nao configurado.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `rr_crm_access_${Date.now()}`,
    },
  });
}

export async function listUsers(): Promise<UserProfile[]> {
  if (!hasSupabaseConfig || !supabase) {
    return readLocalProfiles().sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, nome, email, role, ativo, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => normalizeProfile(row as ProfileRow));
}

export async function ensureUserProfile(user: AuthUserLike): Promise<UserProfile> {
  if (!hasSupabaseConfig || !supabase) {
    const profiles = readLocalProfiles();
    const existing = profiles.find((profile) => profile.userId === user.id);
    if (existing) return existing;

    const profile: UserProfile = {
      id: createId("profile"),
      userId: user.id,
      nome: deriveNameFromEmail(user.email),
      email: user.email || "",
      role: profiles.length === 0 ? "admin" : "gestor",
      ativo: true,
      createdAt: new Date().toISOString(),
    };

    writeLocalProfiles([profile, ...profiles]);
    return profile;
  }

  const existing = await findRemoteProfile(user);
  if (existing) return existing;

  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw countError;
  }

  const payload: ProfileRow = {
    user_id: user.id,
    nome: deriveNameFromEmail(user.email),
    email: user.email || "",
    role: (count || 0) === 0 ? "admin" : "gestor",
    ativo: true,
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select("id, user_id, nome, email, role, ativo, created_at")
    .single();

  if (error) {
    throw error;
  }

  return normalizeProfile(data as ProfileRow);
}

export async function createUserAccess(
  input: CreateUserAccessInput
): Promise<UserProfile> {
  if (!hasSupabaseConfig || !supabase) {
    const profiles = readLocalProfiles();
    const profile: UserProfile = {
      id: createId("profile"),
      userId: createId("user"),
      nome: input.nome.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      ativo: input.ativo,
      createdAt: new Date().toISOString(),
    };

    writeLocalProfiles([profile, ...profiles]);
    return profile;
  }

  const client = createSecondaryClient();
  const { data, error } = await client.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.senha,
    options: {
      data: {
        nome: input.nome.trim(),
      },
    },
  });

  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Nao foi possivel criar o usuario no Auth.");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      nome: input.nome.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      ativo: input.ativo,
    })
    .select("id, user_id, nome, email, role, ativo, created_at")
    .single();

  if (profileError) {
    throw profileError;
  }

  return normalizeProfile(profileData as ProfileRow);
}

export async function updateUserAccess(
  profileId: string,
  updates: UpdateUserAccessInput
): Promise<UserProfile> {
  if (!hasSupabaseConfig || !supabase) {
    const profiles = readLocalProfiles();
    const index = profiles.findIndex((profile) => profile.id === profileId);
    if (index === -1) {
      throw new Error("Perfil nao encontrado.");
    }

    const nextProfile: UserProfile = {
      ...profiles[index],
      ...updates,
    };
    const nextProfiles = [...profiles];
    nextProfiles[index] = nextProfile;
    writeLocalProfiles(nextProfiles);
    return nextProfile;
  }

  const payload: Record<string, unknown> = {};
  if (typeof updates.nome === "string") payload.nome = updates.nome.trim();
  if (typeof updates.role === "string") payload.role = updates.role;
  if (typeof updates.ativo === "boolean") payload.ativo = updates.ativo;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select("id, user_id, nome, email, role, ativo, created_at")
    .single();

  if (error) {
    throw error;
  }

  return normalizeProfile(data as ProfileRow);
}
