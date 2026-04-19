-- Cache pour les recettes générées par IA
-- TTL de 24h par combinaison d'ingrédients

create table if not exists ai_recipe_cache (
  id uuid primary key default gen_random_uuid(),
  ingredient_hash text not null unique,  -- SHA-256 des ingrédients triés
  ingredients text[] not null,
  recipe_json jsonb not null,
  language text not null default 'fr',
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists ai_recipe_cache_hash_idx on ai_recipe_cache(ingredient_hash);
create index if not exists ai_recipe_cache_expires_idx on ai_recipe_cache(expires_at);

-- RLS : lecture publique (edge function accède en tant que service_role de toute façon)
alter table ai_recipe_cache enable row level security;

-- Nettoyage automatique des entrées expirées (appelé par l'edge function)
create or replace function cleanup_expired_ai_recipe_cache()
returns void
language sql
security definer
as $$
  delete from ai_recipe_cache where expires_at < now();
$$;
