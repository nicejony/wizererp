import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

export default async function OrdenesCompraPage() {
  const supabase = createClient();
  const { data: ordenes } = await supabase
    .from("ordenes_compra")
    .select("*, proveedores(nombre), ordenes_compra_items(cantidad)")
    .order("created_at", { ascending: false });

  // Agrupadas por proveedor; dentro de cada uno, las pendientes primero
  const grupos: Record<string, { nombre: string; ordenes: any[] }> = {};
  for (const o of ordenes ?? []) {
    const clave = o.proveedor_id ?? "sin-proveedor";
    if (!grupos[clave]) grupos[clave] = { nombre: o.proveedores?.nombre ?? "Sin proveedor", ordenes: [] };
    grupos[clave].ordenes.push(o);
  }
  const listaGrupos = Object.values(grupos).sort((a, b) => a.nombre.localeCompare(b.nombre));
  for (const g of listaGrupos) {
    g.ordenes.sort((a, b) => (a.estado === b.estado ? 0 : a.estado === "pendiente" ? -1 : 1));
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ClipboardList className="text-violet-600" size={22} /> Órdenes de compra
        </h1>
        <Link href="/ordenes-compra/nuevo" className="btn-primary">
          + Nueva orden
        </Link>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Listas de compra a proveedores, como ayuda memoria. No afectan el stock ni las cuentas corrientes.
      </p>

      {listaGrupos.length === 0 && (
        <div className="card py-10 text-center text-neutral-400">Todavía no hay órdenes de compra.</div>
      )}

      <div className="space-y-4">
        {listaGrupos.map((g) => {
          const pendientes = g.ordenes.filter((o) => o.estado === "pendiente").length;
          return (
            <div key={g.nombre} className="card">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-violet-700">{g.nombre}</p>
                {pendientes > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                    {pendientes} pendiente{pendientes > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {g.ordenes.map((o) => {
                  const articulos = o.ordenes_compra_items?.length ?? 0;
                  const unidades = (o.ordenes_compra_items ?? []).reduce((s: number, i: any) => s + Number(i.cantidad), 0);
                  return (
                    <Link
                      key={o.id}
                      href={`/ordenes-compra/${o.id}`}
                      className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm hover:bg-neutral-100"
                    >
                      <span>
                        <span className="font-mono text-xs text-neutral-500">#{o.numero}</span>{" "}
                        <span className="text-neutral-500">{o.fecha}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-neutral-500">
                          {articulos} artículo(s) · {unidades} u.
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            o.estado === "pedida" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {o.estado === "pedida" ? "Pedida" : "Pendiente"}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
