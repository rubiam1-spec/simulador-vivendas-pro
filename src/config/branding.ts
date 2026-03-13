export const branding = {
  systemName: "RR CRM",
  clientName: "Bomm Urbanizadora",
  fullTitle: "RR CRM - Cliente: Bomm Urbanizadora",
  shortTitle: "RR CRM",
  loginTitle: "Entrar no RR CRM",
  sidebarTitle: "RR CRM",
  sidebarSubtitle: "Cliente: Bomm Urbanizadora",
  appHeaderTitle: "RR CRM",
  appHeaderSubtitle: "Cliente: Bomm Urbanizadora",
  loginSubtitle:
    "Cliente: Bomm Urbanizadora. Acesso protegido para dashboard, central comercial, simulador e configuracoes.",
  faviconPath: "/favicon.png",
} as const;

export type BrandingConfig = typeof branding;
