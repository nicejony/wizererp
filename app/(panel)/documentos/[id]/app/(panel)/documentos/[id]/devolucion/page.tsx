import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import DevolucionForm from "@/components/DevolucionForm";

export default async function DevolucionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: venta } = await supabase.from("documentos").select("*").eq("id", params.id).single();
  if (!venta || venta.tipo !== "venta") notFound();

  const { data: itemsRaw } = await supabase
    .from("documento_items")
    .select("*, producto_variantes(*, productos(nombre))")
    .eq("documento_id", params.id);

  const items = (itemsRaw ?? []).map((i: any) => ({
    id: i.id,
    variante_id: i.variante_id,
    cantidad: Number(i.cantidad),
    precio_unitario: Number(i.precio_unitario),
    costo_unitario: Number(i.costo_unitario),
    descuento_porcentaje: Number(i.descuento_porcentaje),
    nombre: i.producto_variantes?.productos?.nombre ?? "—",
    color: i.producto_variantes?.color ?? null,
  }));

  return (
    <div className="max-w-2xl">
      <Link href={`/documentos/${venta.id}`} className="text-xs text-neutral-400 hover:underline">
        ← Volver a la venta
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Devolución de Venta #{venta.numero}</h1>
      <DevolucionForm venta={venta} items={items} />
    </div>
  );
}