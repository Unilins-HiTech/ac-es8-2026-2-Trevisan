-- Tabelas da Pokédex
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".


-- Ranking do jogo "Quem é esse Pokémon?"
create table if not exists public.ranking (
	id bigint generated always as identity primary key,
	nome text not null check (char_length(nome) between 1 and 30),
	acertos integer not null check (acertos >= 0),
	total integer not null check (total > 0 and acertos <= total),
	created_at timestamptz not null default now()
);

create index if not exists ranking_top_idx
	on public.ranking (acertos desc, total asc, created_at asc);


-- Times Pokémon (até 6 Pokémon, guardados pelo id da PokéAPI)
create table if not exists public.times (
	id bigint generated always as identity primary key,
	nome text not null check (char_length(nome) between 1 and 40),
	treinador text not null check (char_length(treinador) between 1 and 30),
	pokemons integer[] not null check (cardinality(pokemons) between 1 and 6),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);


-- Segurança: com RLS ligado e nenhuma policy, a chave pública (anon)
-- não acessa nada. Só o backend, com a chave secreta, lê e grava.
alter table public.ranking enable row level security;
alter table public.times enable row level security;

grant select, insert, update, delete on public.ranking to service_role;
grant select, insert, update, delete on public.times to service_role;
