import { type FormEvent, useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import {
  createUserAccess,
  listUsers,
  updateUserAccess,
} from "../services/usersService";
import type { UserProfile, UserRole } from "../types/user";

function roleLabel(role: UserRole) {
  const map: Record<UserRole, string> = {
    admin: "Admin",
    gestor: "Gestor",
    corretor: "Corretor",
    consultora: "Consultora",
  };
  return map[role] ?? role;
}

function roleBadge(role: UserRole) {
  if (role === "admin") return "isDanger";
  if (role === "gestor") return "isWarning";
  if (role === "consultora") return "isInfo";
  return "isMuted";
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    role: "consultora" as UserRole,
    ativo: true,
  });

  async function load() {
    try {
      setLoading(true);
      setUsers(await listUsers());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleConvidar(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");

    try {
      // Tenta convite via Supabase admin; se não disponível, usa signUp
      if (supabase) {
        const { error: inviteError } = await (supabase.auth.admin as unknown as {
          inviteUserByEmail: (email: string, opts: Record<string, unknown>) => Promise<{ error: unknown }>;
        }).inviteUserByEmail(form.email.trim().toLowerCase(), {
          data: { nome: form.nome.trim() },
        });

        if (inviteError) throw inviteError;
        setFeedback(`Convite enviado para ${form.email}.`);
      } else {
        await createUserAccess({
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          senha: form.senha,
          role: form.role,
          ativo: form.ativo,
        });
        setFeedback("Usuário criado com sucesso.");
      }

      await load();
      setForm({ nome: "", email: "", senha: "", role: "consultora", ativo: true });
      setShowForm(false);
    } catch {
      // Fallback: criar via signUp com senha temporária
      try {
        const created = await createUserAccess({
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          senha: form.senha || `Temp@${Date.now()}`,
          role: form.role,
          ativo: form.ativo,
        });
        setUsers((prev) => [created, ...prev]);
        setFeedback("Usuário criado. Compartilhe as credenciais de acesso.");
        setForm({ nome: "", email: "", senha: "", role: "consultora", ativo: true });
        setShowForm(false);
      } catch (e2) {
        setError(e2 instanceof Error ? e2.message : "Erro ao criar usuário.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(user: UserProfile) {
    try {
      const updated = await updateUserAccess(user.id, { ativo: !user.ativo });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setFeedback(`${user.nome} ${!user.ativo ? "ativado" : "inativado"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao alterar status.");
    }
  }

  async function handleChangeRole(user: UserProfile, novoRole: UserRole) {
    try {
      const updated = await updateUserAccess(user.id, { role: novoRole });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setFeedback(`Perfil de ${user.nome} alterado para ${roleLabel(novoRole)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao alterar perfil.");
    }
  }

  return (
    <div className="crmStack">
      <section className="crmSection crmFilterShell">
        <div className="crmSectionHeader">
          <div>
            <span className="crmSectionEyebrow">Administração</span>
            <h2 className="crmSectionTitle">Usuários do sistema</h2>
            <p className="crmSectionText">
              Gerencie consultoras, gestores e acessos ao RR CRM.
            </p>
          </div>
          <div className="crmToolbarActions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setShowForm((v) => !v);
                setFeedback("");
                setError("");
              }}
            >
              {showForm ? "Cancelar" : "Convidar usuário"}
            </button>
          </div>
        </div>
      </section>

      {feedback ? <div className="appInlineFeedback">{feedback}</div> : null}
      {error ? <div className="loginError">{error}</div> : null}

      {showForm ? (
        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Convidar novo usuário</h3>
              <p className="crmPanelDescription">
                Um e-mail de convite será enviado ou as credenciais geradas diretamente.
              </p>
            </div>
          </div>

          <form className="crmAccessForm" onSubmit={(e) => void handleConvidar(e)}>
            <div className="crmAccessFormSplit">
              <label className="crmField">
                <span>Nome *</span>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                />
              </label>
              <label className="crmField">
                <span>E-mail *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div className="crmAccessFormSplit">
              <label className="crmField">
                <span>Senha temporária</span>
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder="Deixe em branco para envio por e-mail"
                />
              </label>
              <label className="crmField">
                <span>Perfil</span>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as UserRole }))
                  }
                >
                  <option value="consultora">Consultora</option>
                  <option value="gestor">Gestor</option>
                  <option value="corretor">Corretor</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>

            <div className="crmButtonRow">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Enviando..." : "Convidar"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="crmPanel">
        <div className="crmPanelHead">
          <div>
            <h3 className="crmPanelTitle">Usuários cadastrados</h3>
            <p className="crmPanelDescription">
              {users.length} usuário(s) no sistema.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="appShellLoadingInline">Carregando usuários...</div>
        ) : users.length === 0 ? (
          <div className="crmEmptyState">
            <span className="crmBadge">Sem registros</span>
            <h3>Nenhum usuário encontrado</h3>
          </div>
        ) : (
          <div className="crmEntityList">
            {users.map((user) => (
              <article
                key={user.id}
                className={[
                  "crmEntityCard",
                  !user.ativo ? "isInactive" : "",
                ].join(" ").trim()}
              >
                <div className="crmEntityHeader">
                  <div className="crmAccessIdentity crmIdentityWithAvatar">
                    <span className="crmEntityAvatar">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.nome}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        />
                      ) : (
                        getInitials(user.nomeExibicao || user.nome)
                      )}
                    </span>
                    <div>
                      <span className="crmDealOverline">{user.email}</span>
                      <h3>{user.nomeExibicao || user.nome}</h3>
                      <p>{user.cargo || roleLabel(user.role)}</p>
                    </div>
                  </div>
                  <div className="crmDealStatus">
                    <span className={`crmBadge ${roleBadge(user.role)}`}>
                      {roleLabel(user.role)}
                    </span>
                    <span className={`crmBadge ${user.ativo ? "isSuccess" : "isMuted"}`}>
                      {user.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                <div className="crmButtonRow">
                  <label className="crmField" style={{ flex: "none", margin: 0 }}>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        void handleChangeRole(user, e.target.value as UserRole)
                      }
                      style={{ fontSize: 13 }}
                    >
                      <option value="consultora">Consultora</option>
                      <option value="gestor">Gestor</option>
                      <option value="corretor">Corretor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btnGhost"
                    onClick={() => void handleToggleAtivo(user)}
                  >
                    {user.ativo ? "Desativar" : "Reativar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
