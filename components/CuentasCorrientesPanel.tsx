"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { conMoneda, normalizarMoneda, Moneda } from "@/lib/monedas";

interface Entidad {
  id: string;
  nombre: string;
  saldoArs: number;
  saldoUsd: number;
}

function LineaSaldo({ monto, moneda }: { monto: number; moneda: Moneda }) {
  if (monto === 0) return null;
  return (
    <p className={`font-semibold ${monto > 0 ? "text-red-600" : "text-green-600"}`}>
      {conMoneda(Math.abs(monto), moneda)} {monto > 0 ? "(debe)" : "(a favor)"}
    </p>
  );
}

function SaldoEntidad({ e }: { e: Entidad }) {
  if (e.saldoArs === 0 && e.saldoUsd === 0) {
    return <p className="font-semibold text-neutral-400">{conMoneda(0, "ARS")}</p>;
  }
  return (
    <div className="text-right">
      <LineaSaldo monto={e.saldoArs} moneda="ARS" />
      <LineaSaldo monto={e.saldoUsd} moneda="USD" />
    </div>
  );
}

function MovimientoFila({ m }: { m: any }) {
  const router = useRouter();
  const supabase = createClient();
  const esManual = !m.referencia_tipo;
  const esCliente = m.entidad_tipo === "cliente";

  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(String(m.monto));
  const [fecha, setFecha] = useState(String(m.fecha ?? "").slice(0, 10));
  const [observaciones, setObservaciones] = useState(m.observaciones ?? "");
  const [moneda, setMoneda] = useState<Moneda>(normalizarMoneda(m.moneda));
  const [guardando, setGuardando] = useState(false);

  function empezarEdicion() {
    setMonto(String(m.monto));
    setFecha(String(m.fecha ?? "").slice(0, 10));
    setObservaciones(m.observaciones ?? "");
    setMoneda(normalizarMoneda(m.moneda));
    setEditando(true);
  }

  async function guardar() {
    if (esManual && (!monto || Number(monto) <= 0)) {
      alert("El monto tiene que ser mayor a 0.");
      return;
    }
    setGuardando(true);
    const cambios: any = { observaciones: observaciones || null };
    if (esManual) {
      cambios.monto = Number(monto);
      if (fecha) cambios.fecha = fecha;
      if (esCliente) cambios.moneda = moneda;
    }
    const { error } = await supabase.from("movimientos_cuenta").update(cambios).eq("id", m.id);
    setGuardando(false);
    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este movimiento? El saldo se va a recalcular. No se puede deshacer.")) return;
    setGuardando(true);
    const { error } = await supabase.from("movimientos_cuenta").delete().eq("id", m.id);
    setGuardando(false);
    if (error) {
      alert("Error al eliminar: " + error.message);
      return;
    }
    router.refresh();
  }

  if (editando) {
    return (
      <div className="space-y-2 rounded-lg border border-violet-100 bg-white p-2 no-print">
        {esManual ? (
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-neutral-500">Fecha</span>
              <input type="date" className="input py-1" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
            {esCliente && (
              <label className="w-28">
                <span className="mb-1 block text-neutral-500">Moneda</span>
                <select className="input py-1" value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
                  <option value="ARS">$ Pesos</option>
                  <option value="USD">U$D</option>
                </select>
              </label>
            )}
            <label className="flex-1">
              <span className="mb-1 block text-neutral-500">Monto</span>
              <input type="number" className="input no-spinner py-1" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </label>
          </div>
        ) : (
          <p className="text-neutral-400">
            Movimiento automático: solo se puede editar la descripción. Para cambiar el monto, revertí el documento de origen.
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-neutral-500">Descripción</span>
          <input className="input py-1" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </label>
        <div className="flex items-center gap-3">
          <button onClick={guardar} disabled={guardando} className="font-medium text-violet-600 hover:underline">
            {guardando ? "..." : "guardar"}
          </button>
          <button onClick={() => setEditando(false)} className="text-neutral-400 hover:underline">
            cancelar
          </button>
          {esManual && (
            <button onClick={eliminar} disabled={guardando} className="ml-auto text-red-500 hover:underline">
              eliminar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-neutral-500">
        {m.fecha} — {m.observaciones ?? m.referencia_tipo}
      </span>
      <span className="flex items-center gap-2">
        <span className={m.tipo === "cargo" ? "text-red-600" : "text-green-600"}>
          {m.tipo === "cargo" ? "+" : "-"}
          {conMoneda(Number(m.monto), m.moneda)}
        </span>
        <button onClick={empezarEdicion} className="text-neutral-400 hover:text-violet-600 no-print">
          editar
        </button>
      </span>
    </div>
  );
}

function Seccion({
  titulo,
  entidadTipo,
  entidades,
  labelPago,
  movimientosIniciales,
  abiertoId,
  abrirCobro,
  monto,
  setMonto,
  observaciones,
  setObservaciones,
  moneda,
  setMoneda,
  guardando,
  registrarPago,
  historialAbierto,
  setHistorialAbierto,
}: {
  titulo: string;
  entidadTipo: "cliente" | "proveedor";
  entidades: Entidad[];
  labelPago: string;
  movimientosIniciales: any[];
  abiertoId: string | null;
  abrirCobro: (e: Entidad) => void;
  monto: string;
  setMonto: (v: string) => void;
  observaciones: string;
  setObservaciones: (v: string) => void;
  moneda: Moneda;
  setMoneda: (v: Moneda) => void;
  guardando: boolean;
  registrarPago: (entidadTipo: "cliente" | "proveedor", entidadId: string) => void;
  historialAbierto: string | null;
  setHistorialAbierto: (id: string | null) => void;
}) {
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
                    <SaldoEntidad e={e} />
                    <button
                      onClick={() => abrirCobro(e)}
                      className="text-xs font-medium text-violet-600 hover:underline no-print"
                    >
                      {labelPago}
                    </button>
                  </div>
                </div>

                {abiertoId === e.id && (
                  <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-neutral-50 p-3 no-print">
                    {entidadTipo === "cliente" && (
                      <label className="w-28">
                        <span className="mb-1 block text-xs text-neutral-500">Moneda</span>
                        <select className="input py-1" value={moneda} onChange={(ev) => setMoneda(ev.target.value as Moneda)}>
                          <option value="ARS">$ Pesos</option>
                          <option value="USD">U$D</option>
                        </select>
                      </label>
                    )}
                    <label className="min-w-[7rem] flex-1">
                      <span className="mb-1 block text-xs text-neutral-500">Monto ({moneda === "USD" ? "U$D" : "$"})</span>
                      <input
                        type="number"
                        className="input no-spinner py-1"
                        value={monto}
                        onChange={(ev) => setMonto(ev.target.value)}
                      />
                    </label>
                    <label className="min-w-[7rem] flex-1">
                      <span className="mb-1 block text-xs text-neutral-500">Observaciones</span>
                      <input
                        className="input py-1"
                        value={observaciones}
                        onChange={(ev) => setObservaciones(ev.target.value)}
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
                  <div className="mt-2 space-y-2 rounded-lg bg-neutral-50 p-3 text-xs">
                    {historial.length === 0 && <p className="text-neutral-400">Sin movimientos.</p>}
                    {historial.map((m) => (
                      <MovimientoFila key={m.id} m={m} />
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

  function sumarDeuda(lista: Entidad[], campo: "saldoArs" | "saldoUsd") {
    return lista.filter((e) => e[campo] > 0).reduce((s, e) => s + e[campo], 0);
  }
  const totalACobrarArs = sumarDeuda(clientesConSaldo, "saldoArs");
  const totalACobrarUsd = sumarDeuda(clientesConSaldo, "saldoUsd");
  const totalAPagarArs = sumarDeuda(proveedoresConSaldo, "saldoArs");
  const totalAPagarUsd = sumarDeuda(proveedoresConSaldo, "saldoUsd");

  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [monto, setMonto] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("ARS");
  const [guardando, setGuardando] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState<string | null>(null);

  // Al abrir el cobro, la moneda arranca en la de la deuda del cliente (dólares si solo debe dólares)
  function abrirCobro(e: Entidad) {
    if (abiertoId === e.id) {
      setAbiertoId(null);
      return;
    }
    setAbiertoId(e.id);
    setMoneda(e.saldoUsd > 0 && e.saldoArs <= 0 ? "USD" : "ARS");
  }

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
      moneda: entidadTipo === "cliente" ? moneda : "ARS",
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
    setMoneda("ARS");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm text-neutral-500">Total a cobrar (clientes)</p>
          <p className="text-2xl font-semibold text-red-600">{conMoneda(totalACobrarArs, "ARS")}</p>
          {totalACobrarUsd > 0 && <p className="text-xl font-semibold text-red-600">{conMoneda(totalACobrarUsd, "USD")}</p>}
        </div>
        <div className="card">
          <p className="text-sm text-neutral-500">Total a pagar (proveedores)</p>
          <p className="text-2xl font-semibold text-red-600">{conMoneda(totalAPagarArs, "ARS")}</p>
          {totalAPagarUsd > 0 && <p className="text-xl font-semibold text-red-600">{conMoneda(totalAPagarUsd, "USD")}</p>}
        </div>
      </div>
      <Seccion
        titulo="Clientes"
        entidadTipo="cliente"
        entidades={clientesConSaldo}
        labelPago="Registrar cobro"
        movimientosIniciales={movimientosIniciales}
        abiertoId={abiertoId}
        abrirCobro={abrirCobro}
        monto={monto}
        setMonto={setMonto}
        observaciones={observaciones}
        setObservaciones={setObservaciones}
        moneda={moneda}
        setMoneda={setMoneda}
        guardando={guardando}
        registrarPago={registrarPago}
        historialAbierto={historialAbierto}
        setHistorialAbierto={setHistorialAbierto}
      />
      <Seccion
        titulo="Proveedores"
        entidadTipo="proveedor"
        entidades={proveedoresConSaldo}
        labelPago="Registrar pago"
        movimientosIniciales={movimientosIniciales}
        abiertoId={abiertoId}
        abrirCobro={abrirCobro}
        monto={monto}
        setMonto={setMonto}
        observaciones={observaciones}
        setObservaciones={setObservaciones}
        moneda={moneda}
        setMoneda={setMoneda}
        guardando={guardando}
        registrarPago={registrarPago}
        historialAbierto={historialAbierto}
        setHistorialAbierto={setHistorialAbierto}
      />
    </div>
  );
}
