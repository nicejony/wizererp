import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Factory } from "lucide-react";

export default async function ProveedoresPage() {
  const supabase = createClient();
  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Factory className="text-violet-600" size={22} /> Proveedores
        </h1>
        <Link href="/proveedores/nuevo" className="btn-primary">
          + Nuevo proveedor
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">País</th>
            </tr>
          </thead>
          <tbody>
            {proveedores?.map((p) => (
              <tr key={p.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-medium">{p.nombre}</td>
                <td className="px-4 py-3">{p.contacto ?? "—"}</td>
                <td className="px-4 py-3">{p.telefono ?? "—"}</td>
                <td className="px-4 py-3">{p.email ?? "—"}</td>
                <td className="px-4 py-3">{p.pais ?? "—"}</td>
              </tr>
            ))}
            {(!proveedores || proveedores.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No hay proveedores cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

