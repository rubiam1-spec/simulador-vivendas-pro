import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../components/AuthProvider";
import { branding } from "../config/branding";
import { hasSupabaseConfig } from "../lib/supabase";

export default function Login() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const destino = (location.state as { from?: { pathname?: string } } | null)
    ?.from?.pathname;

  if (session) {
    return <Navigate to={destino || "/dashboard"} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro("");

    try {
      await login(email, senha);
      navigate(destino || "/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel autenticar.";
      setErro(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginKicker">{branding.sidebarSubtitle}</div>
        <h1>{branding.loginTitle}</h1>
        <p>{branding.loginSubtitle}</p>

        {!hasSupabaseConfig ? (
          <div className="loginAlert">
            Modo local ativo. Configure VITE_SUPABASE_URL e
            VITE_SUPABASE_ANON_KEY para usar Supabase Auth.
          </div>
        ) : null}

        <form className="loginForm" onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@bomm.com.br"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Sua senha"
              required
            />
          </label>

          {erro ? <div className="loginError">{erro}</div> : null}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
