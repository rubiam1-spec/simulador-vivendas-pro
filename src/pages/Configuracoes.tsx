import { type ChangeEvent, type FormEvent, useRef, useState } from "react";

import { branding } from "../config/branding";
import { useAuth } from "../components/AuthProvider";
import { hasSupabaseConfig } from "../lib/supabase";
import { updateProfile, uploadAvatar } from "../services/profileService";

function formatarRole(role: string) {
  const map: Record<string, string> = {
    admin: "Administrador",
    gestor: "Gestor",
    corretor: "Corretor",
    consultora: "Consultora",
  };
  return map[role] ?? role;
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ConfiguracoesPage() {
  const { session, profile, logout, refreshProfile } = useAuth();

  const [nomeExibicao, setNomeExibicao] = useState(
    profile?.nomeExibicao ?? profile?.nome ?? ""
  );
  const [telefone, setTelefone] = useState(profile?.telefone ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatarUrl ?? null
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    pendingFile.current = file;
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setFeedback("");

    try {
      if (pendingFile.current) {
        await uploadAvatar(profile.id, pendingFile.current);
        pendingFile.current = null;
      }

      await updateProfile(profile.id, {
        nomeExibicao: nomeExibicao.trim(),
        telefone: telefone.trim(),
      });

      await refreshProfile();
      setFeedback("Perfil atualizado com sucesso.");
    } catch {
      setFeedback("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const nomeExibido = profile?.nomeExibicao || profile?.nome || "Usuário";
  const iniciais = getInitials(nomeExibido);

  return (
    <div className="crmStack crmSettingsStack">
      {feedback ? <div className="appInlineFeedback">{feedback}</div> : null}

      {/* Meu perfil */}
      <section className="crmSection">
        <div className="crmSectionHeader">
          <div>
            <span className="crmSectionEyebrow">Identidade</span>
            <h3 className="crmSectionTitle">Meu perfil</h3>
            <p className="crmSectionText">
              Nome de exibição, foto e contato visíveis para a equipe.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="crmAccessForm">
          <div className="crmAccessFormSplit" style={{ alignItems: "flex-start" }}>
            {/* Avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid var(--line)",
                  background: "var(--surface2)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--text2)",
                  padding: 0,
                }}
                title="Clique para trocar a foto"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  iniciais
                )}
              </button>
              <span style={{ fontSize: 11, color: "var(--muted2)" }}>
                Clique para trocar foto
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <label className="crmField">
                <span>Nome de exibição</span>
                <input
                  value={nomeExibicao}
                  onChange={(e) => setNomeExibicao(e.target.value)}
                  placeholder="Como você quer ser chamado(a)"
                />
              </label>

              <label className="crmField">
                <span>Telefone</span>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-0000"
                />
              </label>

              <div className="crmDataItem">
                <span className="crmDataLabel">Cargo / função</span>
                <strong className="crmDataValue">
                  {profile?.cargo || (profile?.role ? formatarRole(profile.role) : "Não definido")}
                </strong>
              </div>
            </div>
          </div>

          <div className="crmButtonRow">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </section>

      {/* Dados da conta */}
      <div className="crmPanelGrid crmPanelGridWide">
        <section className="crmPanel crmPanelSeparated">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Conta</h3>
              <p className="crmPanelDescription">
                Informações principais do usuário autenticado no RR CRM.
              </p>
            </div>
          </div>

          <div className="crmDataGrid">
            <div className="crmDataItem">
              <span className="crmDataLabel">Nome</span>
              <strong className="crmDataValue">
                {profile?.nome || "Não informado"}
              </strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">E-mail</span>
              <strong className="crmDataValue">
                {session?.user.email || "Não identificado"}
              </strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">Perfil</span>
              <strong className="crmDataValue">
                {profile?.role ? formatarRole(profile.role) : "Não definido"}
              </strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">Status</span>
              <strong className="crmDataValue">
                {profile?.ativo ? "Ativo" : "Inativo"}
              </strong>
            </div>
          </div>
        </section>

        <section className="crmPanel crmPanelSeparated">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Autenticação</h3>
              <p className="crmPanelDescription">
                Camada atual de acesso e compatibilidade com o Supabase.
              </p>
            </div>
          </div>

          <div className="crmInlineList">
            <div className="crmInlineListItem crmInlineListItemSplit">
              <span className="crmBadge isInfo">Provider</span>
              <strong>{hasSupabaseConfig ? "Supabase Auth" : "Modo local"}</strong>
            </div>
            <div className="crmInlineListItem crmInlineListItemSplit">
              <span className="crmBadge isMuted">Sessão</span>
              <strong>{session ? "Ativa" : "Não autenticada"}</strong>
            </div>
            <div className="crmHint">
              A estrutura atual continua compatível com a tabela `profiles` usada
              como base real de autorização do sistema.
            </div>
          </div>
        </section>
      </div>

      <div className="crmPanelGrid">
        <section className="crmPanel crmPanelSeparated">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Branding do cliente</h3>
              <p className="crmPanelDescription">
                Referências institucionais centralizadas para manter consistência
                visual na plataforma.
              </p>
            </div>
          </div>

          <div className="crmDataGrid">
            <div className="crmDataItem">
              <span className="crmDataLabel">App</span>
              <strong className="crmDataValue">{branding.appName}</strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">Cliente</span>
              <strong className="crmDataValue">{branding.clientName}</strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">Browser title</span>
              <strong className="crmDataValue">{branding.browserTitle}</strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">Resumo</span>
              <strong className="crmDataValue">{branding.clientSummary}</strong>
            </div>
          </div>
        </section>

        <section className="crmPanel crmPanelSeparated">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Preferências futuras</h3>
              <p className="crmPanelDescription">
                Espaço preparado para evoluções de ambiente e personalização do CRM.
              </p>
            </div>
          </div>

          <div className="crmInlineList">
            <div className="crmInlineListItem">Preferências de notificação da equipe.</div>
            <div className="crmInlineListItem">Padrões por cliente e por operação.</div>
            <div className="crmInlineListItem">Views dedicadas para clientes e corretores.</div>
          </div>
        </section>
      </div>

      <section className="crmSection">
        <div className="crmSectionHeader">
          <div>
            <span className="crmSectionEyebrow">Sessão</span>
            <h3 className="crmSectionTitle">Encerramento seguro</h3>
            <p className="crmSectionText">
              Saia do ambiente mantendo a organização do shell e a compatibilidade
              com o fluxo atual de autenticação.
            </p>
          </div>
        </div>

        <div className="crmButtonRow">
          <button className="btn" type="button" onClick={() => logout()}>
            {branding.logoutLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
