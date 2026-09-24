// URL da nossa API (backend). Rodando localmente usa o servidor da máquina.
const BACKEND_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
	? 'http://localhost:3000'
	: 'https://pokedex-trevisan.onrender.com';


// Aviso para o primeiro acesso: no plano gratuito do Render a API "dorme"
const COLD_START_HINT =
	'Na primeira vez o servidor pode levar até 1 minuto para acordar.';


// Faz uma requisição para a API e devolve o JSON da resposta
async function backendRequest(path, options = {}) {

	let response;

	try {

		response = await fetch(`${BACKEND_URL}${path}`, {
			method: options.method || 'GET',
			headers: { 'Content-Type': 'application/json' },
			body: options.body ? JSON.stringify(options.body) : undefined
		});

	} catch (error) {

		throw new Error('Não foi possível conectar ao servidor. Tente novamente.');

	}


	// 204 = sucesso sem conteúdo (ex: exclusão)
	if (response.status === 204) {
		return null;
	}


	const data = await response.json().catch(() => null);


	if (!response.ok) {
		throw new Error(data?.erro || 'Erro na comunicação com o servidor.');
	}


	return data;
}


// Escapa textos digitados por usuários antes de colocar no HTML
function escapeHTML(text) {

	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
