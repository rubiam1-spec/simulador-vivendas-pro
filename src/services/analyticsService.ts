import { getNegociacoesMetrics, listNegociacoes } from "./negociacoesService";

export async function getDashboardAnalytics() {
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
