import { useEffect, useState } from "react";

import { useAuth } from "../components/AuthProvider";
import DashboardComercial from "../components/DashboardComercial";
import {
  getDashboardAnalytics,
  type DashboardAnalytics,
} from "../services/analyticsService";

const EMPTY_ANALYTICS: DashboardAnalytics = {
  totalNegociacoes: 0,
  valorPipeline: 0,
  negociacoesAbertas: 0,
  negociacoesAprovadas: 0,
  ticketMedio: 0,
  metrics: {
    total: 0,
    totalSimulacoes: 0,
    totalPropostasEnviadas: 0,
    totalEmAndamento: 0,
    totalFechadas: 0,
    totalPerdidas: 0,
    pipelineValor: 0,
    ticketMedio: 0,
    porStatus: [],
    porOrigem: [],
    porPrioridade: [],
    recentes: [],
  },
  negociacoes: [],
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let active = true;

    async function carregarDashboard() {
      try {
        setLoading(true);
        setErro("");
        const consultoraUserId =
          profile?.role === "consultora" || profile?.role === "corretor"
            ? profile.userId
            : null;
        const nextAnalytics = await getDashboardAnalytics({ consultoraUserId });

        if (!active) return;
        setAnalytics(nextAnalytics);
      } catch (error) {
        if (!active) return;
        setAnalytics(EMPTY_ANALYTICS);
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os indicadores do dashboard."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarDashboard();

    function handleStorage(event: StorageEvent) {
      if (event.key && event.key !== "central_negociacoes_bomm") return;
      void carregarDashboard();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void carregarDashboard();
      }
    }

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [profile]);

  return (
    <div className="appPageStack">
      {erro ? <div className="appInlineFeedback">{erro}</div> : null}

      {loading ? (
        <div className="appShellLoadingInline">Carregando indicadores do CRM...</div>
      ) : (
        <DashboardComercial analytics={analytics} />
      )}
    </div>
  );
}
