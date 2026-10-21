import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.routes.js'
import cocherasRoutes from './routes/cocheras.routes.js'
import reservasRoutes from './routes/reservas.routes.js'

const app = express()

// Vercel pone un proxy delante; sin esto el rate limit vería a todos los
// usuarios con la misma IP
app.set('trust proxy', 1)

app.use(helmet())

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5180').split(' ')
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

app.use(express.json({ limit: '50kb' }))
// lee la cookie refresh_token del login
app.use(cookieParser())

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use('/api/auth', authRoutes)
app.use('/api/cocheras', cocherasRoutes)
app.use('/api/reservas', reservasRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.use((err, _req, res, _next) => {
  // P2025 = Prisma "registro no encontrado" (alguien lo cambió justo antes)
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'El registro ya no existe' })
  }
  const status = err.status || 500
  if (status === 500) console.error(err)
  const message = status === 500 ? 'Error interno del servidor' : err.message
  res.status(status).json({ error: message })
})

export default app
