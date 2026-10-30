import { formatearMoneda } from "@/lib/format";

export type Moneda = "ARS" | "USD";

export function normalizarMoneda(m?: string | null): Moneda {
  return m === "USD" ? "USD" : "ARS";
}

export function simboloMoneda(m?: string | null): string {
  return m === "USD" ? "U$D " : "$";
}

export function conMoneda(monto: number, m?: string | null): string {
  return `${simboloMoneda(m)}${formatearMoneda(monto)}`;
}

export interface SaldoPorMoneda {
  ars: number;
  usd: number;
}

// Suma cargos (+) y pagos (-) de cada cuenta, llevando un saldo aparte por moneda
export function calcularSaldos(movimientos: any[]): Record<string, SaldoPorMoneda> {
  const saldos: Record<string, SaldoPorMoneda> = {};
  for (const m of movimientos) {
    if (!saldos[m.entidad_id]) saldos[m.entidad_id] = { ars: 0, usd: 0 };
    const signo = m.tipo === "cargo" ? 1 : -1;
    if (m.moneda === "USD") saldos[m.entidad_id].usd += signo * Number(m.monto);
    else saldos[m.entidad_id].ars += signo * Number(m.monto);
  }
  for (const id in saldos) {
    saldos[id].ars = Math.round(saldos[id].ars * 100) / 100;
    saldos[id].usd = Math.round(saldos[id].usd * 100) / 100;
  }
  return saldos;
}
