// Las clases se escriben completas (no `badge-${estado}`): Tailwind solo
// genera las clases que encuentra escritas tal cual en el código
const ESTADOS = {
  libre: { clase: 'badge-libre', etiqueta: 'Libre' },
  ocupada: { clase: 'badge-ocupada', etiqueta: 'Ocupada' },
  vencida: { clase: 'badge-vencida', etiqueta: 'Venció' },
}

// La etiqueta de color de una cochera (las clases badge-* están en index.css)
export default function EstadoBadge({ estado }) {
  const { clase, etiqueta } = ESTADOS[estado]
  return <span className={clase}>{etiqueta}</span>
}
