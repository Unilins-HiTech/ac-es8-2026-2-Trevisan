require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');


// ===== Configuração =====

const PORT = process.env.PORT || 3000;

// Só o domínio (remove "/rest/v1/" caso tenha sido copiado junto)
const SUPABASE_URL = process.env.SUPABASE_URL
	?.trim()
	.replace(/\/rest\/v1\/?$/, '')
	.replace(/\/+$/, '');

// Chave secreta (sb_secret_... ou service_role): fica só no servidor
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;


if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {

	console.error(
		'Configure SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env ' +
		'(ou nas Environment Variables do Render).'
	);

	process.exit(1);
}


const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: { persistSession: false }
});


// Maior id de um Pokémon "principal"
const MAX_POKEMON_ID = 1025;

// Tamanho máximo de um time
const MAX_TEAM_SIZE = 6;


const app = express();


// Libera o acesso do frontend (outro domínio).
// CORS_ORIGIN pode ter uma ou mais URLs separadas por vírgula.
app.use(cors({
	origin: process.env.CORS_ORIGIN
		? process.env.CORS_ORIGIN.split(',').map((url) => url.trim())
		: '*'
}));

app.use(express.json({ limit: '10kb' }));


// ===== Validação =====

// Erro com status HTTP (ex: 400 dados inválidos, 404 não encontrado)
class HttpError extends Error {

	constructor(status, message) {

		super(message);

		this.status = status;
	}
}


// Texto obrigatório com tamanho máximo
function validateText(value, field, maxLength) {

	if (typeof value !== 'string' || value.trim() === '') {
		throw new HttpError(400, `O campo "${field}" é obrigatório.`);
	}


	const text = value.trim();


	if (text.length > maxLength) {
		throw new HttpError(400, `O campo "${field}" pode ter no máximo ${maxLength} caracteres.`);
	}


	return text;
}


// Número inteiro dentro de um intervalo
function validateInteger(value, field, min, max) {

	if (!Number.isInteger(value) || value < min || value > max) {
		throw new HttpError(400, `O campo "${field}" deve ser um número inteiro entre ${min} e ${max}.`);
	}


	return value;
}


// Id vindo da URL (ex: /times/5)
function parseId(value) {

	const id = Number(value);


	if (!Number.isInteger(id) || id < 1) {
		throw new HttpError(400, 'Id inválido.');
	}


	return id;
}


// Dados de um time
function validateTeam(body) {

	const pokemons = body?.pokemons;


	if (
		!Array.isArray(pokemons) ||
		pokemons.length < 1 ||
		pokemons.length > MAX_TEAM_SIZE
	) {
		throw new HttpError(400, `O time deve ter de 1 a ${MAX_TEAM_SIZE} Pokémon.`);
	}


	pokemons.forEach((id) =>
		validateInteger(id, 'pokemons', 1, MAX_POKEMON_ID)
	);


	return {
		nome: validateText(body.nome, 'nome', 40),
		treinador: validateText(body.treinador, 'treinador', 30),
		pokemons
	};
}


// ===== Rotas =====

// Verifica se a API está no ar
app.get('/', (req, res) => {

	res.json({ status: 'ok', mensagem: 'API da Pokédex no ar!' });

});


// --- Ranking do jogo "Quem é esse Pokémon?" ---

// Top 10: mais acertos primeiro; empate → menos tentativas → quem chegou antes
app.get('/ranking', async (req, res) => {

	const { data, error } = await supabase
		.from('ranking')
		.select('id, nome, acertos, total, created_at')
		.order('acertos', { ascending: false })
		.order('total', { ascending: true })
		.order('created_at', { ascending: true })
		.limit(10);


	if (error) {
		throw error;
	}


	res.json(data);

});


// Salva um placar
app.post('/ranking', async (req, res) => {

	const nome = validateText(req.body?.nome, 'nome', 30);

	const total = validateInteger(req.body?.total, 'total', 1, 1000);

	const acertos = validateInteger(req.body?.acertos, 'acertos', 0, total);


	const { data, error } = await supabase
		.from('ranking')
		.insert({ nome, acertos, total })
		.select()
		.single();


	if (error) {
		throw error;
	}


	res.status(201).json(data);

});


// --- Times Pokémon (CRUD) ---

// Lista os times (mais recentes primeiro)
app.get('/times', async (req, res) => {

	const { data, error } = await supabase
		.from('times')
		.select('*')
		.order('updated_at', { ascending: false })
		.limit(100);


	if (error) {
		throw error;
	}


	res.json(data);

});


// Busca um time
app.get('/times/:id', async (req, res) => {

	const { data, error } = await supabase
		.from('times')
		.select('*')
		.eq('id', parseId(req.params.id))
		.maybeSingle();


	if (error) {
		throw error;
	}


	if (!data) {
		throw new HttpError(404, 'Time não encontrado.');
	}


	res.json(data);

});


// Cria um time
app.post('/times', async (req, res) => {

	const { data, error } = await supabase
		.from('times')
		.insert(validateTeam(req.body))
		.select()
		.single();


	if (error) {
		throw error;
	}


	res.status(201).json(data);

});


// Atualiza um time
app.put('/times/:id', async (req, res) => {

	const id = parseId(req.params.id);


	const { data, error } = await supabase
		.from('times')
		.update({
			...validateTeam(req.body),
			updated_at: new Date().toISOString()
		})
		.eq('id', id)
		.select()
		.maybeSingle();


	if (error) {
		throw error;
	}


	if (!data) {
		throw new HttpError(404, 'Time não encontrado.');
	}


	res.json(data);

});


// Exclui um time
app.delete('/times/:id', async (req, res) => {

	const { data, error } = await supabase
		.from('times')
		.delete()
		.eq('id', parseId(req.params.id))
		.select('id')
		.maybeSingle();


	if (error) {
		throw error;
	}


	if (!data) {
		throw new HttpError(404, 'Time não encontrado.');
	}


	res.status(204).end();

});


// ===== Erros =====

// Rota inexistente
app.use((req, res) => {

	res.status(404).json({ erro: 'Rota não encontrada.' });

});


// Erros das rotas (o Express 5 captura os erros das funções async)
app.use((error, req, res, next) => {

	// JSON mal formatado no corpo da requisição
	if (error.type === 'entity.parse.failed') {
		return res.status(400).json({ erro: 'JSON inválido.' });
	}


	if (error instanceof HttpError) {
		return res.status(error.status).json({ erro: error.message });
	}


	console.error(error);

	res.status(500).json({ erro: 'Erro interno no servidor.' });

});


app.listen(PORT, () => {

	console.log(`API da Pokédex rodando na porta ${PORT}`);

});
