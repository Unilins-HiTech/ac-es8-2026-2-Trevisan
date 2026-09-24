const API_URL = 'https://pokeapi.co/api/v2/pokemon';

const pokemonGrid = document.getElementById('pokemonGrid');
const loading = document.getElementById('loading');
const messageArea = document.getElementById('messageArea');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const pokemonNamesList = document.getElementById('pokemonNames');
const loadMoreWrapper = document.getElementById('loadMoreWrapper');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const themeToggle = document.getElementById('themeToggle');
const typeFilter = document.getElementById('typeFilter');
const generationFilter = document.getElementById('generationFilter');
const resultInfo = document.getElementById('resultInfo');
const randomBtn = document.getElementById('randomBtn');
const guessGameBtn = document.getElementById('guessGameBtn');

const pokemonModalElement = document.getElementById('pokemonModal');
const pokemonModal = new bootstrap.Modal(pokemonModalElement);

const pokemonModalTitle = document.getElementById('pokemonModalLabel');
const pokemonModalBody = document.getElementById('pokemonModalBody');
const prevPokemonBtn = document.getElementById('prevPokemonBtn');
const nextPokemonBtn = document.getElementById('nextPokemonBtn');

const guessModal = new bootstrap.Modal(document.getElementById('guessModal'));
const guessScoreText = document.getElementById('guessScore');
const guessLoading = document.getElementById('guessLoading');
const guessImage = document.getElementById('guessImage');
const guessForm = document.getElementById('guessForm');
const guessInput = document.getElementById('guessInput');
const guessSubmitBtn = document.getElementById('guessSubmitBtn');
const guessFeedback = document.getElementById('guessFeedback');
const guessRevealBtn = document.getElementById('guessRevealBtn');
const guessNextBtn = document.getElementById('guessNextBtn');


// Controle do carregamento
let pokemonOffset = 0;

const pokemonLimit = 20;

// Quantidade máxima de resultados exibidos numa busca parcial
const searchResultsLimit = 20;


// Cache dos Pokémon já buscados (chave: id ou nome)
const pokemonCache = new Map();

// Lista com nome e id de todos os Pokémon (usada na busca e na navegação)
let pokemonIndexPromise = null;

// Evita que respostas antigas sobrescrevam o modal ao navegar rápido
let modalRequestId = 0;

// Vizinhos do Pokémon aberto no modal
let modalNeighbors = { prev: null, next: null };


// Lista filtrada por tipo/geração (null = lista padrão da API)
let filteredList = null;

let filteredOffset = 0;

// Evita que um filtro antigo sobrescreva um mais recente
let filterRequestId = 0;


// Cache de respostas JSON genéricas (tipos, gerações, espécies, evoluções)
const jsonCache = new Map();

// Maior id de um Pokémon "principal" (ids acima disso são formas alternativas)
const maxPokemonId = 1025;

// Imagem pequena de um Pokémon a partir do id (sem precisar de outra requisição)
const SPRITE_URL =
	'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';


// Estado do jogo "Quem é esse Pokémon?"
let guessPokemon = null;

let guessRoundId = 0;

let guessFinished = false;

const guessScore = { hits: 0, total: 0 };


// Tradução dos tipos
const typeNames = {
	normal: 'Normal',
	fire: 'Fogo',
	water: 'Água',
	electric: 'Elétrico',
	grass: 'Planta',
	ice: 'Gelo',
	fighting: 'Lutador',
	poison: 'Venenoso',
	ground: 'Terrestre',
	flying: 'Voador',
	psychic: 'Psíquico',
	bug: 'Inseto',
	rock: 'Pedra',
	ghost: 'Fantasma',
	dragon: 'Dragão',
	dark: 'Sombrio',
	steel: 'Aço',
	fairy: 'Fada',
	stellar: 'Estelar',
	unknown: 'Desconhecido'
};


// Tradução e cor das estatísticas
const statsConfig = {
	'hp': { name: 'HP', color: 'bg-success' },
	'attack': { name: 'Ataque', color: 'bg-danger' },
	'defense': { name: 'Defesa', color: 'bg-warning' },
	'special-attack': { name: 'Ataque Esp.', color: 'bg-primary' },
	'special-defense': { name: 'Defesa Esp.', color: 'bg-secondary' },
	'speed': { name: 'Velocidade', color: 'bg-info' }
};

