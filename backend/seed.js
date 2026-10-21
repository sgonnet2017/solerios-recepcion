import "dotenv/config";
import { getPrisma } from "./src/services/prisma.service.js";

const prisma = getPrisma();

// Códigos de EJEMPLO — reemplazar por la lista real de cocheras del edificio
const codigos = Array.from({ length: 12 }, (_, i) => `C-${String(i + 1).padStart(2, "0")}`);

// skipDuplicates: se puede correr más de una vez sin repetir cocheras
const { count } = await prisma.cochera.createMany({
  data: codigos.map((codigo) => ({ codigo })),
  skipDuplicates: true,
});

console.log(`Seed OK: ${count} cocheras nuevas (${codigos[0]} a ${codigos.at(-1)}).`);

await prisma.$disconnect();
