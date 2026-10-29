# Exercícios — Atividade 06

## 1. `GET /pacientes/total`

Rota criada, devolvendo `{ "total": N }`.

**Testando das duas formas:**

| Ordem no `server.js` | `curl http://localhost:3000/pacientes/total` |
|---|---|
| `/total` declarada **depois** de `/:id` | `404 {"erro":"Paciente não encontrado"}` |
| `/total` declarada **antes** de `/:id` | `200 {"total":3}` |

**Explicação:** o Express testa as rotas na ordem em que foram declaradas e usa a primeira que combina com a URL. O padrão `/pacientes/:id` aceita qualquer valor no lugar de `:id`, inclusive a palavra `total`. Com `/:id` primeiro, o Express cai nela com `req.params.id = 'total'`. `Number('total')` vira `NaN`, nenhum paciente tem esse id e a resposta é 404. Por isso as rotas específicas precisam vir antes das genéricas.

## 2. E-mail duplicado → 409 Conflict

A função `emailJaCadastrado` compara o e-mail sem diferenciar maiúsculas de minúsculas. Ela é usada no POST e também no PUT. No PUT, o próprio paciente pode manter o e-mail que já tem, mas não pode usar o e-mail de outro.

| Teste | Resultado |
|---|---|
| POST com `MARIA.SILVA@email.com` (já existe) | `409 {"erro":"E-mail já cadastrado"}` |
| PUT `/pacientes/1` mantendo o próprio e-mail | `200` |
| PUT `/pacientes/2` com o e-mail da Maria | `409` |

O frontend já mostra a mensagem que vem da API ("E-mail já cadastrado"), porque o `salvarPaciente` usa `erro.erro`.

## 3. Filtro por nome: `GET /pacientes?nome=ana`

Usa `req.query.nome` com `includes` e sem diferenciar maiúsculas de minúsculas. Sem o parâmetro, a rota devolve a lista completa.

| Teste | Resultado |
|---|---|
| `?nome=ana` | Ana Costa |
| `?nome=SILVA` | Maria Silva |
| `?nome=zzz` | `[]` (200: a busca deu certo, só não encontrou nada) |

## 4. Testes de status

| Requisição | Status recebido | Esperado? |
|---|---|---|
| `DELETE /pacientes/999` | `404 {"erro":"Paciente não encontrado"}` | Sim |
| `POST /pacientes` sem body e sem `Content-Type` | `400 {"erro":"Nome, e-mail e nascimento são obrigatórios"}` | Sim |
| `POST /pacientes` com body `{}` | `400` (mesma mensagem) | Sim |

Sem body, o `req.body` chega `undefined` no Express 5. O `req.body ?? {}` evita o erro ao desestruturar, e a validação devolve 400 em vez de o servidor quebrar com 500.

---

# Extensões

## 1. Validação de e-mail e data de nascimento (400)

A função `validarCampos` é usada no POST, no PUT e no PATCH.

| Envio | Resposta |
|---|---|
| `"email": "carlos@"` | `400 E-mail em formato inválido` |
| `"nascimento": "2099-01-01"` | `400 A data de nascimento não pode estar no futuro` |
| `"nascimento": "2020-02-31"` (dia que não existe) | `400 Data de nascimento inválida (use o formato AAAA-MM-DD)` |
| `"nascimento": "20/02/1995"` | `400` (mesma mensagem) |

O campo de data do frontend também recebe `max` = hoje, então o calendário não deixa escolher uma data futura.

## 2. PUT x PATCH

- **PUT** substitui o recurso inteiro. Por isso exige nome, e-mail **e** nascimento.
- **PATCH** faz uma atualização parcial. Só os campos enviados mudam, ex.: `{ "email": "novo@email.com" }`.

| `PATCH /pacientes/:id` | Resposta |
|---|---|
| `{"email":"carlos.lima@email.com"}` | `200`, só o e-mail muda |
| `{}` ou sem body | `400 Envie ao menos um campo` |
| `{"nome":""}` | `400 Os campos enviados não podem ficar vazios` |
| e-mail de outro paciente | `409 E-mail já cadastrado` |
| id inexistente | `404` |
| `{"id":1,"nome":"Carlos"}` | `200`, o `id` é ignorado (só nome, e-mail e nascimento podem mudar) |

## 3. Mensagem de erro específica no frontend

A função `erroDaApi` lê o `{ erro }` que a API devolve, e agora o listar, o salvar e o excluir mostram esse erro. Exemplos: "E-mail já cadastrado", "E-mail em formato inválido", "Não foi possível excluir o paciente: Paciente não encontrado".
