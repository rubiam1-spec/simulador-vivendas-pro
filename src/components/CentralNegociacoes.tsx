import { useMemo, useState } from "react";

import type {
  EtapaNegociacao,
  NegociacaoSalva,
  OrigemNegociacao,
  PrioridadeNegociacao,
  StatusNegociacao,
  TipoNegociacao,
} from "../types/negociacao";

type DadosComerciaisEditaveis = Pick<
  NegociacaoSalva,
  "status" | "etapa" | "prioridade" | "origem" | "observacaoInterna" | "ultimaAcao"
>;

type CentralNegociacoesProps = {
  negociacoes: NegociacaoSalva[];
  negociacaoAtivaId: string | null;
  onAbrir: (negociacao: NegociacaoSalva) => void;
  onDuplicar: (id: string) => void;
  onExcluir: (id: string) => void;
  onGerarPdf: (negociacao: NegociacaoSalva) => void;
  onAtualizarDadosComerciais: (
    id: string,
    dados: DadosComerciaisEditaveis
  ) => void;
};

const TIPOS: Array<{ value: TipoNegociacao | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "simulacao", label: "Simulação" },
  { value: "proposta", label: "Proposta" },
  { value: "contraproposta", label: "Contraproposta" },
];

const STATUS: Array<{ value: StatusNegociacao | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "simulacao", label: "Simulação" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "contraproposta", label: "Contraproposta" },
  { value: "rascunho", label: "Rascunho" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "aguardando_retorno", label: "Aguardando retorno" },
  { value: "aprovada", label: "Aprovada" },
  { value: "fechada", label: "Fechada" },
  { value: "perdida", label: "Perdida" },
  { value: "arquivada", label: "Arquivada" },
];

const STATUS_PILLS: Array<{ value: StatusNegociacao | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "simulacao", label: "Simulação" },
  { value: "proposta_enviada", label: "Propostas" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "aguardando_retorno", label: "Retorno" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "fechada", label: "Fechadas" },
];

const ETAPAS: Array<{ value: EtapaNegociacao | "todas"; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "inicial", label: "Inicial" },
  { value: "atendimento", label: "Atendimento" },
  { value: "proposta", label: "Proposta" },
  { value: "retorno", label: "Retorno" },
  { value: "fechamento", label: "Fechamento" },
];

