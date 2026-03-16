import { Navigate, Outlet, useLocation } from "react-router-dom";

import type { UserRole } from "../types/user";
import { useAuth } from "./AuthProvider";

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
  redirectTo?: string;
};

export default function ProtectedRoute({
  allowedRoles,
  redirectTo = "/",
}: ProtectedRouteProps) {
  const { session, profile, loading, profileLoading, profileResolved } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="appShellLoading">Carregando sessao...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && (profileLoading || !profileResolved)) {
    return <div className="appShellLoading">Carregando perfil...</div>;
  }

  if (profile && !profile.ativo) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && (!profile || !allowedRoles.includes(profile.role))) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
