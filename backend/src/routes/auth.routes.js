import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { APP_SLUG } from "../constants.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Probá de nuevo en 15 minutos." },
});

// mismas opciones al crear y al borrar la cookie: si no coinciden, el
// navegador puede ignorar el borrado
function opcionesCookie() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth",
  };
}

function firmarAcceso(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

// El usuario que ve el frontend: sin el token del Portal, que queda solo
// adentro del JWT (el backend lo usa para consultar al Portal en /refresh)
function usuarioParaFrontend({ portalToken: _omit, iat: _iat, exp: _exp, ...user }) {
  return user;
}

// Login con email y contraseña: los revisa el Portal, no esta app
router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Email o contraseña con formato inválido" });

  try {
    const portalRes = await fetch(`${process.env.PORTAL_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsed.data, appSlug: APP_SLUG }),
    });
    if (!portalRes.ok)
      return res.status(401).json({ error: "Email o contraseña incorrectos" });

    const { token: portalToken, user: portalUser } = await portalRes.json();
    if (!portalUser.apps?.some((a) => a.slug === APP_SLUG))
      return res.status(403).json({ error: "No tenés acceso a esta aplicación" });

    const payload = {
      id: portalUser.id,
      email: portalUser.email,
      name: portalUser.name,
      portalToken,
    };
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    });
    res.cookie("refresh_token", refreshToken, {
      ...opcionesCookie(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ token: firmarAcceso(payload), user: usuarioParaFrontend(payload) });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Le pregunta al Portal si este usuario sigue teniendo acceso (igual que
// Obras):
//  - "ok": el Portal contestó y la sesión sigue siendo válida (trae `me`)
//  - "rechazado": el Portal contestó que NO — hay que cerrar la sesión
//  - "no_disponible": no se pudo saber (Portal caído o lento) — se sigue con
//    la sesión que había, para que una caída del Portal no eche a recepción
async function consultarPortal(portalToken) {
  try {
    const res = await fetch(`${process.env.PORTAL_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${portalToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const me = await res.json();
      return Array.isArray(me?.apps) ? { estado: "ok", me } : { estado: "no_disponible" };
    }
    if ([401, 403, 404].includes(res.status)) return { estado: "rechazado" };
    return { estado: "no_disponible" };
  } catch {
    return { estado: "no_disponible" };
  }
}

// Renueva el token de acceso con la cookie de 7 días, sin pedir la contraseña
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) return res.status(401).json({ error: "No hay sesión" });

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: "La sesión venció, volvé a iniciar sesión" });
  }

  const consulta = await consultarPortal(payload.portalToken);
  if (consulta.estado === "rechazado") {
    res.clearCookie("refresh_token", opcionesCookie());
    return res.status(401).json({ error: "Tu sesión ya no es válida, volvé a iniciar sesión" });
  }
  if (consulta.estado === "ok" && !consulta.me.apps.some((a) => a.slug === APP_SLUG)) {
    res.clearCookie("refresh_token", opcionesCookie());
    return res.status(403).json({ error: "Ya no tenés acceso a esta aplicación" });
  }

  const { iat: _iat, exp: _exp, ...datos } = payload;
  res.json({ token: firmarAcceso(datos), user: usuarioParaFrontend(datos) });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("refresh_token", opcionesCookie());
  res.json({ message: "Sesión cerrada" });
});

export default router;