const PRIORIDADES: Array<{
  value: PrioridadeNegociacao | "todos";
  label: string;
}> = [
  { value: "todos", label: "Todas" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

const ORIGENS: Array<{ value: OrigemNegociacao | "todos"; label: string }> = [
  { value: "todos", label: "Todas" },
  { value: "corretor", label: "Corretor" },
  { value: "cliente_direto", label: "Cliente direto" },
  { value: "feira", label: "Feira" },
  { value: "indicacao", label: "Indicação" },
  { value: "trafego_pago", label: "Tráfego pago" },
  { value: "interno", label: "Interno" },
  { value: "outro", label: "Outro" },
];

function formatarMoeda(valor: number) {
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

function labelTipo(tipo: TipoNegociacao) {
  if (tipo === "simulacao") return "Simulação";
  if (tipo === "proposta") return "Proposta";
  return "Contraproposta";
}

function labelStatus(status: StatusNegociacao) {
  if (status === "simulacao") return "Simulação";
  if (status === "proposta_enviada") return "Proposta enviada";
  if (status === "contraproposta") return "Contraproposta";
  if (status === "rascunho") return "Rascunho";
  if (status === "em_negociacao") return "Em negociação";
  if (status === "aguardando_retorno") return "Aguardando retorno";
  if (status === "aprovada") return "Aprovada";
  if (status === "fechada") return "Fechada";
  if (status === "perdida") return "Perdida";
  return "Arquivada";
}

function labelEtapa(etapa: EtapaNegociacao) {
  if (etapa === "inicial") return "Inicial";
  if (etapa === "atendimento") return "Atendimento";
  if (etapa === "proposta") return "Proposta";
  if (etapa === "retorno") return "Retorno";
  return "Fechamento";
}

function labelPrioridade(prioridade: PrioridadeNegociacao) {
  if (prioridade === "baixa") return "Baixa";
  if (prioridade === "alta") return "Alta";
  return "Media";
}

function labelOrigem(origem: OrigemNegociacao) {
  if (origem === "cliente_direto") return "Cliente direto";
  if (origem === "trafego_pago") return "Tráfego pago";
  if (origem === "indicacao") return "Indicação";
  if (origem === "corretor") return "Corretor";
  if (origem === "feira") return "Feira";
  if (origem === "interno") return "Interno";
  return "Outro";
}

function statusTone(status: StatusNegociacao) {
  if (status === "simulacao") return "isInfo";
  if (status === "proposta_enviada" || status === "contraproposta") return "isWarning";
  if (status === "aprovada" || status === "fechada") return "isSuccess";
  if (status === "aguardando_retorno") return "isWarning";
  if (status === "perdida" || status === "arquivada") return "isMuted";
  return "isInfo";
}

function prioridadeTone(prioridade: PrioridadeNegociacao) {
  if (prioridade === "alta") return "isDanger";
  if (prioridade === "baixa") return "isSuccess";
  return "isWarning";
}

function origemTone(origem: OrigemNegociacao) {
  if (origem === "cliente_direto" || origem === "indicacao") return "isSuccess";
  if (origem === "trafego_pago") return "isInfo";
  return "isMuted";
}

export default function CentralNegociacoes({
  negociacoes,
  negociacaoAtivaId,
  onAbrir,
  onDuplicar,
  onExcluir,
  onGerarPdf,
  onAtualizarDadosComerciais,
}: CentralNegociacoesProps) {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoNegociacao | "todos">(
    "todos"
  );
  const [statusFiltro, setStatusFiltro] = useState<StatusNegociacao | "todos">(
    "todos"
  );
  const [etapaFiltro, setEtapaFiltro] = useState<EtapaNegociacao | "todas">(
    "todas"
  );
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<
    PrioridadeNegociacao | "todos"
  >("todos");
  const [origemFiltro, setOrigemFiltro] = useState<OrigemNegociacao | "todos">(
    "todos"
  );
  const [edicao, setEdicao] = useState<
    (DadosComerciaisEditaveis & { id: string }) | null
  >(null);
  const [historicoAbertoId, setHistoricoAbertoId] = useState<string | null>(
    null
  );
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);

  const negociacoesFiltradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();

    return [...negociacoes]
      .filter((negociacao) => {
        const tipoOk = tipoFiltro === "todos" || negociacao.tipo === tipoFiltro;
        const statusOk =
          statusFiltro === "todos" || negociacao.status === statusFiltro;
        const etapaOk = etapaFiltro === "todas" || negociacao.etapa === etapaFiltro;
        const prioridadeOk =
          prioridadeFiltro === "todos" ||
          negociacao.prioridade === prioridadeFiltro;
        const origemOk =
          origemFiltro === "todos" || negociacao.origem === origemFiltro;
        const textoBusca = [
          negociacao.titulo,
          negociacao.cliente,
          negociacao.corretor,
          negociacao.imobiliaria,
          negociacao.resumoLotes,
          negociacao.ultimaAcao,
          negociacao.observacaoInterna,
        ]
          .join(" ")
          .toLowerCase();
        const buscaOk =
          !buscaNormalizada || textoBusca.includes(buscaNormalizada);

        return tipoOk && statusOk && etapaOk && prioridadeOk && origemOk && buscaOk;
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [
    busca,
    negociacoes,
    origemFiltro,
    etapaFiltro,
    prioridadeFiltro,
    statusFiltro,
    tipoFiltro,
  ]);

  const resumo = useMemo(() => {
    const pipeline = negociacoesFiltradas
      .filter((item) =>
        [
          "rascunho",
          "simulacao",
          "proposta_enviada",
          "contraproposta",
          "em_negociacao",
          "aguardando_retorno",
          "aprovada",
        ].includes(item.status)
      )
      .reduce((acc, item) => acc + item.valorTotal, 0);

    return {
      total: negociacoesFiltradas.length,
      aprovadas: negociacoesFiltradas.filter((item) => item.status === "aprovada")
        .length,
      aguardando: negociacoesFiltradas.filter(
        (item) => item.status === "aguardando_retorno"
      ).length,
      pipeline,
    };
  }, [negociacoesFiltradas]);

  function iniciarEdicao(negociacao: NegociacaoSalva) {
    setEdicao({
      id: negociacao.id,
      status: negociacao.status,
      etapa: negociacao.etapa,
      prioridade: negociacao.prioridade,
      origem: negociacao.origem,
      observacaoInterna: negociacao.observacaoInterna,
      ultimaAcao: negociacao.ultimaAcao,
    });
  }

  function salvarEdicao() {
    if (!edicao) return;

    onAtualizarDadosComerciais(edicao.id, {
      status: edicao.status,
      etapa: edicao.etapa,
      prioridade: edicao.prioridade,
      origem: edicao.origem,
      observacaoInterna: edicao.observacaoInterna,
      ultimaAcao: edicao.ultimaAcao,
    });
    setEdicao(null);
  }

  return (
    <div className="crmStack">
      <section className="crmSection crmFilterShell">
        <div className="crmSectionHeader">
          <div>
            <span className="crmSectionEyebrow">Operação comercial</span>
            <h3 className="crmSectionTitle">Central operacional do funil</h3>
            <p className="crmSectionText">
              Filtros compactos, leitura rápida das negociações e ações diretas para
              acompanhar o pipeline sem poluição visual.
            </p>
          </div>
        </div>

        <div className="crmFilterGrid crmFilterGridWide">
          <label className="crmField">
            <span>Buscar</span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Cliente, corretor, lote ou última ação"
            />
          </label>

          <label className="crmField">
            <span>Tipo</span>
            <select
              value={tipoFiltro}
              onChange={(event) =>
                setTipoFiltro(event.target.value as TipoNegociacao | "todos")
              }
            >
              {TIPOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </label>

          <label className="crmField">
            <span>Etapa</span>
            <select
              value={etapaFiltro}
              onChange={(event) =>
                setEtapaFiltro(event.target.value as EtapaNegociacao | "todas")
              }
            >
              {ETAPAS.map((etapa) => (
                <option key={etapa.value} value={etapa.value}>
                  {etapa.label}
                </option>
              ))}
            </select>
          </label>

          <label className="crmField">
            <span>Prioridade</span>
            <select
              value={prioridadeFiltro}
              onChange={(event) =>
                setPrioridadeFiltro(
                  event.target.value as PrioridadeNegociacao | "todos"
                )
              }
            >
              {PRIORIDADES.map((prioridade) => (
                <option key={prioridade.value} value={prioridade.value}>
                  {prioridade.label}
                </option>
              ))}
            </select>
          </label>

          <label className="crmField">
            <span>Origem</span>
            <select
              value={origemFiltro}
              onChange={(event) =>
                setOrigemFiltro(event.target.value as OrigemNegociacao | "todos")
              }
            >
              {ORIGENS.map((origem) => (
                <option key={origem.value} value={origem.value}>
                  {origem.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="crmStatusPills" role="tablist" aria-label="Filtro de status">
          {STATUS_PILLS.map((status) => (
            <button
              key={status.value}
              type="button"
              className={[
                "crmStatusPill",
                statusFiltro === status.value ? "isActive" : "",
              ]
                .join(" ")
                .trim()}
              onClick={() => setStatusFiltro(status.value)}
            >
              {status.label}
            </button>
          ))}
        </div>

        <section className="crmMetricGrid">
          <article className="crmMetricCard">
            <span className="crmMetricLabel">Resultados</span>
            <strong className="crmMetricValue">{resumo.total}</strong>
            <span className="crmMetricHint">Negociações dentro dos filtros atuais.</span>
          </article>

          <article className="crmMetricCard crmMetricCardAccent">
            <span className="crmMetricLabel">Pipeline filtrado</span>
            <strong className="crmMetricValue">{formatarMoeda(resumo.pipeline)}</strong>
            <span className="crmMetricHint">Valor vivo em acompanhamento.</span>
          </article>

          <article className="crmMetricCard">
            <span className="crmMetricLabel">Aguardando retorno</span>
            <strong className="crmMetricValue">{resumo.aguardando}</strong>
            <span className="crmMetricHint">Itens pedindo retomada comercial.</span>
          </article>

          <article className="crmMetricCard">
            <span className="crmMetricLabel">Aprovadas</span>
            <strong className="crmMetricValue">{resumo.aprovadas}</strong>
            <span className="crmMetricHint">Negociações com sinal positivo.</span>
          </article>
        </section>
      </section>

      {negociacoesFiltradas.length === 0 ? (
        <section className="crmSection">
          <div className="crmEmptyState">
            <span className="crmBadge">Estado vazio</span>
            <h3>Nenhuma negociação encontrada</h3>
            <p>
              Ajuste os filtros ou salve novas negociações no simulador para preencher
              esta central com oportunidades reais.
            </p>
          </div>
        </section>
      ) : (
        <section className="crmSection">
          <div className="crmSectionHeader">
            <div>
              <span className="crmSectionEyebrow">Fila de trabalho</span>
              <h3 className="crmSectionTitle">Negociações em acompanhamento</h3>
            </div>
          </div>

          <div className="crmDealsList">
            {negociacoesFiltradas.map((negociacao) => {
              const editando = edicao?.id === negociacao.id;
              const historicoAberto = historicoAbertoId === negociacao.id;
              const historicoOrdenado = [...negociacao.historico].sort((a, b) => {
                return (
                  new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
                );
              });

              return (
                <article
                  key={negociacao.id}
                  className={[
                    "crmDealCard",
                    negociacao.id === negociacaoAtivaId ? "isActive" : "",
                  ]
                    .join(" ")
                    .trim()}
                >
                  <div className="crmDealHeader">
                    <div className="crmDealTitleBlock">
                      <span className="crmDealOverline">
                        {labelTipo(negociacao.tipo)} • Atualizado em{" "}
                        {formatarData(negociacao.updatedAt)}
                      </span>
                      <h3>{negociacao.clienteNome || negociacao.cliente || negociacao.titulo}</h3>
                      <p>{negociacao.titulo}</p>
                    </div>

                    <div className="crmDealStatusArea">
                      <div className="crmDealStatus">
                        <span className={["crmBadge", statusTone(negociacao.status)].join(" ")}>
                          {labelStatus(negociacao.status)}
                        </span>
                        <span className="crmBadge isMuted">{labelEtapa(negociacao.etapa)}</span>
                        <span
                          className={[
                            "crmBadge",
                            prioridadeTone(negociacao.prioridade),
                          ].join(" ")}
                        >
                          {labelPrioridade(negociacao.prioridade)}
                        </span>
                        <span className={["crmBadge", origemTone(negociacao.origem)].join(" ")}>
                          {labelOrigem(negociacao.origem)}
                        </span>
                      </div>

                      <div className="crmDealActionsMenu">
                        <button
                          type="button"
                          className="btn btnGhost crmIconButton"
                          onClick={() =>
                            setMenuAbertoId((anterior) =>
                              anterior === negociacao.id ? null : negociacao.id
                            )
                          }
                          aria-label="Abrir ações"
                        >
                          ...
                        </button>

                        {menuAbertoId === negociacao.id ? (
                          <div className="crmMenuDropdown">
                            <button type="button" onClick={() => onGerarPdf(negociacao)}>
                              Gerar PDF
                            </button>
                            <button type="button" onClick={() => onDuplicar(negociacao.id)}>
                              Duplicar
                            </button>
                            <button
                              type="button"
                              onClick={() => onExcluir(negociacao.id)}
                              className="isDanger"
                            >
                              Excluir
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="crmDealMetaGrid">
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Corretor</span>
                      <strong>
                        {negociacao.corretorNome || negociacao.corretor || "Não informado"}
                      </strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Valor</span>
                      <strong>{formatarMoeda(negociacao.valorTotal)}</strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Entrada / saldo</span>
                      <strong>
                        {formatarMoeda(negociacao.entrada)} / {formatarMoeda(negociacao.saldoFinal)}
                      </strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Última ação</span>
                      <strong>{negociacao.ultimaAcao || "Sem ação registrada"}</strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Lotes</span>
                      <strong>{negociacao.resumoLotes}</strong>
                    </div>
                  </div>

                  {editando ? (
                    <div className="crmEditorGrid">
                      <label className="crmField">
                        <span>Status</span>
                        <select
                          value={edicao.status}
                          onChange={(event) =>
                            setEdicao((anterior) =>
                              anterior
                                ? {
                                    ...anterior,
                                    status: event.target.value as StatusNegociacao,
                                  }
                                : anterior
                            )
                          }
                        >
                          {STATUS.filter((item) => item.value !== "todos").map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="crmField">
                        <span>Etapa</span>
                        <select
                          value={edicao.etapa}
                          onChange={(event) =>
                            setEdicao((anterior) =>
                              anterior
                                ? {
                                    ...anterior,
                                    etapa: event.target.value as EtapaNegociacao,
                                  }
                                : anterior
                            )
                          }
                        >
                          {ETAPAS.filter((item) => item.value !== "todas").map((etapa) => (
                            <option key={etapa.value} value={etapa.value}>
                              {etapa.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="crmField">
                        <span>Prioridade</span>
                        <select
                          value={edicao.prioridade}
                          onChange={(event) =>
                            setEdicao((anterior) =>
                              anterior
                                ? {
                                    ...anterior,
                                    prioridade:
                                      event.target.value as PrioridadeNegociacao,
                                  }
                                : anterior
                            )
                          }
                        >
                          {PRIORIDADES.filter((item) => item.value !== "todos").map(
                            (prioridade) => (
                              <option key={prioridade.value} value={prioridade.value}>
                                {prioridade.label}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label className="crmField">
                        <span>Origem</span>
                        <select
                          value={edicao.origem}
                          onChange={(event) =>
                            setEdicao((anterior) =>
                              anterior
                                ? {
                                    ...anterior,
                                    origem: event.target.value as OrigemNegociacao,
                                  }
                                : anterior
                            )
                          }
                        >
                          {ORIGENS.filter((item) => item.value !== "todos").map((origem) => (
                            <option key={origem.value} value={origem.value}>
                              {origem.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="crmField crmFieldWide">
                        <span>Última ação</span>
                        <input
                          value={edicao.ultimaAcao}
                          onChange={(event) =>
                            setEdicao((anterior) =>
                              anterior
                                ? {
                                    ...anterior,
                                    ultimaAcao: event.target.value,
                                  }
                                : anterior
                            )
                          }
                          placeholder="Ex: cliente pediu revisao da entrada"
                        />
                      </label>

                      <label className="crmField crmFieldWide">
                        <span>Observação interna</span>
                        <textarea
                          className="crmTextarea"
                          value={edicao.observacaoInterna}
                          onChange={(event) =>
                            setEdicao((anterior) =>
                              anterior
                                ? {
                                    ...anterior,
                                    observacaoInterna: event.target.value,
                                  }
                                : anterior
                            )
                          }
                          placeholder="Notas internas do gestor ou do time comercial"
                        />
                      </label>

                      <div className="crmButtonRow">
                        <button type="button" className="btn" onClick={salvarEdicao}>
                          Salvar dados comerciais
                        </button>
                        <button
                          type="button"
                          className="btn btnGhost"
                          onClick={() => setEdicao(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {historicoAberto ? (
                    <div className="crmTimeline">
                      {historicoOrdenado.length > 0 ? (
                        historicoOrdenado.map((evento) => (
                          <div key={evento.id} className="crmTimelineItem">
                            <div className="crmTimelineDot" />
                            <div className="crmTimelineBody">
                              <strong>{evento.descricao}</strong>
                              <span>{formatarData(evento.dataHora)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="crmHint">
                          Nenhum evento registrado até o momento para esta negociação.
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="crmButtonRow">
                    <button type="button" className="btn" onClick={() => onAbrir(negociacao)}>
                      Abrir no simulador
                    </button>
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => iniciarEdicao(negociacao)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() =>
                        setHistoricoAbertoId((anterior) =>
                          anterior === negociacao.id ? null : negociacao.id
                        )
                      }
                    >
                      {historicoAberto ? "Ocultar histórico" : "Ver histórico"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
