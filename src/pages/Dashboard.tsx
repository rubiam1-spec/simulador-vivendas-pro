import { useEffect, useState } from "react";

import DashboardComercial from "../components/DashboardComercial";
import {
  getDashboardAnalytics,
  type DashboardAnalytics,
} from "../services/analyticsService";
import { migrarNegociacoesParaSupabase } from "../scripts/migrarLocalStorage";

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

function temNegociacoesAntigas() {
  try {
    const raw = localStorage.getItem("central_negociacoes_bomm");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [temDadosAntigos, setTemDadosAntigos] = useState(() => temNegociacoesAntigas());
  const [migrando, setMigrando] = useState(false);

  useEffect(() => {
    let active = true;

    async function carregarDashboard() {
      try {
        setLoading(true);
        setErro("");
        const nextAnalytics = await getDashboardAnalytics();

        if (!active) return;
        setAnalytics(nextAnalytics);
      } catch (error) {
        if (!active) return;
        setAnalytics(EMPTY_ANALYTICS);
        setErro(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os indicadores do dashboard."
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
  }, []);

  async function handleMigrar() {
    setMigrando(true);
    try {
      await migrarNegociacoesParaSupabase();
    } finally {
      setMigrando(false);
      setTemDadosAntigos(temNegociacoesAntigas());
      window.location.reload();
    }
  }

  return (
    <div className="appPageStack">
      {temDadosAntigos && (
        <div className="appInlineFeedback">
          <button
            onClick={() => void handleMigrar()}
            disabled={migrando}
          >
            {migrando ? "Migrando..." : "Migrar negociacoes antigas"}
          </button>
        </div>
      )}

      {erro ? <div className="appInlineFeedback">{erro}</div> : null}

      {loading ? (
        <div className="appShellLoadingInline">Carregando indicadores do CRM...</div>
      ) : (
        <DashboardComercial analytics={analytics} />
      )}
    </div>
  );
}
