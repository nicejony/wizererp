"use client";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatearMoneda } from "@/lib/format";
interface Props {
  ventasPorMes: { mes: string; ventas: number; margen: number }[];
  topProductos: { nombre: string; cantidad: number }[];
  ventasTotal: number;
  margenTotal: number;
  valorStock: number;
}

export default function ReportesCharts({ ventasPorMes, topProductos, ventasTotal, margenTotal, valorStock }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-neutral-500">Ventas (últimos 6 meses)</p>
                    <p className="text-2xl font-semibold text-violet-700">${formatearMoneda(ventasTotal)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-neutral-500">Margen (últimos 6 meses)</p>
          <p className="text-2xl font-semibold text-green-600">${formatearMoneda(margenTotal)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-neutral-500">Valor de stock (a costo)</p>
          <p className="text-2xl font-semibold text-neutral-700">${formatearMoneda(valorStock)}</p>
        </div>
      </div>

      <div className="card">
        <p className="mb-4 text-sm font-medium text-neutral-500">Ventas y margen por mes</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ventasPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="ventas" stroke="#7c3aed" strokeWidth={2} name="Ventas" />
              <Line type="monotone" dataKey="margen" stroke="#16a34a" strokeWidth={2} name="Margen" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <p className="mb-4 text-sm font-medium text-neutral-500">Top 5 productos más vendidos (unidades)</p>
        {topProductos.length === 0 ? (
          <p className="text-sm text-neutral-400">Todavía no hay ventas registradas.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductos} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="nombre" type="category" width={120} fontSize={12} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
