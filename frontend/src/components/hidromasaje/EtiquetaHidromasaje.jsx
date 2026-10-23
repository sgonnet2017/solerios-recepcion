// "H1" / "H2": en qué hidromasaje es una reserva, en las vistas donde se
// mezclan los dos (semana y próximas). El nombre completo va en el tooltip.
// Las clases se escriben completas para que Tailwind las encuentre.
const COLOR = {
  1: 'bg-gold/15 text-gold-dark dark:text-gold-light',
  2: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
}

export default function EtiquetaHidromasaje({ numero, hidromasajes }) {
  const nombre = hidromasajes.find((h) => h.numero === numero)?.nombre ?? `Hidromasaje ${numero}`
  return (
    <span
      title={nombre}
      className={`inline-flex shrink-0 items-center rounded px-1 text-[10px] font-semibold ${COLOR[numero] ?? 'bg-bg-hover text-text-secondary'}`}
    >
      H{numero}
    </span>
  )
}
