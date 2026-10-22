import { NavLink, useNavigate } from "react-router-dom";
import {
  Car,
  Bath,
  LogOut,
  ChevronRight,
  X,
  ExternalLink,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";

const NAV = [
  { to: "/cocheras", label: "Cocheras", icon: Car },
  { to: "/hidromasaje", label: "Hidromasaje", icon: Bath },
];

// Menú lateral (mismo diseño que Obras). En el celular se esconde y se abre
// con el botón de la barra de arriba.
export default function Sidebar({ isOpen, onClose, tema, onToggleTema }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {}
    logout();
    navigate("/login", { replace: true });
    toast.success("Sesión cerrada");
  }

  return (
    <aside
      className={`
      fixed inset-y-0 left-0 z-40 w-56
      bg-bg-secondary border-r border-border-subtle
      flex flex-col
      transition-transform duration-200 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
      lg:translate-x-0
    `}
    >
      <div className="px-4 pb-5 border-b border-border-subtle pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/15 border border-gold/25 shrink-0 flex items-center justify-center">
            <Building2 size={18} className="text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm font-semibold text-text-primary tracking-wide leading-none">
              Recepción
            </p>
            <p className="text-[10px] text-gold tracking-widest uppercase mt-1">
              Edificio
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2.5 -mr-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              isActive ? "sidebar-item-active" : "sidebar-item"
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight size={14} className="shrink-0 opacity-60" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-border-subtle pt-3">
        <button onClick={onToggleTema} className="sidebar-item w-full">
          <svg
            width="34"
            height="20"
            viewBox="0 0 34 20"
            fill="none"
            className="shrink-0"
          >
            <rect
              width="34"
              height="20"
              rx="10"
              fill={tema === "dark" ? "currentColor" : "transparent"}
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-secondary"
            />
            <circle
              cx={tema === "dark" ? "24" : "10"}
              cy="10"
              r="7"
              fill={tema === "dark" ? "white" : "currentColor"}
              className="text-text-secondary"
            />
          </svg>
          <span>{tema === "dark" ? "Modo claro" : "Modo oscuro"}</span>
        </button>

        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-gold">
              {user?.name?.[0] ?? "U"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-text-primary truncate">
              {user?.name}
            </p>
            <p className="text-[10px] text-text-muted truncate">
              {user?.email}
            </p>
          </div>
        </div>

        {/* <a href={import.meta.env.VITE_PORTAL_URL || 'http://localhost:5174'} className="sidebar-item w-full">
          <ExternalLink size={15} />
          <span>Volver al portal</span>
        </a> */}

        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-status-alert hover:text-status-alert hover:bg-status-alert/10"
        >
          <LogOut size={15} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
