import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import AppLayout from "./components/AppLayout";
import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import CentralNegociacoesPage from "./pages/CentralNegociacoesPage";
import ConfiguracoesPage from "./pages/Configuracoes";
import DashboardPage from "./pages/Dashboard";
import Login from "./pages/Login";
import Simulador from "./pages/Simulador";

export default function App() {
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
