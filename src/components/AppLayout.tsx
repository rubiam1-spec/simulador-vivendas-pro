import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { getPageMeta } from "../config/pageMeta";
import { useAuth } from "./AuthProvider";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const { session, profile } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageMeta = getPageMeta(location.pathname);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.title = pageMeta.browserTitle;
  }, [pageMeta.browserTitle]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    function handleResize() {
      if (window.innerWidth > 1024) {
        setMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const roleLabel = { admin: "Administrador", gestor: "Gestor", corretor: "Corretor", consultora: "Consultora" };
  const nomeUsuario = profile?.nomeExibicao ?? profile?.nome ?? session?.user.email ?? "Usuário";
  const cargoUsuario = profile?.cargo ?? (profile?.role ? (roleLabel[profile.role as keyof typeof roleLabel] ?? profile.role) : "");

  return (
    <div className="appShell">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      <div className="appShellMain">
        <header className="appShellTopbar">
          <div className="appShellTopbarPrimary">
            <button
              type="button"
              className="appMobileMenuButton"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="app-sidebar-nav"
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              <span />
              <span />
              <span />
            </button>

            <div className="appShellTitleRow">
              <div className="appShellTitleMeta">
                <div className="appShellKicker">{pageMeta.eyebrow}</div>
                <h2>{pageMeta.title}</h2>
                <p>{pageMeta.description}</p>
              </div>

              {pageMeta.badge ? (
                <span className="appShellPageBadge">{pageMeta.badge}</span>
              ) : null}
            </div>
          </div>

          <div className="appShellUser">
            <span>{nomeUsuario}{cargoUsuario ? ` / ${cargoUsuario}` : ""}</span>
          </div>
        </header>

        <main className="appShellContent">
          <div className="appShellViewport">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
