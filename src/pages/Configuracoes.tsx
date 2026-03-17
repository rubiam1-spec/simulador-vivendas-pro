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
                Informacoes principais do usuario autenticado no RR CRM.
              </p>
            </div>
          </div>

          <div className="crmDataGrid">
            <div className="crmDataItem">
              <span className="crmDataLabel">Nome</span>
              <strong className="crmDataValue">
                {profile?.nome || "Nao informado"}
              </strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">E-mail</span>
              <strong className="crmDataValue">
                {session?.user.email || "Nao identificado"}
              </strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">Perfil</span>
              <strong className="crmDataValue">
                {profile?.role || "Nao definido"}
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
              <strong>{session ? "Ativa" : "Nao autenticada"}</strong>
            </div>
            <div className="crmHint">
              A estrutura atual continua compativel com a tabela `profiles` usada
              como base real de autorizacao do sistema.
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
                Referencias institucionais centralizadas para manter consistencia
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
              <h3 className="crmPanelTitle">Preferencias futuras</h3>
              <p className="crmPanelDescription">
                Espaco preparado para evolucoes de ambiente e personalizacao do CRM.
              </p>
            </div>
          </div>

          <div className="crmInlineList">
            <div className="crmInlineListItem">Preferencias de notificacao da equipe.</div>
            <div className="crmInlineListItem">Padroes por cliente e por operacao.</div>
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
              Saia do ambiente mantendo a organizacao do shell e a compatibilidade
              com o fluxo atual de autenticacao.
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
