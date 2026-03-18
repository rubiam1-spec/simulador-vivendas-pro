import { type FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  createCliente,
  listClientes,
  migrarClientesDoLocalStorage,
  updateCliente,
} from "../services/clientesServiceSupabase";
import type {
  Cliente,
  ClienteStatus,
  CreateClienteInput,
  OrigemLead,
} from "../types/cliente";

const statusOptions: Array<{ value: ClienteStatus; label: string }> = [
  { value: "novo", label: "Novo" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "negociando", label: "Negociando" },
  { value: "convertido", label: "Convertido" },
  { value: "inativo", label: "Inativo" },
];

const origemOptions: Array<{ value: OrigemLead; label: string }> = [
  { value: "site", label: "Site" },
  { value: "indicacao", label: "Indicação" },
  { value: "trafego_pago", label: "Tráfego pago" },
  { value: "corretor", label: "Corretor" },
  { value: "feira", label: "Feira" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
];

function emptyForm(): CreateClienteInput {
  return {
    nome: "",
    telefone: "",
    email: "",
    cpf: "",
    cidade: "",
    origemLead: "outro",
    status: "novo",
    corretorResponsavel: "",
    observacoes: "",
  };
}

function statusLabel(status: ClienteStatus) {
  return statusOptions.find((item) => item.value === status)?.label || status;
}

function origemLabel(origem: OrigemLead) {
  return origemOptions.find((item) => item.value === origem)?.label || origem;
}

function badgeClass(status: ClienteStatus) {
  if (status === "convertido") return "isSuccess";
  if (status === "negociando" || status === "proposta_enviada") return "isWarning";
  if (status === "em_atendimento") return "isInfo";
  if (status === "inativo") return "isDanger";
  return "isMuted";
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClienteStatus | "todos">("todos");
  const [origemFilter, setOrigemFilter] = useState<OrigemLead | "todas">("todas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateClienteInput>(emptyForm);
  const [migrando, setMigrando] = useState(false);

  async function handleMigrar() {
    setMigrando(true);
    try {
      const resultado = await migrarClientesDoLocalStorage();
      if (resultado.migrados > 0) {
        const data = await listClientes();
        setClientes(data);
        setFeedback(`${resultado.migrados} cliente(s) migrado(s) com sucesso.`);
      } else {
        setFeedback("Nenhum dado local encontrado para migrar.");
      }
    } catch {
      setError("Erro durante a migração.");
    } finally {
      setMigrando(false);
    }
  }
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await listClientes();
        if (!cancelled) {
          setClientes(data);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar clientes.");
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

  const clientesFiltrados = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          cliente.nome,
          cliente.email,
          cliente.telefone,
          cliente.cpf,
          cliente.cidade,
          cliente.corretorResponsavel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "todos" || cliente.status === statusFilter;
      const matchesOrigem =
        origemFilter === "todas" || cliente.origemLead === origemFilter;

      return matchesQuery && matchesStatus && matchesOrigem;
    });
  }, [clientes, deferredQuery, origemFilter, statusFilter]);

  const metricas = useMemo(() => {
    const ativos = clientes.filter((cliente) => cliente.status !== "inativo").length;
    const negociando = clientes.filter(
      (cliente) =>
        cliente.status === "negociando" || cliente.status === "proposta_enviada"
    ).length;
    const convertidos = clientes.filter(
      (cliente) => cliente.status === "convertido"
    ).length;

    return {
      total: clientes.length,
      ativos,
      negociando,
      convertidos,
    };
  }, [clientes]);

  function handleNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setFeedback("");
    setError("");
  }

  function handleEdit(cliente: Cliente) {
    setEditingId(cliente.id);
    setForm({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      cpf: cliente.cpf,
      cidade: cliente.cidade,
      origemLead: cliente.origemLead,
      status: cliente.status,
      corretorResponsavel: cliente.corretorResponsavel,
      observacoes: cliente.observacoes,
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
        const updated = await updateCliente(editingId, form);
        if (!updated) {
          throw new Error("Cliente não encontrado para atualização.");
        }

        setClientes((current) =>
          current.map((cliente) => (cliente.id === editingId ? updated : cliente))
        );
        setFeedback("Cadastro do cliente atualizado com sucesso.");
      } else {
        const created = await createCliente(form);
        setClientes((current) => [created, ...current]);
        setFeedback("Cliente cadastrado com sucesso.");
      }

      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
    } catch (submitError) {
      const mensagem =
        submitError instanceof Error
          ? submitError.message
          : typeof submitError === "object" &&
            submitError !== null &&
            "message" in submitError
          ? String((submitError as { message: unknown }).message)
          : "Não foi possível salvar o cliente.";
      setError(mensagem);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="crmStack">
      <section className="crmMetricGrid">
        <article className="crmMetricCard crmMetricCardAccent">
          <span className="crmMetricLabel">Base ativa</span>
          <strong className="crmMetricValue">{metricas.ativos}</strong>
          <span className="crmMetricHint">Clientes em operação no CRM</span>
        </article>
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Total cadastrado</span>
          <strong className="crmMetricValue">{metricas.total}</strong>
          <span className="crmMetricHint">Registros preparados para integração</span>
        </article>
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Em negociação</span>
          <strong className="crmMetricValue">{metricas.negociando}</strong>
          <span className="crmMetricHint">Leads em proposta ou conversa ativa</span>
        </article>
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Convertidos</span>
          <strong className="crmMetricValue">{metricas.convertidos}</strong>
          <span className="crmMetricHint">Base pronta para cruzar com negociações</span>
        </article>
      </section>

      <section className="crmSection crmFilterShell">
        <div className="crmSectionHeader">
          <div>
            <span className="crmSectionEyebrow">Relacionamento comercial</span>
            <h2 className="crmSectionTitle">Base de clientes</h2>
            <p className="crmSectionText">
              Estrutura pronta para receber a tabela `clientes` e conectar cliente,
              corretor e negociação no fluxo do simulador.
            </p>
          </div>
          <div className="crmToolbarActions">
            <button
              type="button"
              className="btn btnGhost"
              onClick={() => void handleMigrar()}
              disabled={migrando}
            >
              {migrando ? "Migrando..." : "Migrar dados locais"}
            </button>
            <button type="button" className="btn" onClick={handleNew}>
              Novo cadastro
            </button>
          </div>
        </div>

        <div className="crmFilterGrid crmFilterGridWide">
          <label className="crmField">
            <span>Busca</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, CPF, email, cidade ou corretor"
            />
          </label>

          <label className="crmField">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ClienteStatus | "todos")
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

          <label className="crmField">
            <span>Origem</span>
            <select
              value={origemFilter}
              onChange={(event) =>
                setOrigemFilter(event.target.value as OrigemLead | "todas")
              }
            >
              <option value="todas">Todas</option>
              {origemOptions.map((origem) => (
                <option key={origem.value} value={origem.value}>
                  {origem.label}
                </option>
              ))}
            </select>
          </label>

          <div className="crmField">
            <span>Preparacao</span>
            <div className="crmFilterSummary">
              {clientesFiltrados.length} registro(s) visivel(is)
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
                {editingId ? "Editar cliente" : "Cadastro de cliente"}
              </h3>
              <p className="crmPanelDescription">
                Formulário já organizado para futuras operações de insert e update
                via Supabase.
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
                  <span>CPF</span>
                  <input
                    value={form.cpf}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, cpf: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="crmAccessFormSplit">
                <label className="crmField">
                  <span>Cidade</span>
                  <input
                    value={form.cidade}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, cidade: event.target.value }))
                    }
                  />
                </label>

                <label className="crmField">
                  <span>Corretor responsavel</span>
                  <input
                    value={form.corretorResponsavel}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        corretorResponsavel: event.target.value,
                      }))
                    }
                    placeholder="Nome do corretor ou equipe"
                  />
                </label>
              </div>

              <div className="crmAccessFormSplit">
                <label className="crmField">
                  <span>Origem do lead</span>
                  <select
                    value={form.origemLead}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        origemLead: event.target.value as OrigemLead,
                      }))
                    }
                  >
                    {origemOptions.map((origem) => (
                      <option key={origem.value} value={origem.value}>
                        {origem.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="crmField">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as ClienteStatus,
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
                <span>Observações</span>
                <textarea
                  className="crmTextarea"
                  value={form.observacoes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      observacoes: event.target.value,
                    }))
                  }
                  placeholder="Contexto do lead, restrições, perfil de compra e observações da operação."
                />
              </label>

              <div className="crmButtonRow">
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar cliente"}
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
              <span className="crmBadge">Cadastro pronto</span>
              <h3>Abrir formulario de cliente</h3>
              <p>
                Use o módulo para iniciar a base comercial e preparar o simulador
                para selecionar clientes reais futuramente.
              </p>
            </div>
          )}
        </section>

        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Listagem operacional</h3>
              <p className="crmPanelDescription">
                Visualização preparada para evoluir para tabela, paginação e
                relações com negociações.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="appShellLoadingInline">Carregando clientes...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="crmEmptyState crmEntityEmpty">
              <span className="crmBadge">Sem registros</span>
              <h3>Nenhum cliente encontrado</h3>
              <p>
                Ajuste os filtros ou crie o primeiro cadastro para estruturar a
                base comercial do RR CRM.
              </p>
            </div>
          ) : (
            <div className="crmEntityList">
              {clientesFiltrados.map((cliente) => (
                <article
                  key={cliente.id}
                  className={[
                    "crmEntityCard",
                    cliente.id === editingId ? "isActive" : "",
                  ]
                    .join(" ")
                    .trim()}
                >
                  <div className="crmEntityHeader">
                    <div className="crmAccessIdentity crmIdentityWithAvatar">
                      <span className="crmEntityAvatar">{getInitials(cliente.nome)}</span>
                      <div>
                      <span className="crmDealOverline">Cliente</span>
                      <h3>{cliente.nome}</h3>
                      <p>
                        {cliente.cidade || "Cidade não informada"} -{" "}
                        {cliente.corretorResponsavel || "Sem corretor responsável"}
                      </p>
                      </div>
                    </div>
                    <div className="crmDealStatus">
                      <span className={`crmBadge ${badgeClass(cliente.status)}`}>
                        {statusLabel(cliente.status)}
                      </span>
                      <span className="crmBadge isMuted">
                        {origemLabel(cliente.origemLead)}
                      </span>
                    </div>
                  </div>

                  <div className="crmDealMetaGrid crmEntityMetaGrid">
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Telefone</span>
                      <strong>
                        {cliente.telefone ? (
                          <a className="crmContactLink" href={`tel:${cliente.telefone}`}>
                            {cliente.telefone}
                          </a>
                        ) : (
                          "Não informado"
                        )}
                      </strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Email</span>
                      <strong>
                        {cliente.email ? (
                          <a className="crmContactLink" href={`mailto:${cliente.email}`}>
                            {cliente.email}
                          </a>
                        ) : (
                          "Não informado"
                        )}
                      </strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">CPF</span>
                      <strong>{cliente.cpf || "Não informado"}</strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Criado em</span>
                      <strong>{new Date(cliente.createdAt).toLocaleDateString("pt-BR")}</strong>
                    </div>
                  </div>

                  {cliente.observacoes ? (
                    <div className="crmEntityNotes">{cliente.observacoes}</div>
                  ) : null}

                  <div className="crmButtonRow">
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => handleEdit(cliente)}
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