// Maior valor possível de um status base
const maxStatValue = 255;


// Extrai o id do Pokémon a partir da URL da API
function getIdFromUrl(url) {

	const parts = url.split('/').filter(Boolean);

	return Number(parts[parts.length - 1]);
}


// Deixa o nome/termo no formato usado pela API
function normalizeQuery(value) {

	return String(value)
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-');
}


// Formata o id no padrão #001
function formatId(id) {

	return `#${String(id).padStart(3, '0')}`;
}


// Formata nomes da API (ex: "mr-mime" → "mr mime")
function formatName(name) {

	return name.replace(/-/g, ' ');
}


// Busca os dados de um Pokémon (usa cache)
async function fetchPokemonData(urlOrName) {

	const value = String(urlOrName);

	const key = value.startsWith('http')
		? String(getIdFromUrl(value))
		: normalizeQuery(value);

	if (pokemonCache.has(key)) {
		return pokemonCache.get(key);
	}

	const request = fetch(`${API_URL}/${key}`)
		.then((response) => {

			if (!response.ok) {
				throw new Error('Pokémon não encontrado');
			}

			return response.json();
		})
		.then((pokemon) => {

			// Guarda também pelo id e pelo nome
			pokemonCache.set(String(pokemon.id), request);
			pokemonCache.set(pokemon.name, request);

			return pokemon;
		})
		.catch((error) => {

			pokemonCache.delete(key);

			throw error;
		});

	pokemonCache.set(key, request);

	return request;
}


// Busca (uma única vez) a lista com todos os nomes de Pokémon
function getPokemonIndex() {

	if (!pokemonIndexPromise) {

		pokemonIndexPromise = fetch(`${API_URL}?limit=2000`)
			.then((response) => {

				if (!response.ok) {
					throw new Error('Erro ao buscar a lista de Pokémon');
				}

				return response.json();
			})
			.then((data) =>
				data.results.map((item) => ({
					name: item.name,
					id: getIdFromUrl(item.url)
				}))
			)
			.catch((error) => {

				// Permite tentar novamente depois
				pokemonIndexPromise = null;

				throw error;
			});
	}

	return pokemonIndexPromise;
}


// Busca qualquer URL da API guardando a resposta em cache
function fetchJson(url) {

	if (!jsonCache.has(url)) {

		const request = fetch(url)
			.then((response) => {

				if (!response.ok) {
					throw new Error(`Erro ao buscar ${url}`);
				}

				return response.json();
			})
			.catch((error) => {

				jsonCache.delete(url);

				throw error;
			});

		jsonCache.set(url, request);
	}

	return jsonCache.get(url);
}


// Lista de Pokémon de um tipo
async function getPokemonByType(type) {

	const data = await fetchJson(`https://pokeapi.co/api/v2/type/${type}`);

	return data.pokemon
		.map((item) => ({
			name: item.pokemon.name,
			id: getIdFromUrl(item.pokemon.url)
		}))
		.filter((item) => item.id <= maxPokemonId);
}


// Lista de Pokémon de uma geração
async function getPokemonByGeneration(generation) {

	const data = await fetchJson(
		`https://pokeapi.co/api/v2/generation/${generation}`
	);

	return data.pokemon_species.map((item) => ({
		name: item.name,
		id: getIdFromUrl(item.url)
	}));
}


// Preenche o select de tipos (em ordem alfabética)
function loadTypeOptions() {

	Object.entries(typeNames)
		.filter(([type]) => type !== 'stellar' && type !== 'unknown')
		.sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
		.forEach(([type, name]) => {

			const option = document.createElement('option');

			option.value = type;

			option.textContent = name;

			typeFilter.appendChild(option);

		});
}


