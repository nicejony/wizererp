"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Deposito } from "@/lib/types";

interface FilaConteo {
  variante_id: string;
  nombre: string;
  color: string | null;
  stock_sistema: number;
  stock_real: number;
  costo_unitario: number;
}

export default function InventarioNuevoForm() {
  const router = useRouter();
  const supabase = createClient();

  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [depositoId, setDepositoId] = useState("");
  const [filas, setFilas] = useState<FilaConteo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    supabase
      .from("depositos")
      .select("*")
      .eq("activo", true)
      .order("tipo")
      .then(({ data }) => setDepositos(data ?? []));
  }, []);

  async function cargarProductos(depId: string) {
    setDepositoId(depId);
    if (!depId) return setFilas([]);
    setCargando(true);

    const { data: variantes } = await supabase
      .from("producto_variantes")
      .select("*, productos(nombre, costo)")
      .eq("activo", true)
      .order("producto_id");

    const varianteIds = (variantes ?? []).map((v) => v.id);
    const { data: stockRows } =
      varianteIds.length > 0
        ? await supabase.from("variante_stock").select("*").eq("deposito_id", depId).in("variante_id", varianteIds)
        : { data: [] };

    const stockMapa: Record<string, number> = {};
    for (const row of stockRows ?? []) stockMapa[row.variante_id] = row.stock;

    setFilas(
      (variantes ?? []).map((v: any) => ({
        variante_id: v.id,
        nombre: v.productos?.nombre ?? "—",
        color: v.color,
        stock_sistema: stockMapa[v.id] ?? 0,
        stock_real: stockMapa[v.id] ?? 0,
        costo_unitario: v.productos?.costo ?? 0,
      }))
    );
    setCargando(false);
  }

  function actualizarStockReal(idx: number, valor: number) {
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, stock_real: valor } : f)));
  }

  const conDiferencia = filas.filter((f) => f.stock_real !== f.stock_sistema);

  async function confirmarConteo() {
    setGuardando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: inventario, error } = await supabase
      .from("inventarios")
      .insert({ deposito_id: depositoId, usuario_id: user?.id ?? null, observaciones: observaciones || null, estado: "abierto" })
      .select()
      .single();

    if (error || !inventario) {
      setGuardando(false);
      alert("Error al crear el inventario: " + error?.message);
      return;
    }

    const itemsPayload = filas.map((f) => ({
      inventario_id: inventario.id,
      variante_id: f.variante_id,
      stock_sistema: f.stock_sistema,
      stock_real: f.stock_real,
      costo_unitario: f.costo_unitario,
    }));
    await supabase.from("inventario_items").insert(itemsPayload);

    const { error: errorCierre } = await supabase.rpc("cerrar_inventario", {
      p_inventario_id: inventario.id,
      p_usuario_id: user?.id ?? null,
    });

    setGuardando(false);
    if (errorCierre) {
      alert("El conteo se guardó pero hubo un error al aplicar el ajuste: " + errorCierre.message);
      return;
    }
    router.push("/stock/inventario");
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <label>
          <span className="mb-1 block text-sm font-medium">Depósito a contar</span>
          <select className="input" value={depositoId} onChange={(e) => cargarProductos(e.target.value)}>
            <option value="">Seleccionar...</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cargando && <p className="text-sm text-neutral-400">Cargando productos...</p>}

      {!cargando && filas.length > 0 && (
        <div className="card">
          <p className="mb-4 text-sm text-neutral-500">
            El "Stock sistema" es lo que la base dice que hay. Cargá el "Stock real" contado a mano — si coincide, dejalo
            igual. Al confirmar, ajusta automáticamente las diferencias.
          </p>

          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-neutral-100 text-left text-neutral-500">
                <tr>
                  <th className="py-2">Producto</th>
                  <th className="w-28 py-2">Stock sistema</th>
                  <th className="w-28 py-2">Stock real</th>
                  <th className="w-20 py-2 text-right">Dif.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, idx) => {
                  const dif = f.stock_real - f.stock_sistema;
                  return (
                    <tr key={f.variante_id} className="border-b border-neutral-50">
                      <td className="py-2 font-medium">
                        {f.nombre} {f.color && <span className="text-neutral-500">— {f.color}</span>}
                      </td>
                      <td className="py-2 text-neutral-500">{f.stock_sistema}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          className="input no-spinner py-1"
                          value={f.stock_real}
                          onChange={(e) => actualizarStockReal(idx, Number(e.target.value))}
                        />
                      </td>
                      <td
                        className={`py-2 text-right font-medium ${
                          dif > 0 ? "text-green-600" : dif < 0 ? "text-red-600" : "text-neutral-400"
                        }`}
                      >
                        {dif > 0 ? `+${dif}` : dif}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium">Observaciones</span>
            <textarea className="input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>

          <p className="mb-4 text-sm text-neutral-500">
            {conDiferencia.length === 0
              ? "No hay diferencias todavía."
              : `${conDiferencia.length} producto(s) con diferencia — se van a ajustar al confirmar.`}
          </p>

          <button onClick={confirmarConteo} disabled={guardando} className="btn-primary">
            {guardando ? "Guardando..." : "Confirmar conteo"}
          </button>
        </div>
      )}
    </div>
  );
}
