import { NavLink } from "react-router-dom";

import { branding } from "../config/branding";
import { getNavigationSections } from "../config/navigation";
import { useAuth } from "./AuthProvider";

type SidebarProps = {
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
};

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
                    <span>{item.label}</span>
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
