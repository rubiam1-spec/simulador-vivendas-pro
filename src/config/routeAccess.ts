import type { UserProfile } from "../types/user";

export function getDefaultAppRoute(
  profile: Pick<UserProfile, "role" | "ativo"> | null
) {
  if (!profile?.ativo) {
    return "/configuracoes";
  }

  if (profile.role === "corretor") {
    return "/simulador";
  }

  return "/dashboard";
}
