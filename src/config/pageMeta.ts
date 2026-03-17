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
      eyebrow: "Visão comercial",
      description:
        "Leitura consolidada do pipeline, prioridades e ritmo operacional da equipe.",
      browserTitle: `Dashboard - ${branding.appName}`,
    },
  },
  {
    match: "/negociacoes",
    meta: {
      title: "Negociações",
      eyebrow: "Central operacional",
      description:
        "Acompanhe propostas, contrapropostas, prioridades, origem e últimas ações do funil.",
      browserTitle: `Negociações - ${branding.appName}`,
    },
  },
  {
    match: "/simulador",
    meta: {
      title: "Simulador Comercial",
      eyebrow: "Estruturação financeira",
      description:
        "Monte simulações, propostas, contrapropostas e PDFs sem misturar dashboards ou módulos paralelos.",
      browserTitle: `Simulador - ${branding.appName}`,
    },
  },
  {
    match: "/configuracoes",
    meta: {
      title: "Configurações",
      eyebrow: "Conta e ambiente",
      description:
        "Centralize informações da conta, autenticação, branding do cliente e próximas preferências da operação.",
      browserTitle: `Configurações - ${branding.appName}`,
    },
  },
  {
    match: "/acessos",
    meta: {
      title: "Acessos",
      eyebrow: "Administração",
      description:
        "Gerencie usuários, perfis e disponibilidade do ambiente com controles claros para a operação.",
      browserTitle: `Acessos - ${branding.appName}`,
    },
  },
  {
    match: "/clientes",
    meta: {
      title: "Clientes",
      eyebrow: "Relacionamento comercial",
      description:
        "Gerencie a base de clientes com estrutura pronta para conectar simulador, negociações e relacionamento comercial.",
      browserTitle: `Clientes - ${branding.appName}`,
    },
  },
  {
    match: "/corretores",
    meta: {
      title: "Corretores",
      eyebrow: "Operação de parceiros",
      description:
        "Organize corretores, equipes e parceiros com base pronta para integrar futuras negociações e atribuições.",
      browserTitle: `Corretores - ${branding.appName}`,
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