// Aplica os filtros de tipo e geração
async function applyFilters() {

	const type = typeFilter.value;

	const generation = generationFilter.value;


	// Sem filtros: volta para a lista padrão
	if (!type && !generation) {

		loadInitialPokemon();

		return;
	}


	const requestId = ++filterRequestId;

	searchInput.value = '';

	pokemonGrid.innerHTML = '';

	resultInfo.textContent = '';

	clearMessage();

	loadMoreWrapper.classList.add('d-none');

	showLoading(true);


	try {

		const [typeList, generationList] = await Promise.all([
			type ? getPokemonByType(type) : null,
			generation ? getPokemonByGeneration(generation) : null
		]);


		// Os dois filtros juntos: só quem está nas duas listas
		let list = typeList || generationList;

		if (typeList && generationList) {

			const generationIds = new Set(generationList.map((item) => item.id));

			list = typeList.filter((item) => generationIds.has(item.id));
		}


		if (requestId !== filterRequestId) {
			return;
		}


		filteredList = list.sort((a, b) => a.id - b.id);

		filteredOffset = 0;


		if (filteredList.length === 0) {

			showMessage('Nenhum Pokémon encontrado com esses filtros.', 'info');

			return;
		}


		resultInfo.textContent =
			`${filteredList.length} Pokémon encontrado${filteredList.length > 1 ? 's' : ''}`;


		await loadMorePokemon();

	} catch (error) {

		if (requestId === filterRequestId) {
			showError('Não foi possível aplicar os filtros. Tente novamente.');
		}

	} finally {

		if (requestId === filterRequestId) {
			showLoading(false);
		}

	}
}


// Limpa os filtros sem recarregar a lista
function resetFilters() {

	typeFilter.value = '';

	generationFilter.value = '';

	filteredList = null;

	resultInfo.textContent = '';

	filterRequestId++;
}


// Preenche as sugestões do campo de busca
async function loadSearchSuggestions() {

	try {

		const index = await getPokemonIndex();

		const fragment = document.createDocumentFragment();

		index.forEach((item) => {

			const option = document.createElement('option');

			option.value = item.name;

			fragment.appendChild(option);

		});

		pokemonNamesList.appendChild(fragment);

	} catch (error) {

		// Sem sugestões: a busca por nome exato continua funcionando
		console.warn('Não foi possível carregar as sugestões de busca.', error);

	}

}


// Carrega os primeiros Pokémon
async function loadInitialPokemon() {

	pokemonGrid.innerHTML = '';

	clearMessage();

	pokemonOffset = 0;

	resetFilters();

	loadMoreWrapper.classList.remove('d-none');

	showLoading(true);

	await loadMorePokemon();

	showLoading(false);
}


// Carrega mais Pokémon
async function loadMorePokemon() {

	loadMoreBtn.disabled = true;

	loadMoreBtn.textContent = 'Carregando...';

	try {

		// Com filtro ativo, pagina a lista filtrada
		if (filteredList) {

			const requestId = filterRequestId;

			const page = filteredList.slice(
				filteredOffset,
				filteredOffset + pokemonLimit
			);

			const pokemonList = await Promise.all(
				page.map((item) => fetchPokemonData(item.id))
			);


			// O filtro mudou enquanto carregava
			if (requestId !== filterRequestId) {
				return;
			}


			pokemonList.forEach(renderPokemonCard);

			filteredOffset += pokemonLimit;

			clearMessage();

			loadMoreWrapper.classList.toggle(
				'd-none',
				filteredOffset >= filteredList.length
			);

			return;
		}


		const requestId = filterRequestId;

		const response = await fetch(
			`${API_URL}?limit=${pokemonLimit}&offset=${pokemonOffset}`
		);

		if (!response.ok) {
			throw new Error('Erro ao buscar Pokémon');
		}

		const data = await response.json();

		const pokemonPromises = data.results.map((item) =>
			fetchPokemonData(item.url)
		);

		const pokemonList = await Promise.all(pokemonPromises);


		// Um filtro foi aplicado enquanto carregava
		if (requestId !== filterRequestId) {
			return;
		}

		pokemonList.forEach(renderPokemonCard);

		pokemonOffset += pokemonLimit;

		clearMessage();

		// Esconde o botão quando não há mais Pokémon
		if (!data.next) {
			loadMoreWrapper.classList.add('d-none');
		}

	} catch (error) {

		showError(
			'Não foi possível carregar os Pokémon. Tente novamente.'
		);

	} finally {

		loadMoreBtn.disabled = false;

		loadMoreBtn.textContent =
			'Carregar mais Pokémon';

	}

}


