import { useState } from "react";
import { CloudOff } from "lucide-react";

// Estado de error al cargar una pantalla — reemplaza al spinner que antes
// giraba para siempre si la petición inicial fallaba (típicamente por
// falta de conexión) y nadie la atajaba.
//
// onReintentar tiene que devolver la promesa de la carga (no solo
// dispararla) — así el botón puede mostrar "Reintentando..." mientras
// está en vuelo. Sin esto, si el reintento también falla rápido, la
// pantalla pasa de "Sin conexión" a spinner a "Sin conexión" de nuevo tan
// rápido que da la sensación de que tocar el botón no hizo nada.
export default function ErrorCarga({ mensaje, onReintentar }) {
  const [reintentando, setReintentando] = useState(false);

  async function handleReintentar() {
    setReintentando(true);
    try {
      await onReintentar();
    } finally {
      setReintentando(false);
    }
  }

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-amber-500/30 bg-amber-500/5">
      <span className="flex items-center gap-2 text-amber-400 text-sm">
        <CloudOff size={16} />
        {mensaje}
      </span>
      <button
        onClick={handleReintentar}
        disabled={reintentando}
        className="btn-secondary text-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {reintentando ? "Reintentando..." : "Reintentar"}
      </button>
    </div>
  );
}
