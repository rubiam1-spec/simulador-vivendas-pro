import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../components/AuthProvider";
import { branding } from "../config/branding";
import { hasSupabaseConfig } from "../lib/supabase";
import { LogoRRCRM } from "../components/LogoRRCRM";

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
    return <Navigate to={destino || "/"} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro("");

    try {
      await login(email, senha);
      navigate(destino || "/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível autenticar.";
      setErro(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">
      <div className="loginCard">

        {/* Logo centralizado no topo */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 32,
          paddingBottom: 28,
          borderBottom: "1px solid rgba(80, 130, 255, 0.12)",
        }}>
          <LogoRRCRM variant="full" height={54} theme="dark" />
        </div>

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
              placeholder="você@bomm.com.br"
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

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 20px',
              background: loading
                ? 'rgba(48, 112, 240, 0.5)'
                : 'linear-gradient(135deg, #0e3fa0, #3070f0)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 200ms ease',
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