// Cria os badges dos tipos
function renderTypeBadges(types) {

	return types
		.map((t) => {

			const type = t.type.name;

			return `<span class="badge badge-type type-${type}">
				${typeNames[type] || type}
			</span>`;

		})
		.join('');
}


// Cria o card de cada Pokémon
function renderPokemonCard(pokemon) {

	const imageUrl =
		pokemon.sprites.other['official-artwork'].front_default ||
		pokemon.sprites.front_default;


	const heightInMeters =
		(pokemon.height / 10).toFixed(1);


	const weightInKg =
		(pokemon.weight / 10).toFixed(1);


	const cardHTML = `
		<div class="col">

			<div
				class="card h-100 shadow-sm pokemon-card border-0"
				data-pokemon-id="${pokemon.id}"
				tabindex="0"
				role="button"
				aria-label="Ver detalhes de ${pokemon.name}"
			>

				<div class="text-center p-3">

					<img
						src="${imageUrl}"
						class="card-img-top img-fluid"
						style="max-height: 160px; object-fit: contain;"
						alt="${pokemon.name}"
					>

				</div>


				<div class="card-body">

					<div
						class="d-flex justify-content-between align-items-center mb-2"
					>

						<h5
							class="card-title text-capitalize fw-bold m-0"
						>
							${formatName(pokemon.name)}
						</h5>

						<small class="text-body-secondary">
							${formatId(pokemon.id)}
						</small>

					</div>


					<div class="mb-3">
						${renderTypeBadges(pokemon.types)}
					</div>


					<div class="row text-center border-top pt-2">

						<div class="col-6 border-end">

							<small class="text-body-secondary d-block">
								Altura
							</small>

							<strong>
								${heightInMeters} m
							</strong>

						</div>


						<div class="col-6">

							<small class="text-body-secondary d-block">
								Peso
							</small>

							<strong>
								${weightInKg} kg
							</strong>

						</div>

					</div>

				</div>

			</div>

		</div>
	`;


	pokemonGrid.insertAdjacentHTML(
		'beforeend',
		cardHTML
	);
}


// Descobre o Pokémon anterior e o próximo
async function getNeighbors(id) {

	try {

		const index = await getPokemonIndex();

		const position = index.findIndex((item) => item.id === id);

		if (position !== -1) {

			return {
				prev: index[position - 1]?.id ?? null,
				next: index[position + 1]?.id ?? null
			};

		}

	} catch (error) {
		// Sem a lista, navega pelo id
	}

	return {
		prev: id > 1 ? id - 1 : null,
		next: id + 1
	};
}


// Atualiza os botões Anterior / Próximo
function updateNavigationButtons() {

	prevPokemonBtn.disabled = modalNeighbors.prev === null;

	nextPokemonBtn.disabled = modalNeighbors.next === null;
}


// Transforma a árvore de evolução em estágios
// Ex: [[eevee], [vaporeon, jolteon, flareon, ...]]
function getEvolutionStages(chain) {

	const stages = [];

	let level = [chain];


	while (level.length > 0) {

		stages.push(
			level.map((node) => ({
				name: node.species.name,
				id: getIdFromUrl(node.species.url)
			}))
		);

		level = level.flatMap((node) => node.evolves_to);
	}


	return stages;
}


// Busca e mostra a linha evolutiva no modal
async function loadEvolutionChain(pokemon, requestId) {

	const container = document.getElementById('evolutionChain');

	try {

		const species = await fetchJson(pokemon.species.url);

		const evolution = await fetchJson(species.evolution_chain.url);


		if (requestId !== modalRequestId) {
			return;
		}


		const stages = getEvolutionStages(evolution.chain);


		if (stages.length === 1) {

			container.innerHTML = `
				<p class="text-body-secondary mb-0">
					Este Pokémon não evolui.
				</p>
			`;

			return;
		}


		const speciesId = getIdFromUrl(pokemon.species.url);


		const stagesHTML = stages
			.map((stage) => {

				const items = stage
					.map((item) => {

						const isCurrent = item.id === speciesId;

						return `
							<button
								type="button"
								class="evolution-item btn ${isCurrent ? 'btn-outline-danger active' : 'btn-link text-body text-decoration-none'} p-2"
								data-evolution-id="${item.id}"
								${isCurrent ? 'aria-current="true"' : ''}
							>

								<img
									src="${SPRITE_URL}/${item.id}.png"
									alt="${item.name}"
								>

								<small class="d-block text-capitalize">
									${formatName(item.name)}
								</small>

							</button>
						`;

					})
					.join('');


				return `
					<div class="d-flex flex-wrap justify-content-center gap-1">
						${items}
					</div>
				`;

			})
			.join('<span class="evolution-arrow text-body-secondary">→</span>');


		container.innerHTML = `
			<div class="d-flex flex-wrap align-items-center justify-content-center gap-2">
				${stagesHTML}
			</div>
		`;

	} catch (error) {

		if (requestId !== modalRequestId) {
			return;
		}

		container.innerHTML = `
			<p class="text-body-secondary mb-0">
				Não foi possível carregar a linha evolutiva.
			</p>
		`;

	}
}


