-- SPEC 06: tablas games y scores, vista game_stats, RLS y seed.

create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  cover      text not null,
  sort_order int  not null default 0
);

create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 10),
  score      integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)::int          as plays
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public" on public.games
  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores
  for select to anon, authenticated using (true);
create policy "scores_insert_public" on public.scores
  for insert to anon, authenticated with check (true);

-- Seed: catálogo
insert into public.games (id, title, short, long, cat, color, cover, sort_order) values
('bloque-buster','BLOQUE BUSTER','Rebota la pelota y destruye muros de neón.','Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?','ARCADE','cyan','cover-bricks',1),
('caida','CAÍDA','Encaja las piezas antes de que el techo te aplaste.','Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.','PUZZLE','magenta','cover-tetro',2),
('serpentina','SERPENTINA','Crece sin morder tu propia cola.','Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.','ARCADE','green','cover-snake',3),
('gloton','GLOTÓN','Devora puntos y escapa de los fantasmas.','Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.','ARCADE','yellow','cover-glot',4),
('invasores','INVASORES','Defiende el planeta de filas alienígenas.','Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.','SHOOTER','green','cover-invaders',5),
('rocas','ROCAS','Pulveriza asteroides en gravedad cero.','Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.','SHOOTER','yellow','cover-rocas',6),
('asteroides','ASTEROIDES','Pilota tu nave y esquiva un campo de rocas que se parten.','Una nave en un espacio sin bordes: lo que sale por un lado vuelve a entrar por el otro. Rota, propulsa y dispara para partir asteroides grandes en medianos y pequeños. Tienes 3 vidas, y un power-up de triple disparo puede salvarte cuando el campo se llene.','SHOOTER','magenta','cover-asteroides',7),
('ranaria','RANARIA','Cruza la autopista de pixeles.','Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.','ARCADE','green','cover-rana',8),
('duelo-pixel','DUELO PIXEL','Dos paletas. Una pelota. Reflejos máximos.','El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.','VERSUS','cyan','cover-duelo',9);

-- Seed: 10 puntuaciones de ejemplo por juego (nombres distintos por juego)
with tops(game_id, top) as (values
  ('bloque-buster', 28450), ('caida', 184220), ('serpentina', 7820),
  ('gloton', 96400), ('invasores', 54190), ('rocas', 41200),
  ('asteroides', 12000), ('ranaria', 18900), ('duelo-pixel', 24)
),
names(name) as (values
  ('PX_KAI'),('NEONFOX'),('Z3R0COOL'),('M00NRYU'),('VAULT_07'),('GLITCHA'),
  ('ATARI_KID'),('CYBER_LU'),('MAGENTA88'),('SCANLINE'),('BIT_LORD'),('ARKADYA'),
  ('DROID_X'),('RGB_QUEEN'),('PIXEL_DAD'),('RETROVIRA'),('VECTORX'),('JOY_STK')
),
ranked as (
  select t.game_id, t.top, n.name,
         row_number() over (partition by t.game_id order by random()) as i
  from tops t cross join names n
)
insert into public.scores (game_id, name, score, created_at)
select game_id, name,
       greatest(1, round(top * (1 - (i - 1) * 0.07 - random() * 0.03)))::int,
       now() - (random() * interval '60 days')
from ranked
where i <= 10;
