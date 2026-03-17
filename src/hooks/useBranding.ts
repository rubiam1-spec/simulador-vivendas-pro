import { useAuth } from "../components/AuthProvider";

export type BrandingConfig = {
  rrCrmLogo: true;
  clienteNome: string;
  clienteLogoUrl: string | null;
  clienteCorPrimaria: string | null;
  mostrarLogoClienteNoPdf: boolean;
  mostrarLogoClienteNoSimulador: boolean;
  mostrarLogoClienteNaSidebar: boolean;
};

export function useBranding(): BrandingConfig {
  const { profile } = useAuth();

  return {
    rrCrmLogo: true,
    clienteNome: profile?.clienteNome ?? "Bomm Urbanizadora",
    clienteLogoUrl: profile?.clienteLogoUrl ?? null,
    clienteCorPrimaria: profile?.clienteCorPrimaria ?? null,
    mostrarLogoClienteNoPdf: true,
    mostrarLogoClienteNoSimulador: true,
    mostrarLogoClienteNaSidebar: true,
  };
}
