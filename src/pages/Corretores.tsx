import { type FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  createCorretor,
  listCorretores,
  updateCorretor,
} from "../services/corretoresService";
import type {
  Corretor,
  CorretorStatus,
  CreateCorretorInput,
} from "../types/corretor";

const statusOptions: Array<{ value: CorretorStatus; label: string }> = [
  { value: "ativo", label: "Ativo" },
  { value: "em_formacao", label: "Em formacao" },
  { value: "pausado", label: "Pausado" },
  { value: "inativo", label: "Inativo" },
];

function emptyForm(): CreateCorretorInput {
  return {
    nome: "",
    telefone: "",
    email: "",
    imobiliaria: "",
    creci: "",
    status: "ativo",
    observacoes: "",
  };
}

function statusLabel(status: CorretorStatus) {
  return statusOptions.find((item) => item.value === status)?.label || status;
}

function badgeClass(status: CorretorStatus) {
  if (status === "ativo") return "isSuccess";
  if (status === "em_formacao") return "isInfo";
  if (status === "pausado") return "isWarning";
  return "isDanger";
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CorretorStatus | "todos">("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateCorretorInput>(emptyForm);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await listCorretores();
        if (!cancelled) {
          setCorretores(data);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nao foi possivel carregar corretores."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const corretoresFiltrados = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return corretores.filter((corretor) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          corretor.nome,
          corretor.email,
          corretor.telefone,
          corretor.imobiliaria,
          corretor.creci,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesQuery && (statusFilter === "todos" || corretor.status === statusFilter);
    });
  }, [corretores, deferredQuery, statusFilter]);

  const metricas = useMemo(() => {
    const ativos = corretores.filter((corretor) => corretor.status === "ativo").length;
    const emFormacao = corretores.filter(
      (corretor) => corretor.status === "em_formacao"
    ).length;
    const pausados = corretores.filter(
      (corretor) => corretor.status === "pausado" || corretor.status === "inativo"
    ).length;

    return {
      total: corretores.length,
      ativos,
      emFormacao,
      pausados,
    };
  }, [corretores]);

  function handleNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setFeedback("");
    setError("");
  }

  function handleEdit(corretor: Corretor) {
    setEditingId(corretor.id);
    setForm({
      nome: corretor.nome,
      telefone: corretor.telefone,
      email: corretor.email,
      imobiliaria: corretor.imobiliaria,
      creci: corretor.creci,
      status: corretor.status,
      observacoes: corretor.observacoes,
    });
    setShowForm(true);
    setFeedback("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");

    try {
      if (editingId) {
        const updated = await updateCorretor(editingId, form);
        if (!updated) {
          throw new Error("Corretor nao encontrado para atualizacao.");
        }

        setCorretores((current) =>
          current.map((corretor) => (corretor.id === editingId ? updated : corretor))
        );
        setFeedback("Cadastro do corretor atualizado com sucesso.");
      } else {
        const created = await createCorretor(form);
        setCorretores((current) => [created, ...current]);
        setFeedback("Corretor cadastrado com sucesso.");
      }

      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel salvar o corretor."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="crmStack">
      <section className="crmMetricGrid">
        <article className="crmMetricCard crmMetricCardAccent">
          <span className="crmMetricLabel">Corretores ativos</span>
          <strong className="crmMetricValue">{metricas.ativos}</strong>
          <span className="crmMetricHint">Prontos para vinculo com clientes e negociacoes</span>
        </article>
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Total cadastrado</span>
          <strong className="crmMetricValue">{metricas.total}</strong>
          <span className="crmMetricHint">Base comercial preparada para crescimento</span>
        </article>
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Em formacao</span>
          <strong className="crmMetricValue">{metricas.emFormacao}</strong>
          <span className="crmMetricHint">Acompanhamento do onboarding comercial</span>
        </article>
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Pausados / inativos</span>
          <strong className="crmMetricValue">{metricas.pausados}</strong>
          <span className="crmMetricHint">Controle da base de parceiros e equipes</span>
        </article>
      </section>

      <section className="crmSection crmFilterShell">
        <div className="crmSectionHeader">
          <div>
            <span className="crmSectionEyebrow">Operacao de parceiros</span>
            <h2 className="crmSectionTitle">Base de corretores</h2>
            <p className="crmSectionText">
              O modulo ja nasce pronto para integrar corretores ao simulador, aos
              clientes e ao cadastro futuro de negociacoes vinculadas.
            </p>
          </div>
          <div className="crmToolbarActions">
            <button type="button" className="btn" onClick={handleNew}>
              Novo cadastro
            </button>
          </div>
        </div>

        <div className="crmFilterGrid crmFilterGridWide crmFilterGridThree">
          <label className="crmField">
            <span>Busca</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, CRECI, email, telefone ou imobiliaria"
            />
          </label>

          <label className="crmField">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as CorretorStatus | "todos")
              }
            >
              <option value="todos">Todos</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <div className="crmField">
            <span>Preparacao</span>
            <div className="crmFilterSummary">
              {corretoresFiltrados.length} registro(s) visivel(is)
            </div>
          </div>
        </div>
      </section>

      {feedback ? <div className="appInlineFeedback">{feedback}</div> : null}
      {error ? <div className="loginError">{error}</div> : null}

      <div className="crmAccessGrid crmEntityGrid">
        <section
          className={["crmPanel", "crmPanelExpandable", showForm ? "isOpen" : ""]
            .join(" ")
            .trim()}
        >
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">
                {editingId ? "Editar corretor" : "Cadastro de corretor"}
              </h3>
              <p className="crmPanelDescription">
                Estrutura orientada a dados para futura tabela `corretores` no
                Supabase sem mudar a UX da pagina.
              </p>
            </div>
            {!showForm ? (
              <button type="button" className="btn btnGhost" onClick={handleNew}>
                Abrir formulario
              </button>
            ) : null}
          </div>

          {showForm ? (
            <form className="crmAccessForm" onSubmit={handleSubmit}>
              <div className="crmAccessFormSplit">
                <label className="crmField">
                  <span>Nome</span>
                  <input
                    value={form.nome}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, nome: event.target.value }))
                    }
                    required
                  />
                </label>

                <label className="crmField">
                  <span>Telefone</span>
                  <input
                    value={form.telefone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        telefone: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="crmAccessFormSplit">
                <label className="crmField">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>

                <label className="crmField">
                  <span>Imobiliaria</span>
                  <input
                    value={form.imobiliaria}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        imobiliaria: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="crmAccessFormSplit">
                <label className="crmField">
                  <span>CRECI</span>
                  <input
                    value={form.creci}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, creci: event.target.value }))
                    }
                  />
                </label>

                <label className="crmField">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as CorretorStatus,
                      }))
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="crmField">
                <span>Observacoes</span>
                <textarea
                  className="crmTextarea"
                  value={form.observacoes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      observacoes: event.target.value,
                    }))
                  }
                  placeholder="Dados de atendimento, carteira, disponibilidade e detalhes do parceiro."
                />
              </label>

              <div className="crmButtonRow">
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Salvar alteracoes" : "Cadastrar corretor"}
                </button>
                <button
                  type="button"
                  className="btn btnGhost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyForm());
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="crmEmptyState">
              <span className="crmBadge">Operacao preparada</span>
              <h3>Abrir formulario de corretor</h3>
              <p>
                Comece a estruturar a rede comercial e deixe o CRM pronto para
                vincular responsaveis a clientes, propostas e negociacoes.
              </p>
            </div>
          )}
        </section>

        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Listagem operacional</h3>
              <p className="crmPanelDescription">
                Leitura direta da base comercial com foco em status, contato e
                origem da operacao.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="appShellLoadingInline">Carregando corretores...</div>
          ) : corretoresFiltrados.length === 0 ? (
            <div className="crmEmptyState crmEntityEmpty">
              <span className="crmBadge">Sem registros</span>
              <h3>Nenhum corretor encontrado</h3>
              <p>
                Crie o primeiro cadastro para preparar o CRM para atribuicao de
                responsavel comercial nos modulos atuais e futuros.
              </p>
            </div>
          ) : (
            <div className="crmEntityList">
              {corretoresFiltrados.map((corretor) => (
                <article
                  key={corretor.id}
                  className={[
                    "crmEntityCard",
                    corretor.id === editingId ? "isActive" : "",
                  ]
                    .join(" ")
                    .trim()}
                >
                  <div className="crmEntityHeader">
                    <div className="crmAccessIdentity crmIdentityWithAvatar">
                      <span className="crmEntityAvatar">{getInitials(corretor.nome)}</span>
                      <div>
                      <span className="crmDealOverline">Corretor</span>
                      <h3>{corretor.nome}</h3>
                      <p>{corretor.imobiliaria || "Imobiliaria nao informada"}</p>
                      </div>
                    </div>
                    <div className="crmDealStatus">
                      <span className={`crmBadge ${badgeClass(corretor.status)}`}>
                        {statusLabel(corretor.status)}
                      </span>
                    </div>
                  </div>

                  <div className="crmDealMetaGrid crmEntityMetaGrid">
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Telefone</span>
                      <strong>
                        {corretor.telefone ? (
                          <a className="crmContactLink" href={`tel:${corretor.telefone}`}>
                            {corretor.telefone}
                          </a>
                        ) : (
                          "Nao informado"
                        )}
                      </strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Email</span>
                      <strong>
                        {corretor.email ? (
                          <a className="crmContactLink" href={`mailto:${corretor.email}`}>
                            {corretor.email}
                          </a>
                        ) : (
                          "Nao informado"
                        )}
                      </strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">CRECI</span>
                      <strong>{corretor.creci || "Nao informado"}</strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Criado em</span>
                      <strong>{new Date(corretor.createdAt).toLocaleDateString("pt-BR")}</strong>
                    </div>
                  </div>

                  {corretor.observacoes ? (
                    <div className="crmEntityNotes">{corretor.observacoes}</div>
                  ) : null}

                  <div className="crmButtonRow">
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => handleEdit(corretor)}
                    >
                      Editar cadastro
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
