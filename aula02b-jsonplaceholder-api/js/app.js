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
		mensagemCarregando.textContent = 'Não foi possível carregar os usuários.';
		return;
	}

	mensagemCarregando.style.display = 'none';
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
	listaPosts.innerHTML = '<li class="list-group-item">Carregando posts...</li>';

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
		item.className = 'list-group-item';
		item.innerHTML = `<strong>${post.title}</strong><p class="mb-0">${post.body}</p>`;
		listaPosts.appendChild(item);
	});
}

// Botão para voltar da tela de detalhe para a tela de lista
botaoVoltar.addEventListener('click', () => {
	telaDetalhe.classList.add('d-none');
	telaLista.classList.remove('d-none');
	areaBusca.classList.remove('d-none');
});

carregarUsuarios();
