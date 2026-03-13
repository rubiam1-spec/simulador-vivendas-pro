import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import AppLayout from "./components/AppLayout";
import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { branding } from "./config/branding";
import CentralNegociacoesPage from "./pages/CentralNegociacoesPage";
import ConfiguracoesPage from "./pages/Configuracoes";
import DashboardPage from "./pages/Dashboard";
import Login from "./pages/Login";
import Simulador from "./pages/Simulador";

export default function App() {
  useEffect(() => {
    document.title = branding.fullTitle;

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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/negociacoes"
                element={<CentralNegociacoesPage />}
              />
              <Route path="/simulador" element={<Simulador />} />
              <Route
                path="/configuracoes"
                element={<ConfiguracoesPage />}
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
