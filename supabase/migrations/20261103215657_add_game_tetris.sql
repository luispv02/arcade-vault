-- Añade el juego Tetris al catálogo (idempotente).
insert into public.games (id, title, short, long, cat, color, cover, sort_order)
values (
  'tetris',
  'TETRIS',
  'Encaja las piezas y limpia líneas antes de que el tablero se llene.',
  'Un tablero de 10×20 y ocho piezas, incluida una tuerca hueca que rompe todas las reglas. Rota, mueve y suelta cada pieza guiándote por su fantasma; limpiar varias líneas a la vez multiplica los puntos. Cada 10 líneas sube el nivel y la caída se acelera.',
  'PUZZLE',
  'magenta',
  'cover-tetris',
  2
)
on conflict (id) do nothing;
