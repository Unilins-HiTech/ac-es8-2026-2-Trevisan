// ===== Times Pokémon (CRUD salvo no banco pela nossa API) =====
// Usa funções do app.js: getPokemonIndex, fetchPokemonData, normalizeQuery,
// formatName, capitalize, SPRITE_URL e maxPokemonId.

const teamsBtn = document.getElementById('teamsBtn');
const teamsModal = new bootstrap.Modal(document.getElementById('teamsModal'));

const teamsListView = document.getElementById('teamsListView');
const newTeamBtn = document.getElementById('newTeamBtn');
const teamsMessage = document.getElementById('teamsMessage');
const teamsList = document.getElementById('teamsList');

const teamForm = document.getElementById('teamForm');
const teamFormTitle = document.getElementById('teamFormTitle');
const teamNameInput = document.getElementById('teamNameInput');
const teamTrainerInput = document.getElementById('teamTrainerInput');
const teamPokemonInput = document.getElementById('teamPokemonInput');
const addTeamPokemonBtn = document.getElementById('addTeamPokemonBtn');
const teamCount = document.getElementById('teamCount');
const teamSlots = document.getElementById('teamSlots');
const teamFormFeedback = document.getElementById('teamFormFeedback');
const cancelTeamBtn = document.getElementById('cancelTeamBtn');
const saveTeamBtn = document.getElementById('saveTeamBtn');


const MAX_TEAM_SIZE = 6;

// Times carregados da API
let teams = [];

// Id do time sendo editado (null = criando um novo)
let editingTeamId = null;

// Ids dos Pokémon escolhidos no formulário
let teamDraft = [];

// Nome de cada Pokémon pelo id (montado a partir da lista da PokéAPI)
let pokemonNamesById = new Map();


// Monta o mapa id → nome (se a lista não carregar, mostra "#id")
async function loadPokemonNames() {

	if (pokemonNamesById.size > 0) {
		return;
	}


	try {

		const index = await getPokemonIndex();

		pokemonNamesById = new Map(index.map((item) => [item.id, item.name]));

	} catch (error) {
		// Continua sem os nomes
	}
}


// Nome bonito de um Pokémon pelo id
function getPokemonName(id) {

	const name = pokemonNamesById.get(id);

	return name ? capitalize(formatName(name)) : `#${id}`;
}


// Mensagem simples (texto seguro, sem HTML)
function showTeamsAlert(container, message, variant) {

	const alert = document.createElement('div');

	alert.className = `alert alert-${variant} py-2 small`;

	alert.textContent = message;

	container.replaceChildren(alert);
}


// ----- Lista de times -----

// Mostra a lista e esconde o formulário
function showTeamsList() {

	teamForm.classList.add('d-none');

	teamsListView.classList.remove('d-none');

	loadTeams();
}


// Busca os times na API
async function loadTeams() {

	teamsList.innerHTML = '';

	showTeamsAlert(teamsMessage, `Carregando times... ${COLD_START_HINT}`, 'secondary');


	try {

		await loadPokemonNames();

		teams = await backendRequest('/times');


		if (teams.length === 0) {

			showTeamsAlert(teamsMessage, 'Nenhum time criado ainda. Clique em "+ Novo time"!', 'info');

			return;
		}


		teamsMessage.replaceChildren();

		renderTeams();

	} catch (error) {

		showTeamsAlert(teamsMessage, error.message, 'danger');

	}
}


// Desenha os cards dos times
function renderTeams() {

	teamsList.innerHTML = teams
		.map((team) => {

			const sprites = team.pokemons
				.map((id) => {

					const name = escapeHTML(getPokemonName(id));

					return `
						<img
							src="${SPRITE_URL}/${id}.png"
							alt="${name}"
							title="${name}"
							width="56"
							height="56"
						>
					`;

				})
				.join('');


			return `
				<div class="col">

					<div class="card h-100 shadow-sm">

						<div class="card-body">

							<h6 class="card-title fw-bold mb-0">
								${escapeHTML(team.nome)}
							</h6>

							<small class="text-body-secondary">
								Treinador: ${escapeHTML(team.treinador)}
							</small>

							<div class="d-flex flex-wrap my-2">
								${sprites}
							</div>

							<div class="d-flex gap-2">

								<button
									type="button"
									class="btn btn-sm btn-outline-primary"
									data-edit-team="${team.id}"
								>
									Editar
								</button>

								<button
									type="button"
									class="btn btn-sm btn-outline-danger"
									data-delete-team="${team.id}"
								>
									Excluir
								</button>

							</div>

						</div>

					</div>

				</div>
			`;

		})
		.join('');
}


// Botões Editar / Excluir dos cards
teamsList.addEventListener('click', async (event) => {

	const editBtn = event.target.closest('[data-edit-team]');

	const deleteBtn = event.target.closest('[data-delete-team]');


	if (editBtn) {

		const team = teams.find(
			(item) => item.id === Number(editBtn.dataset.editTeam)
		);

		openTeamForm(team);

		return;
	}


	if (!deleteBtn) {
		return;
	}


	const team = teams.find(
		(item) => item.id === Number(deleteBtn.dataset.deleteTeam)
	);


	if (!team || !confirm(`Excluir o time "${team.nome}"?`)) {
		return;
	}


	deleteBtn.disabled = true;


	try {

		await backendRequest(`/times/${team.id}`, { method: 'DELETE' });

		loadTeams();

	} catch (error) {

		deleteBtn.disabled = false;

		showTeamsAlert(teamsMessage, error.message, 'danger');

	}

});


