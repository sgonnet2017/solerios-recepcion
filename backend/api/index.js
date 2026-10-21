// Punto de entrada para Vercel: Vercel no ejecuta server.js (no hay un
// servidor prendido todo el tiempo), sino que llama a esta función en cada
// pedido. Por eso exportamos la app de Express en vez de hacer app.listen().
import app from '../src/app.js'
export default app
