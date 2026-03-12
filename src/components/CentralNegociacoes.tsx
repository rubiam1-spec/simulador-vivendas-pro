import { useMemo, useState } from "react";

import type {
  NegociacaoSalva,
  StatusNegociacao,
  TipoNegociacao,
} from "../types/negociacao";

type CentralNegociacoesProps = {
  negociacoes: NegociacaoSalva[];
  negociacaoAtivaId: string | null;
  onAbrir: (negociacao: NegociacaoSalva) => void;
  onDuplicar: (id: string) => void;
  onExcluir: (id: string) => void;
  onGerarPdf: (negociacao: NegociacaoSalva) => void;
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
  { value: "aprovada", label: "Aprovada" },
  { value: "arquivada", label: "Arquivada" },
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
  if (status === "aprovada") return "Aprovada";
  return "Arquivada";
}

export default function CentralNegociacoes({
  negociacoes,
  negociacaoAtivaId,
  onAbrir,
  onDuplicar,
  onExcluir,
  onGerarPdf,
}: CentralNegociacoesProps) {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoNegociacao | "todos">(
    "todos"
  );
  const [statusFiltro, setStatusFiltro] = useState<StatusNegociacao | "todos">(
    "todos"
  );

  const negociacoesFiltradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();

    return negociacoes.filter((negociacao) => {
      const tipoOk = tipoFiltro === "todos" || negociacao.tipo === tipoFiltro;
      const statusOk =
        statusFiltro === "todos" || negociacao.status === statusFiltro;
      const textoBusca = [
        negociacao.titulo,
        negociacao.cliente,
        negociacao.corretor,
        negociacao.imobiliaria,
        negociacao.resumoLotes,
      ]
        .join(" ")
        .toLowerCase();
      const buscaOk =
        !buscaNormalizada || textoBusca.includes(buscaNormalizada);

      return tipoOk && statusOk && buscaOk;
    });
  }, [busca, negociacoes, statusFiltro, tipoFiltro]);

  return (
    <section className="luxSection luxCentral">
      <div className="luxSectionInner">
        <div className="luxCentralHead">
          <div>
            <div className="luxKicker">Operação comercial</div>
            <h2 className="luxH2">Central de Negociações</h2>
            <p className="luxCentralText">
              Histórico operacional para reabrir negociações, gerar novos PDFs e
              manter o fluxo comercial organizado.
            </p>
          </div>

          <div className="luxCentralMeta">
            <span className="luxChip">
              {negociacoes.length} negociação(ões) salvas
            </span>
          </div>
        </div>

        <div className="luxCentralToolbar">
          <div className="luxCentralFilters">
            <div className="luxField">
              <label>Buscar negociação</label>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Cliente, corretor, lote ou título"
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
          </div>
        </div>

        {negociacoesFiltradas.length === 0 ? (
          <div className="luxNegEmpty">
            Nenhuma negociação encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="luxCentralGrid">
            {negociacoesFiltradas.map((negociacao) => (
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
                    <span className="luxPill luxPillSoft">
                      {labelStatus(negociacao.status)}
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
                    onClick={() => onDuplicar(negociacao.id)}
                  >
                    Duplicar
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
                    className="btn btnGhost luxDangerBtn"
                    onClick={() => onExcluir(negociacao.id)}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
