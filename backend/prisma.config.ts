import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

// En qué schema de la base trabajar: "recepcion" (la real) si no se indica
// otra cosa; en la compu, DB_SCHEMA="solerios-testing" para probar aparte.
const schema = process.env.DB_SCHEMA || 'recepcion'

// Le agrega ?schema=... a la dirección de la base (así `db push` crea y
// compara las tablas en ese schema, no en el de por defecto)
function conSchema(url: string) {
  if (!url) return ''
  const u = new URL(url)
  u.searchParams.set('schema', schema)
  return u.toString()
}

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: conSchema(process.env.DIRECT_URL || process.env.DATABASE_URL || ''),
  },
  migrate: {
    async adapter() {
      const pool = new pg.Pool({
        connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })
      return new PrismaPg(pool, { schema })
    },
  },
})
