import { NavLink } from "react-router-dom";

import { branding } from "../config/branding";
import { getNavigationSections } from "../config/navigation";
import { useAuth } from "./AuthProvider";

type SidebarProps = {
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
};

function SidebarIcon({ label }: { label: string }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (label === "Dashboard") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="13" width="7" height="8" rx="1.5" />
      </svg>
    );
  }

  if (label === "Negociações") {
    return (
      <svg {...commonProps}>
        <path d="M5 7h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" />
        <path d="M9 7V5a3 3 0 1 1 6 0v2" />
        <path d="M8 12h8" />
      </svg>
    );
  }

  if (label === "Simulador") {
    return (
      <svg {...commonProps}>
        <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
        <path d="M8.5 7.5h7" />
        <path d="M8.5 12h2" />
        <path d="M13 12h2.5" />
        <path d="M8.5 16.5h2" />
        <path d="M13 16.5h2.5" />
      </svg>
    );
  }

  if (label === "Configurações") {
    return (
      <svg {...commonProps}>
        <path d="M12 3.5v3" />
        <path d="M12 17.5v3" />
        <path d="M4.93 4.93l2.12 2.12" />
        <path d="M16.95 16.95l2.12 2.12" />
        <path d="M3.5 12h3" />
        <path d="M17.5 12h3" />
        <path d="M4.93 19.07l2.12-2.12" />
        <path d="M16.95 7.05l2.12-2.12" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  }

  if (label === "Clientes") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (label === "Corretores") {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="8.5" r="3" />
        <circle cx="16.5" cy="9.5" r="2.5" />
        <path d="M3.5 19a6 6 0 0 1 11 0" />
        <path d="M14.5 19a4.8 4.8 0 0 1 6 0" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export default function Sidebar({
  mobileMenuOpen,
  onCloseMobileMenu,
}: SidebarProps) {
  const { profile, profileResolved } = useAuth();
  const sections = getNavigationSections(profile, profileResolved);

  return (
    <>
      <button
        type="button"
        className={[
          "appSidebarBackdrop",
          mobileMenuOpen ? "isVisible" : "",
        ].join(" ").trim()}
        aria-label="Fechar menu"
        onClick={onCloseMobileMenu}
      />

      <aside
        className={[
          "appSidebar",
          mobileMenuOpen ? "isMobileOpen" : "",
        ].join(" ").trim()}
        aria-hidden={!mobileMenuOpen && undefined}
      >
        <div className="appSidebarBrand">
          <div className="appSidebarKicker">{branding.sidebarSubtitle}</div>
          <h1>{branding.sidebarTitle}</h1>
          <p>{branding.sidebarDescription}</p>
          <div className="appSidebarClient">
            <span>{branding.sidebarClientLabel}</span>
            <strong>{branding.clientLabel}</strong>
          </div>
        </div>

        <div id="app-sidebar-nav" className="appSidebarSections">
          {sections.map((section) => (
            <div key={section.label} className="appSidebarSection">
              <div className="appSidebarSectionTitle">{section.label}</div>

              <nav className="appSidebarNav" aria-label={section.label}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobileMenu}
                    className={({ isActive }) =>
                      [
                        "appSidebarLink",
                        isActive ? "isActive" : "",
                        item.badge ? "isSoon" : "",
                      ]
                        .join(" ")
                        .trim()
                    }
                  >
                    <span className="appSidebarLinkMain">
                      <span className="appSidebarIcon">
                        <SidebarIcon label={item.label} />
                      </span>
                      <span>{item.label}</span>
                    </span>
                    {item.badge ? (
                      <span className="appSidebarSoonBadge">{item.badge}</span>
                    ) : null}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="appSidebarFooter">
          <span>Workspace atual</span>
          <strong>{branding.appName}</strong>
        </div>
      </aside>
    </>
  );
}
