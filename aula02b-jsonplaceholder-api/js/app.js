const URL_BASE = 'https://jsonplaceholder.typicode.com';

// Referências aos elementos do DOM
const telaLista = document.getElementById('tela-lista');
const telaDetalhe = document.getElementById('tela-detalhe');
const mensagemCarregando = document.getElementById('carregando');
const areaBusca = document.getElementById('area-busca');
const campoBusca = document.getElementById('campo-busca');
const detalheNome = document.getElementById('detalhe-nome');
const contadorPosts = document.getElementById('contador-posts');
const listaPosts = document.getElementById('lista-posts');
const botaoVoltar = document.getElementById('btn-voltar');

// Guarda os usuários já carregados para o filtro não precisar de nova requisição
let usuariosCarregados = [];

// Gera o HTML de um spinner do Bootstrap com uma mensagem ao lado
function criarSpinner(texto) {
	return `
      <div class="d-flex align-items-center gap-2 text-muted">
        <div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
        <span>${texto}</span>
      </div>
    `;
}

// Busca a lista de usuários na API
async function carregarUsuarios() {
	try {
		const resposta = await fetch(`${URL_BASE}/users`);

		if (!resposta.ok) {
			throw new Error(`Erro HTTP: ${resposta.status}`);
		}

		usuariosCarregados = await resposta.json();
		renderizarListaUsuarios(usuariosCarregados);
	} catch (erro) {
		console.error('Erro ao carregar usuários:', erro);
		mensagemCarregando.innerHTML =
			'<p class="text-danger mb-0">Não foi possível carregar os usuários.</p>';
		return;
	}

	mensagemCarregando.classList.add('d-none');
}

// Desenha um "card" para cada usuário na tela de lista
function renderizarListaUsuarios(usuarios) {
	telaLista.innerHTML = '';

	if (usuarios.length === 0) {
		telaLista.innerHTML =
			'<div class="col-12"><p class="text-muted">Nenhum usuário encontrado.</p></div>';
		return;
	}

	usuarios.forEach((usuario) => {
		const coluna = document.createElement('div');
		coluna.className = 'col-md-4';

		// Verifica se os dados existem antes de exibi-los, evitando "undefined" na tela
		const telefone = usuario.phone || 'Não informado';
		const website = usuario.website
			? `<a href="https://${usuario.website}" target="_blank" rel="noopener">${usuario.website}</a>`
			: 'Não informado';
		const empresa = usuario.company?.name || 'Empresa não informada';

		coluna.innerHTML = `
      <div class="card card-usuario h-100" data-id="${usuario.id}">
        <div class="card-body">
          <h5 class="card-title">${usuario.name}</h5>
          <p class="card-text text-muted">${usuario.email}</p>
          <p class="card-text mb-1"><small><strong>Telefone:</strong> ${telefone}</small></p>
          <p class="card-text mb-1"><small><strong>Website:</strong> ${website}</small></p>
          <p class="card-text"><small>${empresa}</small></p>
        </div>
      </div>
    `;

		// Cada card criado dinamicamente recebe seu próprio listener de clique
		coluna.querySelector('.card-usuario').addEventListener('click', (evento) => {
			// Clicar no link do website abre o site, sem abrir o detalhe
			if (evento.target.closest('a')) {
				return;
			}
			abrirDetalheUsuario(usuario);
		});

		telaLista.appendChild(coluna);
	});
}

// Filtra os cards por nome a cada tecla digitada, usando o array já carregado
campoBusca.addEventListener('input', () => {
	const termo = campoBusca.value.trim().toLowerCase();

	const filtrados = usuariosCarregados.filter((usuario) =>
		usuario.name.toLowerCase().includes(termo)
	);

	renderizarListaUsuarios(filtrados);
});

