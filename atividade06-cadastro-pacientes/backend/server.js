const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares: rodam antes de todas as rotas
app.use(cors());          // libera o acesso do frontend (outra origem)
app.use(express.json());  // converte o body JSON em objeto, disponível em req.body

// "Banco de dados" em memória (será substituído na Aula 5)
const pacientes = [
  { id: 1, nome: 'Maria Silva', email: 'maria.silva@email.com', nascimento: '1990-04-12' },
  { id: 2, nome: 'João Pereira', email: 'joao.pereira@email.com', nascimento: '1985-11-30' },
  { id: 3, nome: 'Ana Costa', email: 'ana.costa@email.com', nascimento: '2001-07-08' },
];
let proximoId = 4;

// Exercício 2 — verifica se o e-mail já pertence a OUTRO paciente
// (no PUT, o próprio paciente pode manter o e-mail que já tem)
function emailJaCadastrado(email, idIgnorado) {
  return pacientes.some(
    (p) => p.email.toLowerCase() === email.toLowerCase() && p.id !== idIgnorado
  );
}

// Extensão 1 — valida o formato do e-mail e a data de nascimento.
// Só confere os campos que vieram (assim também serve para o PATCH).
// Devolve a mensagem de erro, ou null se estiver tudo certo.
function validarCampos({ email, nascimento }) {
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'E-mail em formato inválido';
  }

  if (nascimento !== undefined) {
    // Aceita só AAAA-MM-DD e rejeita datas inexistentes, como 2020-02-31
    const data = new Date(`${nascimento}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento) || isNaN(data) ||
        data.toISOString().slice(0, 10) !== nascimento) {
      return 'Data de nascimento inválida (use o formato AAAA-MM-DD)';
    }

    // "Hoje" em UTC (o fuso do Render). À noite no Brasil isso já é o dia
    // seguinte, o que deixa só 1 dia de folga — aceitável aqui
    const hoje = new Date().toISOString().slice(0, 10);
    if (nascimento > hoje) {
      return 'A data de nascimento não pode estar no futuro';
    }
  }

  return null;
}

// READ (lista) — GET /pacientes
// Exercício 3 — filtro opcional por nome: GET /pacientes?nome=ana
app.get('/pacientes', (req, res) => {
  const { nome } = req.query;

  if (!nome) {
    return res.json(pacientes);
  }

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(nome.toLowerCase())
  );
  res.json(filtrados);
});

// Exercício 1 — GET /pacientes/total
// Precisa vir ANTES de /pacientes/:id; senão o Express entende "total" como um id
app.get('/pacientes/total', (req, res) => {
  res.json({ total: pacientes.length });
});

// READ (um) — GET /pacientes/:id
app.get('/pacientes/:id', (req, res) => {
  const id = Number(req.params.id);
  const paciente = pacientes.find((p) => p.id === id);

  if (!paciente) {
    return res.status(404).json({ erro: 'Paciente não encontrado' });
  }

  res.json(paciente);
});

// CREATE — POST /pacientes
app.post('/pacientes', (req, res) => {
  const { nome, email, nascimento } = req.body ?? {};

  if (!nome || !email || !nascimento) {
    return res.status(400).json({ erro: 'Nome, e-mail e nascimento são obrigatórios' });
  }

  const erroValidacao = validarCampos({ email, nascimento });
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  if (emailJaCadastrado(email)) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  const novoPaciente = { id: proximoId++, nome, email, nascimento };
  pacientes.push(novoPaciente);

  res.status(201).json(novoPaciente);
});

// UPDATE — PUT /pacientes/:id
app.put('/pacientes/:id', (req, res) => {
  const id = Number(req.params.id);
  const paciente = pacientes.find((p) => p.id === id);

  if (!paciente) {
    return res.status(404).json({ erro: 'Paciente não encontrado' });
  }

  const { nome, email, nascimento } = req.body ?? {};

  if (!nome || !email || !nascimento) {
    return res.status(400).json({ erro: 'Nome, e-mail e nascimento são obrigatórios' });
  }

  const erroValidacao = validarCampos({ email, nascimento });
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  if (emailJaCadastrado(email, id)) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  paciente.nome = nome;
  paciente.email = email;
  paciente.nascimento = nascimento;

  res.json(paciente);
});

// Extensão 2 — UPDATE parcial: PATCH /pacientes/:id
// PUT substitui o paciente inteiro (exige todos os campos);
// PATCH altera só os campos enviados, ex.: { "email": "novo@email.com" }
app.patch('/pacientes/:id', (req, res) => {
  const id = Number(req.params.id);
  const paciente = pacientes.find((p) => p.id === id);

  if (!paciente) {
    return res.status(404).json({ erro: 'Paciente não encontrado' });
  }

  // Pega só os campos permitidos que realmente vieram no body
  const alteracoes = {};
  for (const campo of ['nome', 'email', 'nascimento']) {
    if (req.body?.[campo] !== undefined) {
      alteracoes[campo] = req.body[campo];
    }
  }

  if (Object.keys(alteracoes).length === 0) {
    return res.status(400).json({ erro: 'Envie ao menos um campo: nome, e-mail ou nascimento' });
  }

  if (Object.values(alteracoes).some((valor) => !valor)) {
    return res.status(400).json({ erro: 'Os campos enviados não podem ficar vazios' });
  }

  const erroValidacao = validarCampos(alteracoes);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  if (alteracoes.email && emailJaCadastrado(alteracoes.email, id)) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  Object.assign(paciente, alteracoes);
  res.json(paciente);
});

// DELETE — DELETE /pacientes/:id
app.delete('/pacientes/:id', (req, res) => {
  const id = Number(req.params.id);
  const indice = pacientes.findIndex((p) => p.id === id);

  if (indice === -1) {
    return res.status(404).json({ erro: 'Paciente não encontrado' });
  }

  pacientes.splice(indice, 1);
  res.status(204).send(); // 204 = deu certo, e não há corpo na resposta
});

// Em produção (Render) a porta vem da variável de ambiente PORT
const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});
