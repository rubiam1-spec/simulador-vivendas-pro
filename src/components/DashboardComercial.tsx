import { useMemo } from "react";

import type {
  NegociacaoSalva,
  OrigemNegociacao,
  PrioridadeNegociacao,
  StatusNegociacao,
} from "../types/negociacao";

type DashboardComercialProps = {
  negociacoes: NegociacaoSalva[];
};

const PIPELINE_STATUS: StatusNegociacao[] = [
  "rascunho",
  "em_negociacao",
  "aguardando_retorno",
  "aprovada",
];

const STATUS_ORDER: StatusNegociacao[] = [
  "rascunho",
  "em_negociacao",
  "aguardando_retorno",
  "aprovada",
  "fechada",
  "perdida",
  "arquivada",
];

const ORIGEM_ORDER: OrigemNegociacao[] = [
  "corretor",
  "cliente_direto",
  "feira",
  "indicacao",
  "trafego_pago",
  "interno",
  "outro",
];

const PRIORIDADE_ORDER: PrioridadeNegociacao[] = ["alta", "media", "baixa"];

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
  negociacoes,
}: DashboardComercialProps) {
  const metrics = useMemo(() => {
    const totalNegociacoes = negociacoes.length;
    const pipelineTotal = negociacoes.reduce((acc, negociacao) => {
      return PIPELINE_STATUS.includes(negociacao.status)
        ? acc + negociacao.valorTotal
        : acc;
    }, 0);
    const aprovadas = negociacoes.filter(
      (negociacao) => negociacao.status === "aprovada"
    );
    const aguardandoRetorno = negociacoes.filter(
      (negociacao) => negociacao.status === "aguardando_retorno"
    );
    const ticketMedio = totalNegociacoes
      ? negociacoes.reduce((acc, negociacao) => acc + negociacao.valorTotal, 0) /
        totalNegociacoes
      : 0;

    const porStatus = STATUS_ORDER.map((status) => {
      const itens = negociacoes.filter((negociacao) => negociacao.status === status);
      return {
        status,
        quantidade: itens.length,
        valor: itens.reduce((acc, negociacao) => acc + negociacao.valorTotal, 0),
      };
    });

    const porOrigem = ORIGEM_ORDER.map((origem) => ({
      origem,
      quantidade: negociacoes.filter((negociacao) => negociacao.origem === origem)
        .length,
    })).filter((item) => item.quantidade > 0);

    const porPrioridade = PRIORIDADE_ORDER.map((prioridade) => ({
      prioridade,
      quantidade: negociacoes.filter(
        (negociacao) => negociacao.prioridade === prioridade
      ).length,
    }));

    const recentes = [...negociacoes]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);

    return {
      totalNegociacoes,
      pipelineTotal,
      aprovadas: aprovadas.length,
      aguardandoRetorno: aguardandoRetorno.length,
      ticketMedio,
      porStatus,
      porOrigem,
      porPrioridade,
      recentes,
    };
  }, [negociacoes]);

  return (
    <div className="crmStack">
      <section className="crmMetricGrid">
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Negociacoes ativas</span>
          <strong className="crmMetricValue">
            {metrics.totalNegociacoes.toLocaleString("pt-BR")}
          </strong>
          <span className="crmMetricHint">Volume total em acompanhamento.</span>
        </article>

        <article className="crmMetricCard crmMetricCardAccent">
          <span className="crmMetricLabel">Pipeline financeiro</span>
          <strong className="crmMetricValue">{brl(metrics.pipelineTotal)}</strong>
          <span className="crmMetricHint">
            Soma das oportunidades em rascunho, negociacao, retorno e aprovacao.
          </span>
        </article>

        <article className="crmMetricCard">
          <span className="crmMetricLabel">Aguardando retorno</span>
          <strong className="crmMetricValue">
            {metrics.aguardandoRetorno.toLocaleString("pt-BR")}
          </strong>
          <span className="crmMetricHint">Negociacoes pedindo proxima acao.</span>
        </article>

        <article className="crmMetricCard">
          <span className="crmMetricLabel">Ticket medio</span>
          <strong className="crmMetricValue">{brl(metrics.ticketMedio)}</strong>
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
