const API_URL = 'https://pokeapi.co/api/v2/pokemon';

const pokemonGrid = document.getElementById('pokemonGrid');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

const pokemonModalElement = document.getElementById('pokemonModal');
const pokemonModal = new bootstrap.Modal(pokemonModalElement);

const pokemonModalTitle = document.getElementById('pokemonModalLabel');
const pokemonModalBody = document.getElementById('pokemonModalBody');


// Busca os dados de um Pokémon
async function fetchPokemonData(urlOrName) {

	const value = String(urlOrName);

	const url = value.startsWith('http')
		? value
		: `${API_URL}/${value.toLowerCase().trim()}`;

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error('Pokémon não encontrado');
	}

	return await response.json();
}


// Carrega os primeiros Pokémon
async function loadInitialPokemon(limit = 20) {

	showLoading(true);

	pokemonGrid.innerHTML = '';

	try {

		const response = await fetch(`${API_URL}?limit=${limit}`);

		if (!response.ok) {
			throw new Error('Erro ao buscar Pokémon');
		}

		const data = await response.json();

		const pokemonPromises = data.results.map((item) =>
			fetchPokemonData(item.url)
		);

		const pokemonList = await Promise.all(pokemonPromises);

		pokemonList.forEach(renderPokemonCard);

	} catch (error) {

		showError('Não foi possível carregar os Pokémon. Tente novamente.');

	} finally {

		showLoading(false);

	}
}


// Cria o card de cada Pokémon
function renderPokemonCard(pokemon) {

	const imageUrl =
		pokemon.sprites.other['official-artwork'].front_default ||
		pokemon.sprites.front_default;

	const typesBadges = pokemon.types
		.map(
			(t) =>
				`<span class="badge bg-secondary badge-type">
					${t.type.name}
				</span>`
		)
		.join('');

	const heightInMeters = (pokemon.height / 10).toFixed(1);
	const weightInKg = (pokemon.weight / 10).toFixed(1);

	const cardHTML = `
		<div class="col">

			<div
				class="card h-100 shadow-sm pokemon-card border-0"
				data-pokemon-id="${pokemon.id}"
				tabindex="0"
				role="button"
				aria-label="Ver detalhes de ${pokemon.name}"
			>

				<div class="text-center p-3 bg-white rounded-top">

					<img
						src="${imageUrl}"
						class="card-img-top img-fluid"
						style="max-height: 160px; object-fit: contain;"
						alt="${pokemon.name}"
					>

				</div>

				<div class="card-body">

					<div class="d-flex justify-content-between align-items-center mb-2">

						<h5 class="card-title text-capitalize fw-bold m-0">
							${pokemon.name}
						</h5>

						<small class="text-muted">
							#${String(pokemon.id).padStart(3, '0')}
						</small>

					</div>

					<div class="mb-3">
						${typesBadges}
					</div>

					<div class="row text-center border-top pt-2">

						<div class="col-6 border-end">

							<small class="text-muted d-block">
								Altura
							</small>

							<strong>
								${heightInMeters} m
							</strong>

						</div>

						<div class="col-6">

							<small class="text-muted d-block">
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

	pokemonGrid.insertAdjacentHTML('beforeend', cardHTML);
}


// Abre o modal com os detalhes
async function openPokemonModal(id) {

	pokemonModalTitle.textContent = 'Carregando...';

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

		pokemonModalTitle.textContent =
			`${pokemon.name} #${String(pokemon.id).padStart(3, '0')}`;

		// Habilidades
		const abilities = pokemon.abilities
			.map(
				(item) =>
					`<span class="badge bg-primary me-1 mb-1">
						${item.ability.name}
					</span>`
			)
			.join('');


		// Áudio
		let audioHTML = '';

		if (pokemon.cries && pokemon.cries.latest) {

			audioHTML = `
				<audio
					controls
					class="w-100"
				>
					<source src="${pokemon.cries.latest}">
					Seu navegador não suporta áudio.
				</audio>
			`;

		} else {

			audioHTML = `
				<p class="text-muted">
					Áudio não disponível.
				</p>
			`;

		}


		// Estatísticas
		const wantedStats = [
			'hp',
			'attack',
			'defense',
			'speed'
		];

		const stats = pokemon.stats
			.filter((stat) =>
				wantedStats.includes(stat.stat.name)
			)
			.map((stat) => {

				const percentage = Math.min(
					(stat.base_stat / 150) * 100,
					100
				);

				return `
					<div class="mb-3">

						<div class="d-flex justify-content-between">

							<span class="stat-name fw-bold">
								${stat.stat.name}
							</span>

							<span>
								${stat.base_stat}
							</span>

						</div>

						<div
							class="progress"
							role="progressbar"
							aria-label="${stat.stat.name}"
							aria-valuenow="${stat.base_stat}"
							aria-valuemin="0"
							aria-valuemax="150"
						>

							<div
								class="progress-bar bg-danger"
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
								<small class="text-muted">
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
							class="sprite-img border rounded p-2 bg-light"
						>

						<small class="d-block mt-2">
							${sprite.nome}
						</small>

					</div>
				`;

			})
			.join('');


		// Conteúdo final do modal
		pokemonModalBody.innerHTML = `

			<div class="row">

				<!-- Informações -->
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
						${pokemon.types
							.map(
								(t) =>
									`<span class="badge bg-secondary me-1 text-capitalize">
										${t.type.name}
									</span>`
							)
							.join('')}
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

				<div class="d-flex flex-wrap justify-content-center gap-3">

					${spritesHTML}

				</div>

			</div>

		`;

	} catch (error) {

		pokemonModalTitle.textContent = 'Erro';

		pokemonModalBody.innerHTML = `
			<div class="alert alert-warning text-center">

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


// Evento de clique nos cards
pokemonGrid.addEventListener('click', (event) => {

	const card = event.target.closest('.pokemon-card');

	if (!card) {
		return;
	}

	const pokemonId = card.dataset.pokemonId;

	openPokemonModal(pokemonId);

});


// Permite abrir o card usando Enter
pokemonGrid.addEventListener('keydown', (event) => {

	if (event.key !== 'Enter') {
		return;
	}

	const card = event.target.closest('.pokemon-card');

	if (!card) {
		return;
	}

	const pokemonId = card.dataset.pokemonId;

	openPokemonModal(pokemonId);

});


// Pesquisa por nome ou ID
async function handleSearch() {

	const query = searchInput.value.trim();

	if (!query) {

		loadInitialPokemon();

		return;
	}

	showLoading(true);

	pokemonGrid.innerHTML = '';

	try {

		const pokemon = await fetchPokemonData(query);

		renderPokemonCard(pokemon);

	} catch (error) {

		showError(
			`Nenhum Pokémon encontrado com o termo "${query}".`
		);

	} finally {

		showLoading(false);

	}

}


// Mostra/esconde spinner principal
function showLoading(state) {

	if (state) {

		loading.classList.remove('d-none');

	} else {

		loading.classList.add('d-none');

	}

}


// Mostra mensagem de erro
function showError(message) {

	pokemonGrid.innerHTML = `
		<div class="col-12">

			<div
				class="alert alert-warning text-center"
				role="alert"
			>
				${message}
			</div>

		</div>
	`;

}


// Eventos da busca
searchBtn.addEventListener('click', handleSearch);

searchInput.addEventListener('keypress', (event) => {

	if (event.key === 'Enter') {
		handleSearch();
	}

});


// Inicialização
loadInitialPokemon();