import { getNegociacoesMetrics, listNegociacoes } from "./negociacoesService";
import type { NegociacaoSalva } from "../types/negociacao";
import type { NegociacoesMetrics } from "./negociacoesService";

export type DashboardAnalytics = {
  totalNegociacoes: number;
  valorPipeline: number;
  negociacoesAbertas: number;
  negociacoesAprovadas: number;
  ticketMedio: number;
  metrics: NegociacoesMetrics;
  negociacoes: NegociacaoSalva[];
};

export async function getDashboardAnalytics(options?: {
  consultoraUserId?: string | null;
}): Promise<DashboardAnalytics> {
  const [metrics, negociacoes] = await Promise.all([
    getNegociacoesMetrics(options),
    listNegociacoes(options),
  ]);

  return {
    totalNegociacoes: metrics.total,
    valorPipeline: metrics.pipelineValor,
    negociacoesAbertas: metrics.porStatus
      .filter((item) =>
        [
          "simulacao",
          "proposta_enviada",
          "contraproposta",
          "em_negociacao",
          "aguardando_retorno",
        ].includes(item.status)
      )
      .reduce((acc, item) => acc + item.quantidade, 0),
    negociacoesAprovadas: metrics.porStatus.find(
      (item) => item.status === "aprovada"
    )?.quantidade || 0,
    ticketMedio: metrics.ticketMedio,
    metrics,
    negociacoes,
  };
}