// Abre o modal com os detalhes
async function openPokemonModal(id) {

	const requestId = ++modalRequestId;

	modalNeighbors = { prev: null, next: null };

	updateNavigationButtons();


	pokemonModalTitle.textContent =
		'Carregando...';


	pokemonModalBody.innerHTML = `
		<div class="text-center py-5">

			<div
				class="spinner-border text-danger"
				role="status"
			>

				<span class="visually-hidden">
					Carregando...
				</span>

			</div>


			<p class="mt-3 text-secondary">
				Buscando informações do Pokémon...
			</p>

		</div>
	`;


	pokemonModal.show();


	try {

		const pokemon = await fetchPokemonData(id);

		const neighbors = await getNeighbors(pokemon.id);


		// O usuário já pediu outro Pokémon
		if (requestId !== modalRequestId) {
			return;
		}


		modalNeighbors = neighbors;

		updateNavigationButtons();


		// Título
		pokemonModalTitle.textContent =
			`${formatName(pokemon.name)} ${formatId(pokemon.id)}`;


		// Habilidades
		const abilities = pokemon.abilities
			.map(
				(item) =>
					`<span class="badge bg-primary me-1 mb-1 text-capitalize">
						${formatName(item.ability.name)}${item.is_hidden ? ' (oculta)' : ''}
					</span>`
			)
			.join('');


		// Áudio
		const cry =
			pokemon.cries?.latest ||
			pokemon.cries?.legacy;


		const audioHTML = cry
			? `
				<audio
					controls
					class="w-100"
				>

					<source src="${cry}" type="audio/ogg">

					Seu navegador não suporta áudio.

				</audio>
			`
			: `
				<p class="text-body-secondary">
					Áudio não disponível.
				</p>
			`;


		// Estatísticas
		const stats = pokemon.stats
			.filter((stat) => statsConfig[stat.stat.name])
			.map((stat) => {

				const config = statsConfig[stat.stat.name];

				const percentage = Math.min(
					(stat.base_stat / maxStatValue) * 100,
					100
				);


				return `
					<div class="mb-3">

						<div
							class="d-flex justify-content-between"
						>

							<span class="fw-bold">
								${config.name}
							</span>

							<span>
								${stat.base_stat}
							</span>

						</div>


						<div
							class="progress"
							role="progressbar"
							aria-label="${config.name}"
							aria-valuenow="${stat.base_stat}"
							aria-valuemin="0"
							aria-valuemax="${maxStatValue}"
						>

							<div
								class="progress-bar ${config.color}"
								style="width: ${percentage}%"
							></div>

						</div>

					</div>
				`;

			})
			.join('');


		// Sprites
		const sprites = [

			{
				nome: 'Normal - Frente',
				url: pokemon.sprites.front_default
			},

			{
				nome: 'Normal - Costas',
				url: pokemon.sprites.back_default
			},

			{
				nome: 'Shiny - Frente',
				url: pokemon.sprites.front_shiny
			},

			{
				nome: 'Shiny - Costas',
				url: pokemon.sprites.back_shiny
			}

		];


		const spritesHTML = sprites
			.map((sprite) => {

				if (!sprite.url) {

					return `
						<div class="text-center">

							<div
								class="border rounded p-2 d-flex align-items-center justify-content-center"
								style="width: 120px; height: 120px;"
							>

								<small class="text-body-secondary">
									Indisponível
								</small>

							</div>


							<small class="d-block mt-2">
								${sprite.nome}
							</small>

						</div>
					`;

				}


				return `
					<div class="text-center">

						<img
							src="${sprite.url}"
							alt="${sprite.nome} de ${pokemon.name}"
							class="sprite-img border rounded p-2 bg-body-tertiary"
						>


						<small class="d-block mt-2">
							${sprite.nome}
						</small>

					</div>
				`;

			})
			.join('');


		// Conteúdo do modal
		pokemonModalBody.innerHTML = `

			<div class="row">


				<!-- Informações do Pokémon -->
				<div class="col-md-5 text-center mb-4">

					<img
						src="${
							pokemon.sprites.other['official-artwork']
								.front_default ||
							pokemon.sprites.front_default
						}"
						alt="${pokemon.name}"
						class="img-fluid"
						style="max-height: 250px;"
					>


					<div class="mt-3">
						${renderTypeBadges(pokemon.types)}
					</div>

				</div>


				<!-- Estatísticas -->
				<div class="col-md-7">

					<h5 class="fw-bold mb-3">
						Estatísticas
					</h5>

					${stats}

				</div>

			</div>


			<hr>


			<!-- Linha evolutiva (preenchida depois) -->
			<div class="mb-4">

				<h5 class="fw-bold mb-3">
					Linha evolutiva
				</h5>

				<div id="evolutionChain">

					<div class="text-center py-3">
						<div
							class="spinner-border spinner-border-sm text-danger"
							role="status"
						>
							<span class="visually-hidden">Carregando...</span>
						</div>
					</div>

				</div>

			</div>


			<!-- Habilidades -->
			<div class="mb-4">

				<h5 class="fw-bold">
					Habilidades
				</h5>

				<div class="mt-2">
					${abilities}
				</div>

			</div>


			<!-- Áudio -->
			<div class="mb-4">

				<h5 class="fw-bold mb-2">
					Som do Pokémon
				</h5>

				${audioHTML}

			</div>


			<!-- Sprites -->
			<div>

				<h5 class="fw-bold mb-3">
					Sprites
				</h5>


				<div
					class="d-flex flex-wrap justify-content-center gap-3"
				>

					${spritesHTML}

				</div>

			</div>

		`;


		loadEvolutionChain(pokemon, requestId);


	} catch (error) {

		if (requestId !== modalRequestId) {
			return;
		}


		pokemonModalTitle.textContent =
			'Erro';


		pokemonModalBody.innerHTML = `
			<div
				class="alert alert-warning text-center"
			>

				<h5>
					Não foi possível carregar os dados.
				</h5>

				<p class="mb-0">
					Tente fechar o modal e abrir novamente.
				</p>

			</div>
		`;

	}

}


