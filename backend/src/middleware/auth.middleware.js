import jwt from "jsonwebtoken";
import { APP_SLUG } from "../constants.js";

// Un solo nivel de acceso: quien tiene esta app habilitada en el Portal puede
// hacer todo. Acepta dos tipos de token, los dos firmados con JWT_SECRET:
//  - el de esta app (lo arma /api/auth/login o /refresh)
//  - el del Portal (cuando se entra desde el Portal con ?token=...), que trae
//    la lista de apps del usuario
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Tenés que iniciar sesión" });
  }

  let payload;
  try {
    payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "La sesión venció, volvé a iniciar sesión" });
  }

  if (Array.isArray(payload.apps)) {
    if (!payload.apps.some((a) => a.slug === APP_SLUG)) {
      return res.status(403).json({ error: "No tenés acceso a esta aplicación" });
    }
    req.user = { id: payload.id, email: payload.email, name: payload.name };
  } else {
    req.user = payload;
  }

  next();
}
