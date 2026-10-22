import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

let prisma

export function getPrisma() {
  if (!prisma) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1,
    })
    // el schema de la base: "recepcion" (la real) salvo que DB_SCHEMA diga
    // otro, como "solerios-testing" en la compu (ver prisma.config.ts)
    const adapter = new PrismaPg(pool, { schema: process.env.DB_SCHEMA || 'recepcion' })
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return prisma
}
