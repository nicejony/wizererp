"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ClienteEditor({ cliente }: { cliente: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: cliente.nombre ?? "",
    empresa: cliente.empresa ?? "",
    cuit: cliente.cuit ?? "",
    telefono: cliente.telefono ?? "",
    whatsapp: cliente.whatsapp ?? "",
    email: cliente.email ?? "",
    direccion: cliente.direccion ?? "",
    localidad: cliente.localidad ?? "",
    provincia: cliente.provincia ?? "",
        codigo_postal: cliente.codigo_postal ?? "",
    nombre_expreso: cliente.nombre_expreso ?? "",
    condicion_iva: cliente.condicion_iva ?? "Consumidor Final",
    observaciones: cliente.observaciones ?? "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function guardar() {
    setLoading(true);
    const { error } = await supabase
      .from("clientes")
      .update({
        nombre: form.nombre,
        empresa: form.empresa || null,
        cuit: form.cuit || null,
        telefono: form.telefono || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        direccion: form.direccion || null,
        localidad: form.localidad || null,
        provincia: form.provincia || null,
                codigo_postal: form.codigo_postal || null,
        nombre_expreso: form.nombre_expreso || null,
        condicion_iva: form.condicion_iva,
        observaciones: form.observaciones || null,
      })
      .eq("id", cliente.id);

    setLoading(false);
    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">Nombre *</span>
          <input required className="input" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Empresa</span>
          <input className="input" value={form.empresa} onChange={(e) => update("empresa", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">CUIT</span>
          <input className="input" value={form.cuit} onChange={(e) => update("cuit", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Teléfono</span>
          <input className="input" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">WhatsApp</span>
          <input className="input" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Dirección</span>
          <input className="input" value={form.direccion} onChange={(e) => update("direccion", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Localidad</span>
          <input className="input" value={form.localidad} onChange={(e) => update("localidad", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Provincia</span>
          <input className="input" value={form.provincia} onChange={(e) => update("provincia", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Código postal</span>
          <input className="input" value={form.codigo_postal} onChange={(e) => update("codigo_postal", e.target.value)} />
        </label>
        
          <label>
          <span className="mb-1 block text-sm font-medium">Expreso habitual</span>
          <input
            className="input"
            placeholder="Ej: Andreani, Vía Cargo..."
            value={form.nombre_expreso}
            onChange={(e) => update("nombre_expreso", e.target.value)}/>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Condición de IVA</span>
          <select className="input" value={form.condicion_iva} onChange={(e) => update("condicion_iva", e.target.value)}>
            <option value="Consumidor Final">Consumidor Final</option>
            <option value="Responsable Inscripto">Responsable Inscripto</option>
            <option value="Monotributo">Monotributo</option>
            <option value="Exento">Exento</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Observaciones</span>
        <textarea className="input" rows={2} value={form.observaciones} onChange={(e) => update("observaciones", e.target.value)} />
      </label>

      <div className="flex items-center gap-4">
        <button onClick={guardar} disabled={loading} className="btn-primary">
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
        <Link href={`/etiqueta/${cliente.id}`} className="text-sm font-medium text-violet-600 hover:underline">
          🖨️ Imprimir cartel de expreso
        </Link>
      </div>
    </div>
  );
}