// Clique nos cards
pokemonGrid.addEventListener('click', (event) => {

	const card =
		event.target.closest('.pokemon-card');


	if (!card) {
		return;
	}


	openPokemonModal(card.dataset.pokemonId);

});


// Abrir card utilizando Enter
pokemonGrid.addEventListener('keydown', (event) => {

	if (event.key !== 'Enter') {
		return;
	}


	const card =
		event.target.closest('.pokemon-card');


	if (!card) {
		return;
	}


	openPokemonModal(card.dataset.pokemonId);

});


// Navegação entre Pokémon no modal
prevPokemonBtn.addEventListener('click', () => {

	if (modalNeighbors.prev !== null) {
		openPokemonModal(modalNeighbors.prev);
	}

});


nextPokemonBtn.addEventListener('click', () => {

	if (modalNeighbors.next !== null) {
		openPokemonModal(modalNeighbors.next);
	}

});


// Setas do teclado também navegam no modal
pokemonModalElement.addEventListener('keydown', (event) => {

	if (event.target.closest('audio')) {
		return;
	}


	if (event.key === 'ArrowLeft') {
		prevPokemonBtn.click();
	}


	if (event.key === 'ArrowRight') {
		nextPokemonBtn.click();
	}

});


// Clique em um Pokémon da linha evolutiva
pokemonModalBody.addEventListener('click', (event) => {

	const item =
		event.target.closest('[data-evolution-id]');


	if (!item || item.getAttribute('aria-current')) {
		return;
	}


	openPokemonModal(item.dataset.evolutionId);

});


