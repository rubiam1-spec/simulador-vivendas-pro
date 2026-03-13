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

function labelStatus(status: StatusNegociacao) {
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
  return "Média";
}

function toneStatus(status: StatusNegociacao) {
  if (status === "em_negociacao") return "isYellow";
  if (status === "aguardando_retorno") return "isOrange";
  if (status === "aprovada") return "isGreen";
  if (status === "fechada") return "isBlue";
  if (status === "perdida") return "isRed";
  if (status === "arquivada") return "isMuted";
  return "isNeutral";
}

function tonePrioridade(prioridade: PrioridadeNegociacao) {
  if (prioridade === "alta") return "isRed";
  if (prioridade === "media") return "isYellow";
  return "isGreen";
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
    }));

    const porPrioridade = PRIORIDADE_ORDER.map((prioridade) => ({
      prioridade,
      quantidade: negociacoes.filter(
        (negociacao) => negociacao.prioridade === prioridade
      ).length,
    }));

    return {
      totalNegociacoes,
      pipelineTotal,
      porStatus,
      porOrigem,
      porPrioridade,
    };
  }, [negociacoes]);

  return (
    <section className="luxSection luxDashboard">
      <div className="luxSectionInner">
        <div className="luxDashboardHead">
          <div>
            <div className="luxKicker">Gestão comercial</div>
            <h2 className="luxH2">Dashboard Comercial</h2>
            <p className="luxCentralText">
              Leitura consolidada do pipeline operacional a partir das negociações
              já salvas na central.
            </p>
          </div>
        </div>

        <div className="luxDashboardTop">
          <article className="luxMetricCard">
            <span className="luxMetricLabel">Total de negociações</span>
            <strong className="luxMetricValue">
              {metrics.totalNegociacoes.toLocaleString("pt-BR")}
            </strong>
          </article>

          <article className="luxMetricCard luxMetricCardAccent">
            <span className="luxMetricLabel">Pipeline total</span>
            <strong className="luxMetricValue">{brl(metrics.pipelineTotal)}</strong>
          </article>
        </div>

        <div className="luxDashboardGrid">
          <section className="luxDashboardPanel">
            <div className="luxDashboardPanelTitle">Negociações por status</div>
            <div className="luxDashboardList">
              {metrics.porStatus.map((item) => (
                <div key={item.status} className="luxDashboardRow">
                  <span
                    className={[
                      "luxPill",
                      "luxPillSoft",
                      "luxDashPill",
                      toneStatus(item.status),
                    ]
                      .join(" ")
                      .trim()}
                  >
                    {labelStatus(item.status)}
                  </span>
                  <div className="luxDashboardRowMeta">
                    <strong>{item.quantidade}</strong>
                    <span>{brl(item.valor)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="luxDashboardPanel">
            <div className="luxDashboardPanelTitle">Negociações por origem</div>
            <div className="luxDashboardList">
              {metrics.porOrigem.map((item) => (
                <div key={item.origem} className="luxDashboardRow">
                  <span className="luxPill luxPillSoft">{labelOrigem(item.origem)}</span>
                  <div className="luxDashboardRowMeta">
                    <strong>{item.quantidade}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="luxDashboardPanel">
            <div className="luxDashboardPanelTitle">
              Negociações por prioridade
            </div>
            <div className="luxDashboardList">
              {metrics.porPrioridade.map((item) => (
                <div key={item.prioridade} className="luxDashboardRow">
                  <span
                    className={[
                      "luxPill",
                      "luxPillSoft",
                      "luxDashPill",
                      tonePrioridade(item.prioridade),
                    ]
                      .join(" ")
                      .trim()}
                  >
                    {labelPrioridade(item.prioridade)}
                  </span>
                  <div className="luxDashboardRowMeta">
                    <strong>{item.quantidade}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
