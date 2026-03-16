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

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const [metrics, negociacoes] = await Promise.all([
    getNegociacoesMetrics(),
    listNegociacoes(),
  ]);

  return {
    totalNegociacoes: metrics.total,
    valorPipeline: metrics.pipelineValor,
    negociacoesAbertas: metrics.totalEmAndamento,
    negociacoesAprovadas: metrics.porStatus.find(
      (item) => item.status === "aprovada"
    )?.quantidade || 0,
    ticketMedio: metrics.ticketMedio,
    metrics,
    negociacoes,
  };
}