// Sorteia um id (respeitando os filtros ativos)
async function getRandomPokemonId() {

	let pool = filteredList;


	if (!pool || pool.length === 0) {

		try {

			const index = await getPokemonIndex();

			pool = index.filter((item) => item.id <= maxPokemonId);

		} catch (error) {

			return Math.floor(Math.random() * maxPokemonId) + 1;

		}
	}


	return pool[Math.floor(Math.random() * pool.length)].id;
}


// Botão "Aleatório"
randomBtn.addEventListener('click', async () => {

	openPokemonModal(await getRandomPokemonId());

});


// ===== Jogo "Quem é esse Pokémon?" =====

// Compara nomes ignorando maiúsculas, espaços e hífens
function isSameName(a, b) {

	const clean = (value) =>
		String(value).toLowerCase().replace(/[\s-]/g, '');

	return clean(a) === clean(b);
}


// Primeira letra de cada palavra em maiúscula
function capitalize(text) {

	return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}


// Atualiza o placar
function updateGuessScore() {

	guessScoreText.textContent =
		`Acertos: ${guessScore.hits} de ${guessScore.total}`;
}


// Mostra uma mensagem no jogo (texto seguro, sem HTML)
function showGuessFeedback(message, variant) {

	const text = document.createElement('p');

	text.className = `fw-bold mb-0 text-${variant}`;

	text.textContent = message;

	guessFeedback.replaceChildren(text);
}


// Começa uma nova rodada
async function newGuessRound() {

	const roundId = ++guessRoundId;

	guessPokemon = null;

	guessFinished = false;

	guessInput.value = '';

	guessInput.disabled = true;

	guessSubmitBtn.disabled = true;

	guessRevealBtn.disabled = true;

	guessFeedback.replaceChildren();

	guessImage.classList.add('d-none');

	guessImage.classList.remove('revealed');

	guessLoading.classList.remove('d-none');


	try {

		const pokemon = await fetchPokemonData(await getRandomPokemonId());

		const imageUrl =
			pokemon.sprites.other['official-artwork'].front_default ||
			pokemon.sprites.front_default;


		// Espera a imagem carregar para não mostrar a silhueta pela metade
		await new Promise((resolve) => {

			guessImage.onload = resolve;

			guessImage.onerror = resolve;

			guessImage.src = imageUrl;

		});


		if (roundId !== guessRoundId) {
			return;
		}


		guessPokemon = pokemon;

		guessLoading.classList.add('d-none');

		guessImage.classList.remove('d-none');

		guessInput.disabled = false;

		guessSubmitBtn.disabled = false;

		guessRevealBtn.disabled = false;

		guessInput.focus();

	} catch (error) {

		if (roundId !== guessRoundId) {
			return;
		}

		guessLoading.classList.add('d-none');

		showGuessFeedback('Não foi possível carregar o Pokémon. Clique em Próximo.', 'danger');

	}
}


// Termina a rodada mostrando o Pokémon
function finishGuessRound(message, variant) {

	guessFinished = true;

	guessScore.total++;

	updateGuessScore();

	guessImage.classList.add('revealed');

	guessInput.disabled = true;

	guessSubmitBtn.disabled = true;

	guessRevealBtn.disabled = true;

	showGuessFeedback(message, variant);

	guessNextBtn.focus();
}


// Envio do palpite
guessForm.addEventListener('submit', (event) => {

	event.preventDefault();


	if (!guessPokemon || guessFinished) {
		return;
	}


	const guess = guessInput.value.trim();


	if (!guess) {
		return;
	}


	const name = capitalize(formatName(guessPokemon.species.name));


	if (
		isSameName(guess, guessPokemon.name) ||
		isSameName(guess, guessPokemon.species.name)
	) {

		guessScore.hits++;

		finishGuessRound(`Acertou! É o ${name}! 🎉`, 'success');

	} else {

		showGuessFeedback('Não é esse... tente de novo!', 'danger');

		guessInput.select();

	}

});


