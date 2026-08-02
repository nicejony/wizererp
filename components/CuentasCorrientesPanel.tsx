"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatearMoneda } from "@/lib/format";

interface Entidad {
  id: string;
  nombre: string;
  saldo: number;
}

export default function CuentasCorrientesPanel({
  clientesConSaldo,
  proveedoresConSaldo,
  movimientosIniciales,
}: {
  clientesConSaldo: Entidad[];
  proveedoresConSaldo: Entidad[];
  movimientosIniciales: any[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const totalACobrar = clientesConSaldo.filter((c) => c.saldo > 0).reduce((s, c) => s + c.saldo, 0);
  const totalAPagar = proveedoresConSaldo.filter((p) => p.saldo > 0).reduce((s, p) => s + p.saldo, 0);

  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [monto, setMonto] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState<string | null>(null);

  async function registrarPago(entidadTipo: "cliente" | "proveedor", entidadId: string) {
    if (!monto || Number(monto) <= 0) return;
    setGuardando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("movimientos_cuenta").insert({
      entidad_tipo: entidadTipo,
      entidad_id: entidadId,
      tipo: "pago",
      monto: Number(monto),
      observaciones: observaciones || null,
      usuario_id: user?.id ?? null,
    });

    setGuardando(false);
    if (error) {
      alert("Error al registrar: " + error.message);
      return;
    }
    setAbiertoId(null);
    setMonto("");
    setObservaciones("");
    router.refresh();
  }

  function Seccion({ titulo, entidadTipo, entidades, labelPago }: { titulo: string; entidadTipo: "cliente" | "proveedor"; entidades: Entidad[]; labelPago: string }) {
    return (
      <div className="card">
        <p className="mb-4 text-sm font-medium text-neutral-500">{titulo}</p>
        {entidades.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin saldos pendientes.</p>
        ) : (
          <div className="space-y-2">
            {entidades.map((e) => {
              const historial = movimientosIniciales.filter((m) => m.entidad_id === e.id);
              return (
                <div key={e.id} className="border-b border-neutral-50 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{e.nombre}</p>
                      <div className="flex gap-3 no-print">
                        <button
                          onClick={() => setHistorialAbierto(historialAbierto === e.id ? null : e.id)}
                          className="text-xs text-neutral-400 hover:underline"
                        >
                          {historialAbierto === e.id ? "ocultar historial" : "ver historial"}
                        </button>
                        <Link href={`/cuentas-corrientes/${entidadTipo}/${e.id}`} className="text-xs text-violet-600 hover:underline">
                          ficha / imprimir
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold ${
                          e.saldo === 0 ? "text-neutral-400" : e.saldo > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        ${Math.abs(e.saldo).toFixed(2)} {e.saldo !== 0 && (e.saldo > 0 ? "(debe)" : "(a favor)")}
                      </span>
                      <button
                        onClick={() => setAbiertoId(abiertoId === e.id ? null : e.id)}
                        className="text-xs font-medium text-violet-600 hover:underline no-print"
                      >
                        {labelPago}
                      </button>
                    </div>
                  </div>

                  {abiertoId === e.id && (
                    <div className="mt-2 flex items-end gap-2 rounded-lg bg-neutral-50 p-3 no-print">
                      <label className="flex-1">
                        <span className="mb-1 block text-xs text-neutral-500">Monto</span>
                        <input
                          type="number"
                          className="input no-spinner py-1"
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                        />
                      </label>
                      <label className="flex-1">
                        <span className="mb-1 block text-xs text-neutral-500">Observaciones</span>
                        <input
                          className="input py-1"
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                        />
                      </label>
                      <button
                        onClick={() => registrarPago(entidadTipo, e.id)}
                        disabled={guardando}
                        className="btn-primary whitespace-nowrap py-1.5"
                      >
                        {guardando ? "..." : "Confirmar"}
                      </button>
                    </div>
                  )}

                  {historialAbierto === e.id && (
                    <div className="mt-2 space-y-1 rounded-lg bg-neutral-50 p-3 text-xs">
                      {historial.length === 0 && <p className="text-neutral-400">Sin movimientos.</p>}
                      {historial.map((m) => (
                        <div key={m.id} className="flex justify-between">
                          <span className="text-neutral-500">
                            {m.fecha} — {m.observaciones ?? m.referencia_tipo}
                          </span>
                          <span className={m.tipo === "cargo" ? "text-red-600" : "text-green-600"}>
                            {m.tipo === "cargo" ? "+" : "-"}${Number(m.monto).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm text-neutral-500">Total a cobrar (clientes)</p>
          <p className="text-2xl font-semibold text-red-600">${totalACobrar.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-neutral-500">Total a pagar (proveedores)</p>
          <p className="text-2xl font-semibold text-red-600">${totalAPagar.toFixed(2)}</p>
        </div>
      </div>
      <Seccion titulo="Clientes" entidadTipo="cliente" entidades={clientesConSaldo} labelPago="Registrar cobro" />
      <Seccion titulo="Proveedores" entidadTipo="proveedor" entidades={proveedoresConSaldo} labelPago="Registrar pago" />
    </div>
  );
}
