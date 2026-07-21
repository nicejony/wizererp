"use client";

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
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/remitos", label: "Remitos", icon: Truck },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/compras", label: "Compras", icon: ShoppingBag },
  { href: "/proveedores", label: "Proveedores", icon: Factory },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-neutral-100 bg-white px-3 py-5">
      <div className="mb-6 px-2">
        <span className="text-lg font-bold tracking-tight text-violet-600">WIZER</span>
        <span className="text-lg font-light text-neutral-400"> ERP</span>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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
    </aside>
  );
}
