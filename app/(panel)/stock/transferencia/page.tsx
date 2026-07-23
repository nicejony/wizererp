"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProductoVariante, Deposito } from "@/lib/types";

export default function TransferenciaStockPage() {
  const router = useRouter();
  const supabase = createClient();

  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [productoQuery, setProductoQuery] = useState("");
  const [productoResultados, setProductoResultados] = useState<ProductoVariante[]>([]);
  const [variante, setVariante] = useState<ProductoVariante | null>(null);

  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabase
      .from("depositos")
      .select("*")
      .eq("activo", true)
      .order("tipo")
      .then(({ data }) => setDepositos(data ?? []));
  }, []);

  useEffect(() => {
    if (productoQuery.length < 2) return setProductoResultados([]);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("producto_variantes")
        .select("*, producto:productos!inner(*)")
        .or(`nombre.ilike.%${productoQuery}%,codigo.ilike.%${productoQuery}%`, { foreignTable: "producto" })
        .eq("activo", true)
        .limit(8);
      setProductoResultados((data as any) ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [productoQuery]);

  async function confirmarTransferencia() {
    if (!variante || !origenId || !destinoId || origenId === destinoId) return;
    setGuardando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.rpc("transferir_stock", {
      p_variante_id: variante.id,
      p_deposito_origen_id: origenId,
      p_deposito_destino_id: destinoId,
      p_cantidad: Number(cantidad),
      p_usuario_id: user?.id ?? null,
      p_observaciones: observaciones || null,
    });

    setGuardando(false);
    if (error) {
      alert("Error al transferir: " + error.message);
      return;
    }
    router.push("/stock");
  }

  return (
    <div className="max-w-xl">
      <Link href="/stock" className="text-xs text-neutral-400 hover:underline">
        ← Volver a Stock
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Transferencia entre depósitos</h1>

      <div className="card space-y-4">
        <div>
          <span className="mb-2 block text-sm font-medium">Producto</span>
          {variante ? (
            <div className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
              <span className="font-medium text-violet-700">
                {variante.producto?.nombre} {variante.color && `— ${variante.color}`}
              </span>
              <button className="text-xs text-violet-600 underline" onClick={() => setVariante(null)}>
                cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                className="input"
                placeholder="Buscar por nombre o código..."
                value={productoQuery}
                onChange={(e) => setProductoQuery(e.target.value)}
              />
              {productoResultados.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-100 bg-white shadow-lg">
                  {productoResultados.map((v) => (
                    <button
                      key={v.id}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                      onClick={() => {
                        setVariante(v);
                        setProductoQuery("");
                        setProductoResultados([]);
                      }}
                    >
                      {v.producto?.nombre} {v.color && <span className="text-neutral-500">— {v.color}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium">Desde</span>
            <select className="input" value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {depositos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Hacia</span>
            <select className="input" value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {depositos
                .filter((d) => d.id !== origenId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <label>
          <span className="mb-1 block text-sm font-medium">Cantidad</span>
          <input
            type="number"
            min={1}
            className="input no-spinner"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">Observaciones</span>
          <textarea className="input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </label>

        <button
          onClick={confirmarTransferencia}
          disabled={!variante || !origenId || !destinoId || origenId === destinoId || guardando}
          className="btn-primary"
        >
          {guardando ? "Transfiriendo..." : "Confirmar transferencia"}
        </button>
      </div>
    </div>
  );
}
