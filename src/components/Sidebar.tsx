import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/negociacoes", label: "Negociações" },
  { to: "/simulador", label: "Simulador" },
  { to: "/configuracoes", label: "Configurações" },
];

export default function Sidebar() {
  return (
    <aside className="appSidebar">
      <div className="appSidebarBrand">
        <div className="appSidebarKicker">BOMM Urbanizadora</div>
        <h1>Simulador Pro</h1>
        <p>Operação comercial, negociações e proposta institucional.</p>
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
