import { NavLink } from "react-router-dom";

import { branding } from "../config/branding";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/negociacoes", label: "Negociacoes" },
  { to: "/simulador", label: "Simulador" },
  { to: "/configuracoes", label: "Configuracoes" },
];

export default function Sidebar() {
  return (
    <aside className="appSidebar">
      <div className="appSidebarBrand">
        <div className="appSidebarKicker">{branding.sidebarSubtitle}</div>
        <h1>{branding.sidebarTitle}</h1>
        <p>Operacao comercial, negociacoes, simulacoes e documentos.</p>
      </div>

      <nav className="appSidebarNav" aria-label="Menu principal">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              ["appSidebarLink", isActive ? "isActive" : ""].join(" ").trim()
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
