-- Escala las puntuaciones de ejemplo de Asteroides (máx. ≈ 3.000) para que las partidas reales entren en el top.
update public.scores
set score = round(score * 0.25)::int
where game_id = 'asteroides'
  and created_at < timestamptz '2026-11-03 19:00:00+00';
