# API da Pokédex (Node.js + Express + Supabase)

Backend da [Pokédex](../aula02a-poke-api) que salva no banco de dados (Supabase / PostgreSQL):

- 🏆 **Ranking** do jogo "Quem é esse Pokémon?"
- 👥 **Times Pokémon** (CRUD completo: criar, listar, editar e excluir)

Os dados dos Pokémon continuam vindo da [PokéAPI](https://pokeapi.co/). O banco guarda só o que é do usuário (placares e times, com os **ids** dos Pokémon).

```
Pokédex (Static Site) ──fetch──▶ Esta API (Web Service) ──▶ Supabase (PostgreSQL)
```

> A chave do Supabase fica **só no servidor** (arquivo `.env` / Environment Variables do Render). O frontend nunca fala direto com o banco.

---

## 📡 Rotas

| Método | Rota | Descrição | Corpo (JSON) |
|---|---|---|---|
| GET | `/` | Verifica se a API está no ar | — |
| GET | `/ranking` | Top 10 do jogo | — |
| POST | `/ranking` | Salva um placar | `{ "nome": "Ash", "acertos": 8, "total": 10 }` |
| GET | `/times` | Lista os times | — |
| GET | `/times/:id` | Busca um time | — |
| POST | `/times` | Cria um time | `{ "nome": "Time Fogo", "treinador": "Ash", "pokemons": [6, 38, 59] }` |
| PUT | `/times/:id` | Atualiza um time | igual ao POST |
| DELETE | `/times/:id` | Exclui um time | — |

Erros voltam no formato `{ "erro": "mensagem" }` com o status HTTP adequado (400, 404, 500).

---

## 🗄️ 1. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra o **SQL Editor**, cole o conteúdo de [`supabase.sql`](supabase.sql) e clique em **Run**.
3. Em **Project Settings → API Keys**, copie a **Secret key** (`sb_secret_...`). Em projetos antigos, use a `service_role`.
4. Em **Project Settings → Data API**, copie a **Project URL** (`https://xxxx.supabase.co`).

---

## 💻 2. Rodar localmente

```bash
cd aula02a-poke-api-backend
npm install
cp .env.example .env   # depois preencha o .env com a URL e a chave
npm run dev
```

A API sobe em `http://localhost:3000`. O frontend, aberto em `localhost`, usa essa URL automaticamente.

---

## 🚀 3. Deploy no Render (Web Service)

**New + → Web Service** → repositório `ac-es8-2026-2-Trevisan`:

| Campo | Valor |
|---|---|
| Name | `pokedex-api-trevisan` |
| Root Directory | `aula02a-poke-api-backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

**Environment Variables:**

| Chave | Valor |
|---|---|
| `SUPABASE_URL` | Project URL do Supabase |
| `SUPABASE_SECRET_KEY` | Secret key do Supabase |
| `CORS_ORIGIN` | `https://pokedex-trevisan.onrender.com` |

> Se usar outro nome no Render, atualize a constante `BACKEND_URL` em [`../aula02a-poke-api/js/api.js`](../aula02a-poke-api/js/api.js).

⚠️ **Plano gratuito:** a API "dorme" após 15 minutos sem uso, e a primeira requisição depois disso pode levar de 30 a 50 segundos.
