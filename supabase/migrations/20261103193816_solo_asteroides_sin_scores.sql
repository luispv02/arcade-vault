-- Solo el juego funcional (asteroides) permanece en el catálogo; se vacían las puntuaciones de ejemplo y de prueba.
delete from public.scores;
delete from public.games where id <> 'asteroides';
update public.games set sort_order = 1 where id = 'asteroides';
