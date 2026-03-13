import { Outlet } from "react-router-dom";

import { branding } from "../config/branding";
import { hasSupabaseConfig } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const { session } = useAuth();

  return (
    <div className="appShell">
      <Sidebar />

      <div className="appShellMain">
        <header className="appShellTopbar">
          <div>
            <div className="appShellKicker">{branding.appHeaderSubtitle}</div>
            <h2>{branding.appHeaderTitle}</h2>
          </div>

          <div className="appShellUser">
            <span>{session?.user.email || "Usuario autenticado"}</span>
            <small>{hasSupabaseConfig ? "Supabase Auth" : "Modo local"}</small>
          </div>
        </header>

        <main className="appShellContent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
