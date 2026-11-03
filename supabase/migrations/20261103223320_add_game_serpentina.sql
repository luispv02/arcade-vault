-- Añade el juego Serpentina al catálogo (idempotente).
insert into public.games (id, title, short, long, cat, color, cover, sort_order)
values (
  'serpentina',
  'SERPENTINA',
  'Come frutas, crece y no choques contigo ni con las paredes.',
  'Guía a la serpiente por un tablero de 20×15 celdas. Cada fruta suma 10 puntos y la alarga un segmento, y cada 5 frutas sube el nivel y la serpiente se acelera. La partida termina si chocas con una pared o con tu propio cuerpo; si llenas el tablero, completas el juego.',
  'ARCADE',
  'green',
  'cover-snake',
  4
)
on conflict (id) do nothing;
