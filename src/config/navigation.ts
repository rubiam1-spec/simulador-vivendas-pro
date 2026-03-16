import type { UserProfile } from "../types/user";

export type NavigationItem = {
  label: string;
  to: string;
  badge?: string;
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

export function getNavigationSections(
  profile: Pick<UserProfile, "role" | "ativo"> | null,
  profileResolved: boolean
): NavigationSection[] {
  const isCorretor = profile?.role === "corretor";
  const isAdmin = profileResolved && profile?.ativo && profile.role === "admin";

  return [
    {
      label: "Operacao",
      items: [
        ...(!isCorretor ? [{ label: "Dashboard", to: "/dashboard" }] : []),
        { label: "Negociacoes", to: "/negociacoes" },
        { label: "Simulador", to: "/simulador" },
      ],
    },
    {
      label: "Administracao",
      items: [
        ...(isAdmin ? [{ label: "Acessos", to: "/acessos" }] : []),
        { label: "Configuracoes", to: "/configuracoes" },
      ],
    },
    ...(!isCorretor
      ? [
          {
            label: "Relacionamento",
            items: [
              { label: "Clientes", to: "/clientes" },
              { label: "Corretores", to: "/corretores" },
            ],
          },
        ]
      : []),
  ].filter((section) => section.items.length > 0);
}
