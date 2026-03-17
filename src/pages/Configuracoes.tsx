import { branding } from "../config/branding";
import { useAuth } from "../components/AuthProvider";
import { hasSupabaseConfig } from "../lib/supabase";

export default function ConfiguracoesPage() {
  const { session, profile, logout } = useAuth();

  return (
    <div className="crmStack crmSettingsStack">
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
                {profile?.role || "Não definido"}
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
              <h3 className="crmPanelTitle">Autenticacao</h3>
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
              <span className="crmBadge isMuted">Sessao</span>
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
            <span className="crmSectionEyebrow">Sessao</span>
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
