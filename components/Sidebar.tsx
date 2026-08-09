"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Truck,
  Users,
  Package,
  Boxes,
  ShoppingBag,
  Factory,
  BarChart3,
  Settings,
  Menu,
  X,
  RotateCcw,
  Wallet,
  Landmark,
  Sun,
  Moon,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/devoluciones", label: "Devoluciones", icon: RotateCcw },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/remitos", label: "Remitos", icon: Truck },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/compras", label: "Compras", icon: ShoppingBag },
  { href: "/proveedores", label: "Proveedores", icon: Factory },
  { href: "/cuentas-corrientes", label: "Cuentas Corrientes", icon: Wallet },
  { href: "/administracion", label: "Administración", icon: Landmark },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

function Logo() {
  return (
    <div>
      <span className="logo-glow text-lg font-bold tracking-tight text-violet-600">WIZER</span>
      <span className="text-lg font-light text-neutral-400"> ERP</span>
    </div>
  );
}

function BotonModoOscuro() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem("wizer-tema") === "dark";
    setOscuro(guardado);
    document.documentElement.classList.toggle("dark", guardado);
  }, []);

  function alternar() {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    document.documentElement.classList.toggle("dark", nuevo);
    localStorage.setItem("wizer-tema", nuevo ? "dark" : "light");
  }

  return (
    <button
      onClick={alternar}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50"
      aria-label="Cambiar modo oscuro"
    >
      {oscuro ? <Sun size={17} /> : <Moon size={17} />}
      {oscuro ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavLinks = (
    <nav className="flex-1 space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-violet-50 font-medium text-violet-700"
                : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Barra superior en mobile */}
      <header className="no-print flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-50"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Overlay + drawer en mobile */}
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-screen w-64 flex-col bg-white px-3 py-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo />
              <button onClick={() => setOpen(false)} className="p-1 text-neutral-500">
                <X size={20} />
              </button>
            </div>
            {NavLinks}
            <div className="mt-2 border-t border-neutral-100 pt-2">
              <BotonModoOscuro />
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar fija en desktop */}
      <aside className="no-print hidden h-screen w-60 flex-col border-r border-neutral-100 bg-white px-3 py-5 lg:flex">
        <div className="mb-6 px-2">
          <Logo />
        </div>
        {NavLinks}
        <div className="mt-2 border-t border-neutral-100 pt-2">
          <BotonModoOscuro />
        </div>
      </aside>
    </>
  );
}
