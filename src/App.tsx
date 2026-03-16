import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import AppLayout from "./components/AppLayout";
import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { branding } from "./config/branding";
import AcessosPage from "./pages/Acessos";
import CentralNegociacoesPage from "./pages/CentralNegociacoesPage";
import ClientesPage from "./pages/Clientes";
import ConfiguracoesPage from "./pages/Configuracoes";
import CorretoresPage from "./pages/Corretores";
import DashboardPage from "./pages/Dashboard";
import Login from "./pages/Login";
import Simulador from "./pages/Simulador";
import { useAuth } from "./components/AuthProvider";

function HomeRedirect() {
  const { profile, profileLoading, profileResolved } = useAuth();

  if (profileLoading || !profileResolved) {
    return <div className="appShellLoading">Carregando perfil...</div>;
  }

  if (profile?.role === "corretor") {
    return <Navigate to="/simulador" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  useEffect(() => {
    document.title = branding.browserTitle;

    const favicon =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
      document.createElement("link");

    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = branding.faviconPath;

    if (!favicon.parentNode) {
      document.head.appendChild(favicon);
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route
                element={<ProtectedRoute allowedRoles={["admin", "gestor"]} redirectTo="/" />}
              >
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              <Route
                path="/negociacoes"
                element={<CentralNegociacoesPage />}
              />
              <Route path="/simulador" element={<Simulador />} />
              <Route
                element={<ProtectedRoute allowedRoles={["admin"]} />}
              >
                <Route path="/acessos" element={<AcessosPage />} />
              </Route>
              <Route
                path="/configuracoes"
                element={<ConfiguracoesPage />}
              />
              <Route
                element={<ProtectedRoute allowedRoles={["admin", "gestor"]} redirectTo="/" />}
              >
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/corretores" element={<CorretoresPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
