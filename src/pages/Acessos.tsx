import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../components/AuthProvider";
import { branding } from "../config/branding";
import {
  createUserAccess,
  listUsers,
  updateUserAccess,
} from "../services/usersService";
import type { CreateUserAccessInput, UserProfile, UserRole } from "../types/user";

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "gestor", label: "Gestor" },
  { value: "corretor", label: "Corretor" },
];

type EditState = {
  id: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AcessosPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [form, setForm] = useState<CreateUserAccessInput>({
    nome: "",
    email: "",
    senha: "",
    role: "corretor",
    ativo: true,
  });

  async function loadUsers() {
    try {
      setError("");
      setLoadingUsers(true);
      const data = await listUsers();
      setUsers(data);
    } catch (currentError) {
      const message =
        currentError instanceof Error
          ? currentError.message
          : "Nao foi possivel carregar os acessos.";
      setError(message);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const summary = useMemo(() => {
    const activeCount = users.filter((user) => user.ativo).length;
    const adminCount = users.filter((user) => user.role === "admin").length;
    return {
      total: users.length,
      active: activeCount,
      inactive: users.length - activeCount,
      admin: adminCount,
    };
  }, [users]);

  function notify(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2600);
  }

  async function handleCreateAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      await createUserAccess(form);
      setForm({
        nome: "",
        email: "",
        senha: "",
        role: "corretor",
        ativo: true,
      });
      await loadUsers();
      notify("Novo acesso criado com sucesso.");
    } catch (currentError) {
      const message =
        currentError instanceof Error
          ? currentError.message
          : "Nao foi possivel criar o acesso.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editState) return;

    try {
      setBusyUserId(editState.id);
      setError("");
      await updateUserAccess(editState.id, {
        nome: editState.nome,
        role: editState.role,
        ativo: editState.ativo,
      });
      setEditState(null);
      await loadUsers();
      notify("Acesso atualizado com sucesso.");
    } catch (currentError) {
      const message =
        currentError instanceof Error
          ? currentError.message
          : "Nao foi possivel atualizar o acesso.";
      setError(message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleToggleUser(user: UserProfile) {
    try {
      setBusyUserId(user.id);
      setError("");
      await updateUserAccess(user.id, {
        ativo: !user.ativo,
      });
      await loadUsers();
      notify(user.ativo ? "Usuario inativado." : "Usuario ativado.");
    } catch (currentError) {
      const message =
        currentError instanceof Error
          ? currentError.message
          : "Nao foi possivel atualizar o status do usuario.";
      setError(message);
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="crmStack">
      <section className="crmMetricGrid">
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Usuarios</span>
          <strong className="crmMetricValue">{summary.total}</strong>
          <span className="crmMetricHint">Base total de acessos no ambiente.</span>
        </article>
        <article className="crmMetricCard crmMetricCardAccent">
          <span className="crmMetricLabel">Ativos</span>
          <strong className="crmMetricValue">{summary.active}</strong>
          <span className="crmMetricHint">Usuarios aptos a operar o RR CRM.</span>
        </article>
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Inativos</span>
          <strong className="crmMetricValue">{summary.inactive}</strong>
          <span className="crmMetricHint">Acessos pausados sem exclusao de registro.</span>
        </article>
        <article className="crmMetricCard">
          <span className="crmMetricLabel">Admins</span>
          <strong className="crmMetricValue">{summary.admin}</strong>
          <span className="crmMetricHint">Usuarios com governanca do ambiente.</span>
        </article>
      </section>

      {feedback ? <div className="appInlineFeedback">{feedback}</div> : null}
      {error ? <div className="loginError">{error}</div> : null}

      <div className="crmAccessGrid">
        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Novo acesso</h3>
              <p className="crmPanelDescription">
                Cadastre usuarios com perfil inicial e status operacional.
              </p>
            </div>
          </div>

          <form className="crmAccessForm" onSubmit={handleCreateAccess}>
            <label className="crmField">
              <span>Nome</span>
              <input
                value={form.nome}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    nome: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="crmField">
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="crmField">
              <span>Senha inicial</span>
              <input
                type="password"
                value={form.senha}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    senha: event.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="crmAccessFormSplit">
              <label className="crmField">
                <span>Perfil</span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      role: event.target.value as UserRole,
                    }))
                  }
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="crmField">
                <span>Status</span>
                <select
                  value={form.ativo ? "ativo" : "inativo"}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      ativo: event.target.value === "ativo",
                    }))
                  }
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
            </div>

            <div className="crmButtonRow">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Salvando..." : "Criar acesso"}
              </button>
            </div>

            <div className="crmHint">
              Admin atual: {profile?.nome || profile?.email || branding.appName}
            </div>
          </form>
        </section>

        <section className="crmSection">
          <div className="crmSectionHeader">
            <div>
              <span className="crmSectionEyebrow">Usuarios cadastrados</span>
              <h3 className="crmSectionTitle">Controle operacional de acessos</h3>
              <p className="crmSectionText">
                Visualizacao mais limpa para editar perfil, status e dados basicos sem
                misturar criacao e manutencao.
              </p>
            </div>
          </div>

          {loadingUsers ? (
            <div className="appShellLoadingInline">Carregando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="crmEmptyState">
              <span className="crmBadge">Sem usuarios</span>
              <h3>Nenhum acesso cadastrado ainda</h3>
              <p>
                Use o formulario ao lado para criar o primeiro usuario do ambiente.
              </p>
            </div>
          ) : (
            <div className="crmAccessList">
              {users.map((user) => {
                const isEditing = editState?.id === user.id;
                const isBusy = busyUserId === user.id;

                return (
                  <article key={user.id} className="crmAccessCard">
                    <div className="crmAccessHeader">
                      <div className="crmAccessIdentity">
                        <h3>{user.nome}</h3>
                        <p>{user.email}</p>
                      </div>

                      <div className="crmDealStatus">
                        <span className={["crmBadge", `is-${user.role}`].join(" ")}>
                          {user.role}
                        </span>
                        <span
                          className={[
                            "crmBadge",
                            user.ativo ? "isSuccess" : "isMuted",
                          ].join(" ")}
                        >
                          {user.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>

                    <div className="crmDataGrid">
                      <div className="crmDataItem">
                        <span className="crmDataLabel">Criado em</span>
                        <strong className="crmDataValue">{formatDate(user.createdAt)}</strong>
                      </div>
                      <div className="crmDataItem">
                        <span className="crmDataLabel">User ID</span>
                        <strong className="crmDataValue">{user.userId}</strong>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="crmEditorGrid">
                        <label className="crmField">
                          <span>Nome</span>
                          <input
                            value={editState.nome}
                            onChange={(event) =>
                              setEditState((previous) =>
                                previous
                                  ? { ...previous, nome: event.target.value }
                                  : previous
                              )
                            }
                          />
                        </label>

                        <label className="crmField">
                          <span>Perfil</span>
                          <select
                            value={editState.role}
                            onChange={(event) =>
                              setEditState((previous) =>
                                previous
                                  ? {
                                      ...previous,
                                      role: event.target.value as UserRole,
                                    }
                                  : previous
                              )
                            }
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="crmField">
                          <span>Status</span>
                          <select
                            value={editState.ativo ? "ativo" : "inativo"}
                            onChange={(event) =>
                              setEditState((previous) =>
                                previous
                                  ? {
                                      ...previous,
                                      ativo: event.target.value === "ativo",
                                    }
                                  : previous
                              )
                            }
                          >
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                          </select>
                        </label>

                        <div className="crmButtonRow">
                          <button
                            type="button"
                            className="btn"
                            onClick={handleSaveEdit}
                            disabled={isBusy}
                          >
                            {isBusy ? "Salvando..." : "Salvar alteracoes"}
                          </button>
                          <button
                            type="button"
                            className="btn btnGhost"
                            onClick={() => setEditState(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="crmButtonRow">
                        <button
                          type="button"
                          className="btn"
                          onClick={() =>
                            setEditState({
                              id: user.id,
                              nome: user.nome,
                              role: user.role,
                              ativo: user.ativo,
                            })
                          }
                        >
                          Editar perfil
                        </button>
                        <button
                          type="button"
                          className="btn btnGhost"
                          onClick={() => void handleToggleUser(user)}
                          disabled={isBusy}
                        >
                          {isBusy
                            ? "Atualizando..."
                            : user.ativo
                              ? "Inativar"
                              : "Ativar"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
