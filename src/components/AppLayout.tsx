import { Outlet } from "react-router-dom";

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
            <div className="appShellKicker">BOMM Urbanizadora</div>
            <h2>Plataforma Comercial</h2>
          </div>

          <div className="appShellUser">
            <span>{session?.user.email || "Usuário autenticado"}</span>
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