// ----- Formulário -----

// Abre o formulário (vazio para criar, preenchido para editar)
function openTeamForm(team = null) {

	editingTeamId = team ? team.id : null;

	teamFormTitle.textContent = team ? 'Editar time' : 'Novo time';

	teamNameInput.value = team ? team.nome : '';

	teamTrainerInput.value = team ? team.treinador : '';

	teamPokemonInput.value = '';

	teamDraft = team ? [...team.pokemons] : [];

	teamFormFeedback.replaceChildren();


	// Sugere o último nome de treinador usado
	if (!team) {

		try {
			teamTrainerInput.value = localStorage.getItem('playerName') || '';
		} catch (error) {}

	}


	renderTeamSlots();

	teamsListView.classList.add('d-none');

	teamForm.classList.remove('d-none');

	teamNameInput.focus();
}


// Desenha os Pokémon escolhidos no formulário
function renderTeamSlots() {

	teamCount.textContent = teamDraft.length;

	addTeamPokemonBtn.disabled = teamDraft.length >= MAX_TEAM_SIZE;


	if (teamDraft.length === 0) {

		teamSlots.innerHTML = `
			<small class="text-body-secondary">
				Nenhum Pokémon adicionado.
			</small>
		`;

		return;
	}


	teamSlots.innerHTML = teamDraft
		.map((id, position) => {

			const name = escapeHTML(getPokemonName(id));

			return `
				<div class="border rounded p-1 text-center position-relative" style="width: 90px;">

					<button
						type="button"
						class="btn-close position-absolute top-0 end-0 m-1"
						style="font-size: 0.6rem;"
						aria-label="Remover ${name}"
						data-remove-position="${position}"
					></button>

					<img
						src="${SPRITE_URL}/${id}.png"
						alt="${name}"
						width="64"
						height="64"
					>

					<small class="d-block text-truncate">
						${name}
					</small>

				</div>
			`;

		})
		.join('');
}


// Remover um Pokémon do time
teamSlots.addEventListener('click', (event) => {

	const button = event.target.closest('[data-remove-position]');


	if (!button) {
		return;
	}


	teamDraft.splice(Number(button.dataset.removePosition), 1);

	renderTeamSlots();

});


// Adicionar um Pokémon ao time
async function addPokemonToTeam() {

	const query = normalizeQuery(teamPokemonInput.value);


	if (!query) {
		return;
	}


	if (teamDraft.length >= MAX_TEAM_SIZE) {

		showTeamsAlert(teamFormFeedback, `O time já tem ${MAX_TEAM_SIZE} Pokémon.`, 'warning');

		return;
	}


	addTeamPokemonBtn.disabled = true;


	try {

		const pokemon = await fetchPokemonData(query);


		// Formas especiais (mega, regionais...) usam o Pokémon principal
		const id = pokemon.id <= maxPokemonId
			? pokemon.id
			: Number(pokemon.species.url.split('/').filter(Boolean).pop());


		pokemonNamesById.set(id, pokemonNamesById.get(id) || pokemon.species.name);

		teamDraft.push(id);

		teamPokemonInput.value = '';

		teamFormFeedback.replaceChildren();

		renderTeamSlots();

	} catch (error) {

		showTeamsAlert(teamFormFeedback, `Pokémon "${teamPokemonInput.value.trim()}" não encontrado.`, 'warning');

	} finally {

		addTeamPokemonBtn.disabled = teamDraft.length >= MAX_TEAM_SIZE;

		teamPokemonInput.focus();

	}
}


addTeamPokemonBtn.addEventListener('click', addPokemonToTeam);


// Enter no campo do Pokémon adiciona (em vez de salvar o formulário)
teamPokemonInput.addEventListener('keydown', (event) => {

	if (event.key === 'Enter') {

		event.preventDefault();

		addPokemonToTeam();
	}

});


// Salvar (criar ou atualizar)
teamForm.addEventListener('submit', async (event) => {

	event.preventDefault();


	const body = {
		nome: teamNameInput.value.trim(),
		treinador: teamTrainerInput.value.trim(),
		pokemons: teamDraft
	};


	if (!body.nome || !body.treinador) {

		showTeamsAlert(teamFormFeedback, 'Preencha o nome do time e do treinador.', 'warning');

		return;
	}


	if (body.pokemons.length === 0) {

		showTeamsAlert(teamFormFeedback, 'Adicione pelo menos 1 Pokémon.', 'warning');

		return;
	}


	saveTeamBtn.disabled = true;

	showTeamsAlert(teamFormFeedback, `Salvando... ${COLD_START_HINT}`, 'secondary');


	try {

		await backendRequest(
			editingTeamId ? `/times/${editingTeamId}` : '/times',
			{
				method: editingTeamId ? 'PUT' : 'POST',
				body
			}
		);


		try {
			localStorage.setItem('playerName', body.treinador);
		} catch (error) {}


		showTeamsList();

	} catch (error) {

		showTeamsAlert(teamFormFeedback, error.message, 'danger');

	} finally {

		saveTeamBtn.disabled = false;

	}

});


cancelTeamBtn.addEventListener('click', showTeamsList);

newTeamBtn.addEventListener('click', () => openTeamForm());


// Abrir o modal de times
teamsBtn.addEventListener('click', () => {

	teamsModal.show();

	showTeamsList();

});
