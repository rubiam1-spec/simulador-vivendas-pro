import { useEffect, useState } from "react";

import DashboardComercial from "../components/DashboardComercial";
import { getDashboardAnalytics } from "../services/analyticsService";
import type { NegociacaoSalva } from "../types/negociacao";

export default function DashboardPage() {
  const [negociacoes, setNegociacoes] = useState<NegociacaoSalva[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let active = true;

    async function carregarDashboard() {
      try {
        setLoading(true);
        setErro("");
        const analytics = await getDashboardAnalytics();

        if (!active) return;
        setNegociacoes(analytics.negociacoes);
      } catch (error) {
        if (!active) return;
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

    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <div className="appPageStack">
      {erro ? <div className="appInlineFeedback">{erro}</div> : null}

      {loading ? (
        <div className="appShellLoadingInline">Carregando indicadores do CRM...</div>
      ) : (
        <DashboardComercial negociacoes={negociacoes} />
      )}
    </div>
  );
}
