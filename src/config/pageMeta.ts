import { branding } from "./branding";

type PageMeta = {
  title: string;
  eyebrow: string;
  description: string;
  badge?: string;
  browserTitle: string;
};

const pageMetaMap: Array<{ match: string; meta: PageMeta }> = [
  {
    match: "/dashboard",
    meta: {
      title: "Dashboard",
      eyebrow: "Visao comercial",
      description:
        "Leitura consolidada do pipeline, prioridades e ritmo operacional da equipe.",
      browserTitle: `Dashboard • ${branding.appName}`,
    },
  },
  {
    match: "/negociacoes",
    meta: {
      title: "Negociacoes",
      eyebrow: "Central operacional",
      description:
        "Acompanhe propostas, contrapropostas, prioridades, origem e ultimas acoes do funil.",
      browserTitle: `Negociacoes • ${branding.appName}`,
    },
  },
  {
    match: "/simulador",
    meta: {
      title: "Simulador Comercial",
      eyebrow: "Estruturacao financeira",
      description:
        "Monte simulacoes, propostas, contrapropostas e PDFs sem misturar dashboards ou modulos paralelos.",
      browserTitle: `Simulador • ${branding.appName}`,
    },
  },
  {
    match: "/configuracoes",
    meta: {
      title: "Configuracoes",
      eyebrow: "Conta e ambiente",
      description:
        "Centralize informacoes da conta, autenticacao, branding do cliente e proximas preferencias da operacao.",
      browserTitle: `Configuracoes • ${branding.appName}`,
    },
  },
  {
    match: "/acessos",
    meta: {
      title: "Acessos",
      eyebrow: "Administracao",
      description:
        "Gerencie usuarios, perfis e disponibilidade do ambiente com controles claros para a operacao.",
      browserTitle: `Acessos • ${branding.appName}`,
    },
  },
  {
    match: "/clientes",
    meta: {
      title: "Clientes",
      eyebrow: "Expansao do CRM",
      description:
        "Base preparada para o futuro modulo de clientes, com espaco reservado na navegacao e no shell da plataforma.",
      badge: "Em breve",
      browserTitle: `Clientes • ${branding.appName}`,
    },
  },
  {
    match: "/corretores",
    meta: {
      title: "Corretores",
      eyebrow: "Expansao do CRM",
      description:
        "Estrutura inicial reservada para o futuro modulo de corretores, sem impactar a operacao atual.",
      badge: "Em breve",
      browserTitle: `Corretores • ${branding.appName}`,
    },
  },
];

const defaultMeta: PageMeta = {
  title: branding.appName,
  eyebrow: "Plataforma comercial",
  description: branding.clientSummary,
  browserTitle: branding.browserTitle,
};

export function getPageMeta(pathname: string): PageMeta {
  return (
    pageMetaMap.find((entry) => pathname.startsWith(entry.match))?.meta ||
    defaultMeta
  );
}
