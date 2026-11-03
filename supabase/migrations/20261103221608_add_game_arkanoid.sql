-- Añade el juego Arkanoid al catálogo (idempotente).
insert into public.games (id, title, short, long, cat, color, cover, sort_order)
values (
  'arkanoid',
  'ARKANOID',
  'Rebota la pelota y derriba los muros de ladrillos nivel tras nivel.',
  'Mueve el paddle con el ratón o con las flechas y no dejes caer la pelota: tienes 3 vidas. Cada ladrillo destruido explota y suma 10 puntos. Hay 5 niveles con patrones distintos, desde la parrilla completa hasta el marco con cruz, y en cada uno la pelota gana un 10 % de velocidad. Limpia los cinco para completar el juego.',
  'ARCADE',
  'cyan',
  'cover-arkanoid',
  3
)
on conflict (id) do nothing;
