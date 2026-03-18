import type {
  OrigemNegociacao,
  PrioridadeNegociacao,
  StatusNegociacao,
} from "../types/negociacao";
import type { DashboardAnalytics } from "../services/analyticsService";
import { formatCurrency, formatCurrencyFull, formatCount } from "../utils/formatMetric";

type DashboardComercialProps = {
  analytics?: DashboardAnalytics;
};

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


function formatarData(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function labelStatus(status: StatusNegociacao) {
  if (status === "simulacao") return "Simulação";
  if (status === "proposta_enviada") return "Proposta enviada";
  if (status === "contraproposta") return "Contraproposta";
  if (status === "em_negociacao") return "Em negociação";
  if (status === "aguardando_retorno") return "Aguardando retorno";
  if (status === "aprovada") return "Aprovada";
  if (status === "fechada") return "Fechada";
  if (status === "perdida") return "Perdida";
  if (status === "arquivada") return "Arquivada";
  return "Rascunho";
}

function labelOrigem(origem: OrigemNegociacao) {
  if (origem === "cliente_direto") return "Cliente direto";
  if (origem === "indicacao") return "Indicação";
  if (origem === "trafego_pago") return "Tráfego pago";
  if (origem === "interno") return "Interno";
  if (origem === "feira") return "Feira";
  if (origem === "corretor") return "Corretor";
  return "Outro";
}

function labelPrioridade(prioridade: PrioridadeNegociacao) {
  if (prioridade === "alta") return "Alta";
  if (prioridade === "baixa") return "Baixa";
  return "Media";
}

function toneStatus(status: StatusNegociacao) {
  if (status === "aprovada" || status === "fechada") return "isSuccess";
  if (status === "aguardando_retorno") return "isWarning";
  if (status === "perdida" || status === "arquivada") return "isMuted";
  return "isInfo";
}

function tonePrioridade(prioridade: PrioridadeNegociacao) {
  if (prioridade === "alta") return "isDanger";
  if (prioridade === "media") return "isWarning";
  return "isSuccess";
}

function metricIcon(label: string) {
  if (label === "Negociações ativas") return "◎";
  if (label === "Pipeline financeiro") return "$";
  if (label === "Negociações em aberto") return "↺";
  if (label === "Aprovadas e fechadas") return "✓";
  return "≈";
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function DashboardComercial({
  analytics = EMPTY_ANALYTICS,
}: DashboardComercialProps) {
  const metrics = analytics.metrics;
  const temDados = analytics.totalNegociacoes > 0;
  const totalStatus = metrics.porStatus.reduce((acc, item) => acc + item.quantidade, 0) || 1;

  return (
    <div className="crmStack">
      {!temDados ? (
        <section className="crmSection">
          <div className="crmSectionHeader">
            <div>
              <span className="crmSectionEyebrow">Estado atual</span>
              <h3 className="crmSectionTitle">Dashboard pronto para ganhar volume</h3>
              <p className="crmSectionText">
                Ainda não existem negociações salvas no CRM. Assim que a primeira
                simulação for registrada como negociação, os indicadores passam a
                refletir pipeline, aprovação e ticket médio automaticamente.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="crmMetricGrid">
        <article className="crmMetricCard">
          <span className="crmMetricIcon" aria-hidden="true">
            {metricIcon("Negociações ativas")}
          </span>
          <span className="crmMetricLabel">Negociações ativas</span>
          <strong
            className="crmMetricValue"
            title={String(analytics.totalNegociacoes)}
          >
            {formatCount(analytics.totalNegociacoes)}
          </strong>
          <span className="crmMetricHint">Volume total em acompanhamento.</span>
        </article>

        <article className="crmMetricCard crmMetricCardAccent">
          <span className="crmMetricIcon" aria-hidden="true">
            {metricIcon("Pipeline financeiro")}
          </span>
          <span className="crmMetricLabel">Pipeline financeiro</span>
          <strong
            className="crmMetricValue"
            title={formatCurrencyFull(analytics.valorPipeline)}
          >
            {formatCurrency(analytics.valorPipeline)}
          </strong>
          <span className="crmMetricHint">
            Soma das oportunidades em rascunho, negociação, retorno e aprovação.
          </span>
        </article>

        <article className="crmMetricCard">
          <span className="crmMetricIcon" aria-hidden="true">
            {metricIcon("Negociações em aberto")}
          </span>
          <span className="crmMetricLabel">Negociações em aberto</span>
          <strong
            className="crmMetricValue"
            title={String(analytics.negociacoesAbertas)}
          >
            {formatCount(analytics.negociacoesAbertas)}
          </strong>
          <span className="crmMetricHint">Negociações em fase ativa do funil.</span>
        </article>

        <article className="crmMetricCard">
          <span className="crmMetricIcon" aria-hidden="true">
            {metricIcon("Aprovadas e fechadas")}
          </span>
          <span className="crmMetricLabel">Aprovadas e fechadas</span>
          <strong
            className="crmMetricValue"
            title={String(metrics.totalFechadas + analytics.negociacoesAprovadas)}
          >
            {formatCount(metrics.totalFechadas + analytics.negociacoesAprovadas)}
          </strong>
          <span className="crmMetricHint">
            Sinal positivo consolidado entre aprovação comercial e fechamento.
          </span>
        </article>

        <article className="crmMetricCard">
          <span className="crmMetricIcon" aria-hidden="true">
            {metricIcon("Ticket medio")}
          </span>
          <span className="crmMetricLabel">Ticket médio</span>
          <strong
            className="crmMetricValue"
            title={formatCurrencyFull(analytics.ticketMedio)}
          >
            {formatCurrency(analytics.ticketMedio)}
          </strong>
          <span className="crmMetricHint">
            Média de valor das negociações registradas.
          </span>
        </article>
      </section>

      <div className="crmPanelGrid crmPanelGridWide">
        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Leitura por status</h3>
              <p className="crmPanelDescription">
                Distribuição do funil com quantidade e valor acumulado.
              </p>
            </div>
          </div>

          <div className="crmInlineList">
            {metrics.porStatus.map((item) => (
              <div key={item.status} className="crmInlineListItem crmInlineListItemSplit">
                <div className="crmStatusLine">
                  <span className={["crmBadge", toneStatus(item.status)].join(" ")}>
                    {labelStatus(item.status)}
                  </span>
                  <div className="crmStatusProgress">
                    <span
                      className="crmStatusProgressBar"
                      style={{ width: `${(item.quantidade / totalStatus) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="crmInlineListMeta">
                  <strong>{item.quantidade}</strong>
                  <span title={formatCurrencyFull(item.valor)}>{formatCurrency(item.valor)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Origem e prioridade</h3>
              <p className="crmPanelDescription">
                Sinais rápidos para leitura operacional do pipeline.
              </p>
            </div>
          </div>

          <div className="crmPanelColumns">
            <div className="crmInlineList">
              {metrics.porOrigem.length > 0 ? (
                metrics.porOrigem.map((item) => (
                  <div key={item.origem} className="crmInlineListItem crmInlineListItemSplit">
                    <span className="crmBadge isInfo">{labelOrigem(item.origem)}</span>
                    <strong>{item.quantidade}</strong>
                  </div>
                ))
              ) : (
                <div className="crmHint">
                  Nenhuma origem registrada ainda para leitura comparativa.
                </div>
              )}
            </div>

            <div className="crmInlineList">
              {metrics.porPrioridade.map((item) => (
                <div
                  key={item.prioridade}
                  className="crmInlineListItem crmInlineListItemSplit"
                >
                  <span
                    className={[
                      "crmBadge",
                      tonePrioridade(item.prioridade),
                    ].join(" ")}
                  >
                    {labelPrioridade(item.prioridade)}
                  </span>
                  <strong>{item.quantidade}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="crmSection">
        <div className="crmSectionHeader">
          <div>
            <span className="crmSectionEyebrow">Pulso da operação</span>
            <h3 className="crmSectionTitle">Últimas movimentações</h3>
            <p className="crmSectionText">
              Negociações mais recentes para leitura rápida e decisão de próxima ação.
            </p>
          </div>
        </div>

        {metrics.recentes.length > 0 ? (
          <div className="crmInlineList">
            {metrics.recentes.map((negociacao) => (
              <div
                key={negociacao.id}
                className="crmInlineListItem crmInlineListItemRich crmRecentCard"
              >
                <div className="crmRecentIdentity">
                  <span className="crmRecentAvatar">
                    {getInitials(negociacao.cliente || negociacao.titulo || "RR")}
                  </span>
                  <strong>{negociacao.cliente || negociacao.titulo}</strong>
                  <p>{negociacao.ultimaAcao || "Sem última ação registrada."}</p>
                </div>

                <div className="crmInlineListMeta">
                  <span>{formatarData(negociacao.updatedAt)}</span>
                  <strong
                    className="crmRecentValue"
                    title={formatCurrencyFull(negociacao.valorTotal)}
                  >
                    {formatCurrency(negociacao.valorTotal)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="crmEmptyState">
            <span className="crmBadge">Sem negociações</span>
            <h3>O dashboard ficará mais útil conforme o CRM ganhar volume</h3>
            <p>
              Assim que novas negociações forem salvas, os indicadores passam a
              refletir pipeline, prioridades e movimentações reais.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