// Busca os posts de um usuário específico e mostra a tela de detalhe
async function abrirDetalheUsuario(usuario) {
	detalheNome.textContent = `Posts de ${usuario.name}`;
	contadorPosts.textContent = '';
	listaPosts.innerHTML = `<li class="list-group-item">${criarSpinner('Carregando posts...')}</li>`;

	telaLista.classList.add('d-none');
	areaBusca.classList.add('d-none');
	telaDetalhe.classList.remove('d-none');

	try {
		// Segunda requisição, feita a partir do ID do usuário selecionado
		const resposta = await fetch(`${URL_BASE}/posts?userId=${usuario.id}`);

		if (!resposta.ok) {
			throw new Error(`Erro HTTP: ${resposta.status}`);
		}

		const posts = await resposta.json();
		renderizarPosts(posts);
	} catch (erro) {
		console.error('Erro ao carregar posts:', erro);
		listaPosts.innerHTML =
			'<li class="list-group-item text-danger">Erro ao carregar posts.</li>';
	}
}

function renderizarPosts(posts) {
	listaPosts.innerHTML = '';

	// Usuário sem posts: mensagem amigável em vez de uma lista vazia
	if (posts.length === 0) {
		contadorPosts.textContent = 'Nenhum post encontrado';
		listaPosts.innerHTML =
			'<li class="list-group-item text-muted">Este usuário ainda não publicou nenhum post.</li>';
		return;
	}

	contadorPosts.textContent =
		posts.length === 1 ? '1 post encontrado' : `${posts.length} posts encontrados`;

	posts.forEach((post) => {
		const item = document.createElement('li');
		item.className = 'list-group-item item-post';
		item.innerHTML = `
      <strong>${post.title}</strong>
      <p class="mb-1">${post.body}</p>
      <small class="text-primary rotulo-comentarios">Ver comentários</small>
      <div class="comentarios mt-3 d-none"></div>
    `;

		item.addEventListener('click', (evento) => {
			// Cliques dentro da área de comentários não fecham a lista
			if (evento.target.closest('.comentarios')) {
				return;
			}
			alternarComentarios(post, item);
		});

		listaPosts.appendChild(item);
	});
}

// Abre/fecha os comentários de um post, buscando-os na API apenas na primeira vez
async function alternarComentarios(post, item) {
	const areaComentarios = item.querySelector('.comentarios');
	const rotulo = item.querySelector('.rotulo-comentarios');

	if (!areaComentarios.classList.contains('d-none')) {
		areaComentarios.classList.add('d-none');
		rotulo.textContent = 'Ver comentários';
		return;
	}

	areaComentarios.classList.remove('d-none');
	rotulo.textContent = 'Ocultar comentários';

	if (areaComentarios.dataset.carregado === 'true') {
		return;
	}

	areaComentarios.innerHTML = criarSpinner('Carregando comentários...');

	try {
		// Terceira requisição, feita a partir do ID do post selecionado
		const resposta = await fetch(`${URL_BASE}/comments?postId=${post.id}`);

		if (!resposta.ok) {
			throw new Error(`Erro HTTP: ${resposta.status}`);
		}

		const comentarios = await resposta.json();
		renderizarComentarios(comentarios, areaComentarios);
		areaComentarios.dataset.carregado = 'true';
	} catch (erro) {
		console.error('Erro ao carregar comentários:', erro);
		areaComentarios.innerHTML =
			'<p class="text-danger small mb-0">Erro ao carregar comentários.</p>';
	}
}

function renderizarComentarios(comentarios, areaComentarios) {
	if (comentarios.length === 0) {
		areaComentarios.innerHTML =
			'<p class="text-muted small mb-0">Este post ainda não tem comentários.</p>';
		return;
	}

	areaComentarios.innerHTML = comentarios
		.map(
			(comentario) => `
      <div class="border-start border-3 ps-3 mb-2">
        <p class="mb-0 small"><strong>${comentario.name}</strong></p>
        <p class="mb-0 small text-muted">${comentario.email}</p>
        <p class="mb-0 small">${comentario.body}</p>
      </div>
    `
		)
		.join('');
}

// Botão para voltar da tela de detalhe para a tela de lista
botaoVoltar.addEventListener('click', () => {
	telaDetalhe.classList.add('d-none');
	telaLista.classList.remove('d-none');
	areaBusca.classList.remove('d-none');
});

carregarUsuarios();