// Desistir e revelar
guessRevealBtn.addEventListener('click', () => {

	if (!guessPokemon || guessFinished) {
		return;
	}


	finishGuessRound(
		`Era o ${capitalize(formatName(guessPokemon.species.name))}!`,
		'secondary'
	);

});


// Próxima rodada
guessNextBtn.addEventListener('click', newGuessRound);


// Abrir o jogo
guessGameBtn.addEventListener('click', () => {

	guessModal.show();

	newGuessRound();

});


// Filtros
typeFilter.addEventListener('change', applyFilters);

generationFilter.addEventListener('change', applyFilters);


// Encontra os Pokémon cujo nome contém o termo buscado
async function findPokemonByTerm(query) {

	// Número: busca direto pelo id
	if (/^\d+$/.test(query)) {
		return { total: 1, list: [await fetchPokemonData(Number(query))] };
	}


	let index;

	try {

		index = await getPokemonIndex();

	} catch (error) {

		// Sem a lista, tenta pelo nome exato
		return { total: 1, list: [await fetchPokemonData(query)] };

	}


	// Nome exato primeiro, depois quem começa com o termo, depois o resto
	const matches = index
		.filter((item) => item.name.includes(query))
		.sort((a, b) => {

			const score = (item) =>
				item.name === query ? 0 : item.name.startsWith(query) ? 1 : 2;

			return score(a) - score(b) || a.id - b.id;

		});


	const list = await Promise.all(
		matches
			.slice(0, searchResultsLimit)
			.map((item) => fetchPokemonData(item.id))
	);


	return { total: matches.length, list };
}


// Pesquisa por nome (parcial) ou número
async function handleSearch() {

	const query =
		normalizeQuery(searchInput.value);


	if (!query) {

		applyFilters();

		return;
	}


	// A busca procura em todos os Pokémon, sem filtros
	resetFilters();

	// Durante a busca o "Carregar mais" não faz sentido
	loadMoreWrapper.classList.add('d-none');

	clearMessage();

	showLoading(true);

	pokemonGrid.innerHTML = '';


	try {

		const result = await findPokemonByTerm(query);


		if (result.list.length === 0) {
			throw new Error('Nenhum resultado');
		}


		result.list.forEach(renderPokemonCard);


		if (result.total > result.list.length) {

			showMessage(
				`Mostrando ${result.list.length} de ${result.total} resultados. Refine a busca para ver outros.`,
				'info'
			);

		}


	} catch (error) {

		showError(
			`Nenhum Pokémon encontrado com o termo "${searchInput.value.trim()}".`
		);

	} finally {

		showLoading(false);

	}

}


// Mostra ou esconde o spinner principal
function showLoading(state) {

	if (state) {

		loading.classList.remove('d-none');

	} else {

		loading.classList.add('d-none');

	}

}


// Mostra uma mensagem (usa textContent para não interpretar HTML digitado)
function showMessage(message, variant) {

	const alert = document.createElement('div');

	alert.className = `alert alert-${variant} text-center`;

	alert.setAttribute('role', 'alert');

	alert.textContent = message;

	messageArea.replaceChildren(alert);
}


// Mostra mensagem de erro
function showError(message) {

	showMessage(message, 'warning');
}


// Remove a mensagem atual
function clearMessage() {

	messageArea.replaceChildren();
}


// Tema claro / escuro
function applyTheme(theme) {

	document.documentElement.setAttribute('data-bs-theme', theme);

	themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}


themeToggle.addEventListener('click', () => {

	const current =
		document.documentElement.getAttribute('data-bs-theme');

	const next = current === 'dark' ? 'light' : 'dark';


	applyTheme(next);


	try {
		localStorage.setItem('theme', next);
	} catch (error) {
		// Sem localStorage o tema só não fica salvo
	}

});


// Eventos da busca
searchBtn.addEventListener(
	'click',
	handleSearch
);


searchInput.addEventListener(
	'keydown',
	(event) => {

		if (event.key === 'Enter') {
			handleSearch();
		}

	}
);


// Evento do botão "Carregar mais"
loadMoreBtn.addEventListener(
	'click',
	loadMorePokemon
);


// Inicialização
applyTheme(document.documentElement.getAttribute('data-bs-theme'));

loadTypeOptions();

loadInitialPokemon();

loadSearchSuggestions();
