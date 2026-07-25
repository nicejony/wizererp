import Link from "next/link";
import InventarioNuevoForm from "@/components/InventarioNuevoForm";

export default function InventarioNuevoPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/stock/inventario" className="text-xs text-neutral-400 hover:underline">
        ← Volver a Inventario
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Nuevo conteo de inventario</h1>
      <InventarioNuevoForm />
    </div>
  );
}
