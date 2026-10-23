// Cómo se llama esta app en el Portal. Solo entran los usuarios que tengan
// esta app habilitada (las recepcionistas).
export const APP_SLUG = "recepcion";

// --- Hidromasaje: el único lugar donde se configura ---

// Los hidromasajes del edificio. Comparten horario y duración. Para
// cambiarles el nombre, se cambia acá (el número es lo que se guarda).
export const HIDROMASAJES = [
  { numero: 1, nombre: "Hidromasaje 1" },
  { numero: 2, nombre: "Hidromasaje 2" },
];

// Cada cuántos minutos puede empezar una reserva. 60 = en hora justa
// (14:00, 15:00, 16:00...); con 15 sería 14:00, 14:15, 14:30...
export const PASO_RESERVA_MIN = 60;

// Cuánto ocupa cada reserva, con la limpieza incluida (45 de uso + 15 de
// limpieza): una reserva a las 15:15 ocupa hasta las 16:15. Tiene que ser
// múltiplo de PASO_RESERVA_MIN. Si se cambia, las reservas ya hechas quedan
// como están.
export const DURACION_RESERVA_MIN = 60;

// Horario de uso, hora de Uruguay (null = las 24 horas). La reserva tiene que
// terminar a la hora de cierre o antes: con 07:00 a 23:00 y reservas de una
// hora, la primera es a las 07:00 y la última a las 22:00.
export const HORARIO_HIDROMASAJE = { apertura: "07:00", cierre: "22:00" };
