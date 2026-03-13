import { hasSupabaseConfig } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";

export default function ConfiguracoesPage() {
  const { session, logout } = useAuth();

  return (
    <section className="configCard">
      <div className="configKicker">Conta</div>
      <h1>Configurações</h1>

      <div className="configGrid">
        <div className="configItem">
          <span>Usuário</span>
          <strong>{session?.user.email || "Nao identificado"}</strong>
        </div>
        <div className="configItem">
          <span>Auth</span>
          <strong>{hasSupabaseConfig ? "Supabase" : "Modo local"}</strong>
        </div>
      </div>

      <button className="configLogout" type="button" onClick={() => logout()}>
        Sair da aplicacao
      </button>
    </section>
  );
}
