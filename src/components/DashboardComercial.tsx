import type {
  OrigemNegociacao,
  PrioridadeNegociacao,
  StatusNegociacao,
} from "../types/negociacao";
import type { DashboardAnalytics } from "../services/analyticsService";

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

function brl(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function labelStatus(status: StatusNegociacao) {
  if (status === "simulacao") return "Simulacao";
  if (status === "proposta_enviada") return "Proposta enviada";
  if (status === "contraproposta") return "Contraproposta";
  if (status === "em_negociacao") return "Em negociacao";
  if (status === "aguardando_retorno") return "Aguardando retorno";
  if (status === "aprovada") return "Aprovada";
  if (status === "fechada") return "Fechada";
  if (status === "perdida") return "Perdida";
  if (status === "arquivada") return "Arquivada";
  return "Rascunho";
}

function labelOrigem(origem: OrigemNegociacao) {
  if (origem === "cliente_direto") return "Cliente direto";
  if (origem === "indicacao") return "Indicacao";
  if (origem === "trafego_pago") return "Trafego pago";
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

export default function DashboardComercial({
  analytics = EMPTY_ANALYTICS,
}: DashboardComercialProps) {
  const metrics = analytics.metrics;
  const temDados = analytics.totalNegociacoes > 0;

  return (
    <div className="crmStack">
      {!temDados ? (
        <section className="crmSection">
          <div className="crmSectionHeader">
            <div>
              <span className="crmSectionEyebrow">Estado atual</span>
              <h3 className="crmSectionTitle">Dashboard pronto para ganhar volume</h3>
              <p className="crmSectionText">
                Ainda nao existem negociacoes salvas no CRM. Assim que a primeira
                simulacao for registrada como negociacao, os indicadores passam a
                refletir pipeline, aprovacao e ticket medio automaticamente.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="crmMetricGrid">
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Negociacoes ativas</span>
          <strong className="crmMetricValue">
            {analytics.totalNegociacoes.toLocaleString("pt-BR")}
          </strong>
          <span className="crmMetricHint">Volume total em acompanhamento.</span>
        </article>

        <article className="crmMetricCard crmMetricCardAccent">
          <span className="crmMetricLabel">Pipeline financeiro</span>
          <strong className="crmMetricValue">{brl(analytics.valorPipeline)}</strong>
          <span className="crmMetricHint">
            Soma das oportunidades em rascunho, negociacao, retorno e aprovacao.
          </span>
        </article>

        <article className="crmMetricCard">
          <span className="crmMetricLabel">Negociacoes em aberto</span>
          <strong className="crmMetricValue">
            {analytics.negociacoesAbertas.toLocaleString("pt-BR")}
          </strong>
          <span className="crmMetricHint">Negociacoes em fase ativa do funil.</span>
        </article>

        <article className="crmMetricCard">
          <span className="crmMetricLabel">Aprovadas e fechadas</span>
          <strong className="crmMetricValue">
            {(metrics.totalFechadas + analytics.negociacoesAprovadas).toLocaleString(
              "pt-BR"
            )}
          </strong>
          <span className="crmMetricHint">
            Sinal positivo consolidado entre aprovacao comercial e fechamento.
          </span>
        </article>

        <article className="crmMetricCard">
          <span className="crmMetricLabel">Ticket medio</span>
          <strong className="crmMetricValue">{brl(analytics.ticketMedio)}</strong>
          <span className="crmMetricHint">
            Media de valor das negociacoes registradas.
          </span>
        </article>
      </section>

      <div className="crmPanelGrid crmPanelGridWide">
        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Leitura por status</h3>
              <p className="crmPanelDescription">
                Distribuicao do funil com quantidade e valor acumulado.
              </p>
            </div>
          </div>

          <div className="crmInlineList">
            {metrics.porStatus.map((item) => (
              <div key={item.status} className="crmInlineListItem crmInlineListItemSplit">
                <div>
                  <span className={["crmBadge", toneStatus(item.status)].join(" ")}>
                    {labelStatus(item.status)}
                  </span>
                </div>
                <div className="crmInlineListMeta">
                  <strong>{item.quantidade}</strong>
                  <span>{brl(item.valor)}</span>
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
                Sinais rapidos para leitura operacional do pipeline.
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
            <span className="crmSectionEyebrow">Pulso da operacao</span>
            <h3 className="crmSectionTitle">Ultimas movimentacoes</h3>
            <p className="crmSectionText">
              Negociacoes mais recentes para leitura rapida e decisao de proxima acao.
            </p>
          </div>
        </div>

        {metrics.recentes.length > 0 ? (
          <div className="crmInlineList">
            {metrics.recentes.map((negociacao) => (
              <div
                key={negociacao.id}
                className="crmInlineListItem crmInlineListItemRich"
              >
                <div>
                  <strong>{negociacao.cliente || negociacao.titulo}</strong>
                  <p>{negociacao.ultimaAcao || "Sem ultima acao registrada."}</p>
                </div>

                <div className="crmInlineListMeta">
                  <span>{formatarData(negociacao.updatedAt)}</span>
                  <strong>{brl(negociacao.valorTotal)}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="crmEmptyState">
            <span className="crmBadge">Sem negociacoes</span>
            <h3>O dashboard ficara mais util conforme o CRM ganhar volume</h3>
            <p>
              Assim que novas negociacoes forem salvas, os indicadores passam a
              refletir pipeline, prioridades e movimentacoes reais.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
