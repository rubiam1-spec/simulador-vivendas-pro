import { useMemo, useState } from "react";

import type {
  NegociacaoSalva,
  OrigemNegociacao,
  PrioridadeNegociacao,
  StatusNegociacao,
  TipoNegociacao,
} from "../types/negociacao";

type DadosComerciaisEditaveis = Pick<
  NegociacaoSalva,
  "status" | "prioridade" | "origem" | "observacaoInterna" | "ultimaAcao"
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
  { value: "todos", label: "Todos os tipos" },
  { value: "simulacao", label: "Simulação" },
  { value: "proposta", label: "Proposta" },
  { value: "contraproposta", label: "Contra-proposta" },
];

const STATUS: Array<{ value: StatusNegociacao | "todos"; label: string }> = [
  { value: "todos", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "aguardando_retorno", label: "Aguardando retorno" },
  { value: "aprovada", label: "Aprovada" },
  { value: "fechada", label: "Fechada" },
  { value: "perdida", label: "Perdida" },
  { value: "arquivada", label: "Arquivada" },
];

const PRIORIDADES: Array<
  { value: PrioridadeNegociacao | "todos"; label: string }
> = [
  { value: "todos", label: "Todas as prioridades" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const ORIGENS: Array<{ value: OrigemNegociacao | "todos"; label: string }> = [
  { value: "todos", label: "Todas as origens" },
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
  return "Contra-proposta";
}

function labelStatus(status: StatusNegociacao) {
  if (status === "rascunho") return "Rascunho";
  if (status === "em_negociacao") return "Em negociação";
  if (status === "aguardando_retorno") return "Aguardando retorno";
  if (status === "aprovada") return "Aprovada";
  if (status === "fechada") return "Fechada";
  if (status === "perdida") return "Perdida";
  return "Arquivada";
}

function labelPrioridade(prioridade: PrioridadeNegociacao) {
  if (prioridade === "baixa") return "Baixa";
  if (prioridade === "alta") return "Alta";
  return "Média";
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
  if (status === "aprovada" || status === "fechada") return "isPositive";
  if (status === "perdida" || status === "arquivada") return "isMuted";
  if (status === "aguardando_retorno") return "isWarning";
  return "isNeutral";
}

function prioridadeTone(prioridade: PrioridadeNegociacao) {
  if (prioridade === "alta") return "isHigh";
  if (prioridade === "baixa") return "isLow";
  return "isMedium";
}

function origemTone(origem: OrigemNegociacao) {
  if (origem === "cliente_direto" || origem === "indicacao") return "isWarm";
  if (origem === "trafego_pago") return "isAccent";
  return "isNeutral";
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

  const negociacoesFiltradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();

    return negociacoes.filter((negociacao) => {
      const tipoOk = tipoFiltro === "todos" || negociacao.tipo === tipoFiltro;
      const statusOk =
        statusFiltro === "todos" || negociacao.status === statusFiltro;
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

      return tipoOk && statusOk && prioridadeOk && origemOk && buscaOk;
    });
  }, [
    busca,
    negociacoes,
    origemFiltro,
    prioridadeFiltro,
    statusFiltro,
    tipoFiltro,
  ]);

  function iniciarEdicao(negociacao: NegociacaoSalva) {
    setEdicao({
      id: negociacao.id,
      status: negociacao.status,
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
      prioridade: edicao.prioridade,
      origem: edicao.origem,
      observacaoInterna: edicao.observacaoInterna,
      ultimaAcao: edicao.ultimaAcao,
    });
    setEdicao(null);
  }

  return (
    <section className="luxSection luxCentral">
      <div className="luxSectionInner">
        <div className="luxCentralHead">
          <div>
            <div className="luxKicker">Operação comercial</div>
            <h2 className="luxH2">Central de Negociações</h2>
            <p className="luxCentralText">
              Painel operacional para acompanhar estágio, prioridade, origem e
              histórico recente das negociações.
            </p>
          </div>

          <div className="luxCentralMeta">
            <span className="luxChip">
              {negociacoes.length} negociação(ões) salvas
            </span>
          </div>
        </div>

        <div className="luxCentralToolbar">
          <div className="luxCentralFilters luxCentralFiltersWide">
            <div className="luxField">
              <label>Buscar negociação</label>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Cliente, corretor, lote, ação ou observação"
              />
            </div>

            <div className="luxField">
              <label>Tipo</label>
              <select
                value={tipoFiltro}
                onChange={(e) =>
                  setTipoFiltro(e.target.value as TipoNegociacao | "todos")
                }
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="luxField">
              <label>Status</label>
              <select
                value={statusFiltro}
                onChange={(e) =>
                  setStatusFiltro(
                    e.target.value as StatusNegociacao | "todos"
                  )
                }
              >
                {STATUS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="luxField">
              <label>Prioridade</label>
              <select
                value={prioridadeFiltro}
                onChange={(e) =>
                  setPrioridadeFiltro(
                    e.target.value as PrioridadeNegociacao | "todos"
                  )
                }
              >
                {PRIORIDADES.map((prioridade) => (
                  <option key={prioridade.value} value={prioridade.value}>
                    {prioridade.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="luxField">
              <label>Origem</label>
              <select
                value={origemFiltro}
                onChange={(e) =>
                  setOrigemFiltro(e.target.value as OrigemNegociacao | "todos")
                }
              >
                {ORIGENS.map((origem) => (
                  <option key={origem.value} value={origem.value}>
                    {origem.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {negociacoesFiltradas.length === 0 ? (
          <div className="luxNegEmpty">
            Nenhuma negociação encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="luxCentralGrid">
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
                    "luxNegCard",
                    negociacao.id === negociacaoAtivaId ? "isActive" : "",
                  ]
                    .join(" ")
                    .trim()}
                >
                  <div className="luxNegCardTop">
                    <div>
                      <div className="luxNegTitle">{negociacao.titulo}</div>
                      <div className="luxNegSubtitle">
                        {negociacao.cliente || "Cliente não informado"}
                      </div>
                    </div>

                    <div className="luxNegPills">
                      <span className="luxPill">{labelTipo(negociacao.tipo)}</span>
                      <span
                        className={[
                          "luxPill",
                          "luxPillSoft",
                          "luxStatusPill",
                          statusTone(negociacao.status),
                        ]
                          .join(" ")
                          .trim()}
                      >
                        {labelStatus(negociacao.status)}
                      </span>
                      <span
                        className={[
                          "luxPill",
                          "luxPillSoft",
                          "luxPriorityPill",
                          prioridadeTone(negociacao.prioridade),
                        ]
                          .join(" ")
                          .trim()}
                      >
                        {labelPrioridade(negociacao.prioridade)}
                      </span>
                      <span
                        className={[
                          "luxPill",
                          "luxPillSoft",
                          "luxOriginPill",
                          origemTone(negociacao.origem),
                        ]
                          .join(" ")
                          .trim()}
                      >
                        {labelOrigem(negociacao.origem)}
                      </span>
                    </div>
                  </div>

                  <div className="luxNegMeta">
                    <div className="luxNegMetaItem">
                      <span className="luxNegMetaLabel">Corretor</span>
                      <strong>{negociacao.corretor || "Não informado"}</strong>
                    </div>
                    <div className="luxNegMetaItem">
                      <span className="luxNegMetaLabel">Quadra / Lote</span>
                      <strong>{negociacao.resumoLotes}</strong>
                    </div>
                    <div className="luxNegMetaItem">
                      <span className="luxNegMetaLabel">Valor</span>
                      <strong>{formatarMoeda(negociacao.valorTotal)}</strong>
                    </div>
                    <div className="luxNegMetaItem">
                      <span className="luxNegMetaLabel">Atualizado em</span>
                      <strong>{formatarData(negociacao.updatedAt)}</strong>
                    </div>
                  </div>

                  <div className="luxNegInsightRow">
                    <div className="luxNegInsight">
                      <span className="luxNegMetaLabel">Última ação</span>
                      <strong>{negociacao.ultimaAcao || "Sem ação registrada"}</strong>
                    </div>
                    <div className="luxNegInsight">
                      <span className="luxNegMetaLabel">Observação interna</span>
                      <strong>
                        {negociacao.observacaoInterna || "Sem observação interna"}
                      </strong>
                    </div>
                  </div>

                  {editando ? (
                    <div className="luxNegEditor">
                      <div className="luxCentralFilters">
                        <div className="luxField">
                          <label>Status</label>
                          <select
                            value={edicao.status}
                            onChange={(e) =>
                              setEdicao((anterior) =>
                                anterior
                                  ? {
                                      ...anterior,
                                      status: e.target.value as StatusNegociacao,
                                    }
                                  : anterior
                              )
                            }
                          >
                            {STATUS.filter((item) => item.value !== "todos").map(
                              (status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div className="luxField">
                          <label>Prioridade</label>
                          <select
                            value={edicao.prioridade}
                            onChange={(e) =>
                              setEdicao((anterior) =>
                                anterior
                                  ? {
                                      ...anterior,
                                      prioridade:
                                        e.target.value as PrioridadeNegociacao,
                                    }
                                  : anterior
                              )
                            }
                          >
                            {PRIORIDADES.filter(
                              (item) => item.value !== "todos"
                            ).map((prioridade) => (
                              <option
                                key={prioridade.value}
                                value={prioridade.value}
                              >
                                {prioridade.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="luxField">
                          <label>Origem</label>
                          <select
                            value={edicao.origem}
                            onChange={(e) =>
                              setEdicao((anterior) =>
                                anterior
                                  ? {
                                      ...anterior,
                                      origem: e.target.value as OrigemNegociacao,
                                    }
                                  : anterior
                              )
                            }
                          >
                            {ORIGENS.filter((item) => item.value !== "todos").map(
                              (origem) => (
                                <option key={origem.value} value={origem.value}>
                                  {origem.label}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="luxCentralFilters">
                        <div className="luxField">
                          <label>Última ação</label>
                          <input
                            value={edicao.ultimaAcao}
                            onChange={(e) =>
                              setEdicao((anterior) =>
                                anterior
                                  ? {
                                      ...anterior,
                                      ultimaAcao: e.target.value,
                                    }
                                  : anterior
                              )
                            }
                            placeholder="Ex: cliente pediu revisão da entrada"
                          />
                        </div>

                        <div className="luxField luxFieldFull">
                          <label>Observação interna</label>
                          <textarea
                            className="luxCentralTextarea"
                            value={edicao.observacaoInterna}
                            onChange={(e) =>
                              setEdicao((anterior) =>
                                anterior
                                  ? {
                                      ...anterior,
                                      observacaoInterna: e.target.value,
                                    }
                                  : anterior
                              )
                            }
                            placeholder="Notas internas do gestor ou do time comercial"
                          />
                        </div>
                      </div>

                      <div className="luxNegActions">
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
                    <div className="luxNegTimeline">
                      <div className="luxNegTimelineHead">
                        <span className="luxNegMetaLabel">Historico</span>
                        <strong>
                          {historicoOrdenado.length} evento(s) registrados
                        </strong>
                      </div>

                      {historicoOrdenado.length > 0 ? (
                        <div className="luxNegTimelineList">
                          {historicoOrdenado.map((evento) => (
                            <div key={evento.id} className="luxNegTimelineItem">
                              <div className="luxNegTimelineDot" />
                              <div className="luxNegTimelineBody">
                                <strong>{evento.descricao}</strong>
                                <span>
                                  {formatarData(evento.dataHora)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="luxNegTimelineEmpty">
                          Nenhum evento registrado ate o momento.
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="luxNegActions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onAbrir(negociacao)}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => iniciarEdicao(negociacao)}
                    >
                      Editar dados comerciais
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
                      {historicoAberto ? "Ocultar historico" : "Ver historico"}
                    </button>
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => onGerarPdf(negociacao)}
                    >
                      Gerar PDF
                    </button>
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => onDuplicar(negociacao.id)}
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="btn btnGhost luxDangerBtn"
                      onClick={() => onExcluir(negociacao.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
