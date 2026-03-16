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
  if (!profileResolved) {
    return [];
  }

  if (!profile?.ativo) {
    return [
      {
        label: "Administracao",
        items: [{ label: "Configuracoes", to: "/configuracoes" }],
      },
    ];
  }

  const isCorretor = profile?.role === "corretor";
  const isAdmin = profile.role === "admin";

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
