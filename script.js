/* ============================================================
   Pokédex 90s - JavaScript puro
   - Consome a PokéAPI com fetch + then (e async/await)
   - Cria TODOS os cards dinamicamente (createElement + appendChild)
   - Favoritos salvos no localStorage
   ============================================================ */

"use strict";

// ---------- Configurações ----------
const API_URL = "https://pokeapi.co/api/v2";
const ULTIMO_ID = 386;     // Geração I a III (1996 a 2006)
const POR_PAGINA = 24;     // quantos cards carregar por vez
const CHAVE_FAVORITOS = "pokedex90:favoritos";

// ---------- Tradução e cores ----------
const TIPOS = {
  normal:   { nome: "Normal",   cor: "#8a8a6e" },
  fire:     { nome: "Fogo",     cor: "#e8641c" },
  water:    { nome: "Água",     cor: "#3d7de8" },
  grass:    { nome: "Planta",   cor: "#4a9e3a" },
  electric: { nome: "Elétrico", cor: "#c99a00" },
  ice:      { nome: "Gelo",     cor: "#3aa9b8" },
  fighting: { nome: "Lutador",  cor: "#b3281f" },
  poison:   { nome: "Veneno",   cor: "#8e3fa8" },
  ground:   { nome: "Terra",    cor: "#a8832c" },
  flying:   { nome: "Voador",   cor: "#6b83d6" },
  psychic:  { nome: "Psíquico", cor: "#e0407a" },
  bug:      { nome: "Inseto",   cor: "#7c9410" },
  rock:     { nome: "Pedra",    cor: "#8c7a2a" },
  ghost:    { nome: "Fantasma", cor: "#5d4a8c" },
  dragon:   { nome: "Dragão",   cor: "#4a2fd0" },
  dark:     { nome: "Sombrio",  cor: "#5a463a" },
  steel:    { nome: "Aço",      cor: "#6f7f94" },
  fairy:    { nome: "Fada",     cor: "#d0508f" }
};

const STATS = {
  "hp": "HP",
  "attack": "Ataque",
  "defense": "Defesa",
  "special-attack": "Atq. Esp.",
  "special-defense": "Def. Esp.",
  "speed": "Veloc."
};

// ---------- Estado da aplicação ----------
const estado = {
  todos: [],                 // índice leve: [{ id, name, url }]
  lista: [],                 // resultado dos filtros atuais
  exibidos: 0,               // quantos da lista já viraram card
  favoritos: carregarFavoritos(),
  somenteFavoritos: false,
  cacheTipos: new Map(),     // tipo -> Set de ids
  cacheRespostas: new Map(), // url -> JSON (cache local, como pede a PokéAPI)
  versao: 0                  // evita que respostas antigas sobrescrevam as novas
};

// ---------- Elementos da página ----------
const el = {
  grid: document.getElementById("grid"),
  status: document.getElementById("status"),
  btnMais: document.getElementById("btn-mais"),
  busca: document.getElementById("busca"),
  tipo: document.getElementById("tipo"),
  btnFav: document.getElementById("btn-favoritos"),
  contFav: document.getElementById("contador-fav"),
  destaque: document.getElementById("destaque-conteudo"),
  modal: document.getElementById("modal"),
  form: document.getElementById("filtros")
};

// ============================================================
// 1) Acesso à API (fetch)
// ============================================================

/** Faz um GET na API, valida a resposta e guarda em cache. */
function buscarJSON(url) {
  if (estado.cacheRespostas.has(url)) {
    return Promise.resolve(estado.cacheRespostas.get(url));
  }
  return fetch(url)
    .then((resposta) => {
      if (!resposta.ok) {
        throw new Error("A API respondeu com erro " + resposta.status);
      }
      return resposta.json();
    })
    .then((dados) => {
      estado.cacheRespostas.set(url, dados);
      return dados;
    });
}

/** Extrai o número do Pokémon a partir da URL (…/pokemon/25/ → 25). */
function idDaUrl(url) {
  const partes = url.split("/").filter(Boolean);
  return Number(partes[partes.length - 1]);
}

/** Lista leve com os 386 Pokémon (só nome e URL). */
function carregarIndice() {
  return buscarJSON(`${API_URL}/pokemon?limit=${ULTIMO_ID}`).then((dados) =>
    dados.results.map((p) => ({ id: idDaUrl(p.url), name: p.name, url: p.url }))
  );
}

/** Ids dos Pokémon de um tipo, já limitados às gerações I a III. */
function carregarIdsDoTipo(tipo) {
  if (estado.cacheTipos.has(tipo)) {
    return Promise.resolve(estado.cacheTipos.get(tipo));
  }
  return buscarJSON(`${API_URL}/type/${tipo}`).then((dados) => {
    const ids = new Set(
      dados.pokemon
        .map((item) => idDaUrl(item.pokemon.url))
        .filter((id) => id <= ULTIMO_ID)
    );
    estado.cacheTipos.set(tipo, ids);
    return ids;
  });
}

// ============================================================
// 2) Funções auxiliares de formatação
// ============================================================

function capitalizar(texto) {
  return texto
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function formatarNumero(id) {
  return "#" + String(id).padStart(3, "0");
}

function formatarMedida(valor) {
  // A API entrega altura em decímetros e peso em hectogramas
  return (valor / 10).toFixed(1).replace(".", ",");
}

function imagemDoPokemon(p) {
  const arte = p.sprites.other && p.sprites.other["official-artwork"];
  return (arte && arte.front_default) || p.sprites.front_default || "";
}

/** Cria um elemento com classe e texto de uma vez só. */
function criar(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

/** Ícone de coração (SVG criado via DOM). */
function criarCoracao() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 5 6 5c2 0 3.4 1.1 4.2 2.4h3.6C14.6 6.1 16 5 18 5c3.4 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z");
  svg.appendChild(path);
  return svg;
}

function criarTipos(pokemon) {
  const ul = criar("ul", "types");
  pokemon.types.forEach((t) => {
    const info = TIPOS[t.type.name] || { nome: capitalizar(t.type.name), cor: "#777" };
    const li = criar("li", "type", info.nome);
    li.style.setProperty("--type", info.cor);
    ul.appendChild(li);
  });
  return ul;
}

function criarBarraStat(chave, valor) {
  const linha = criar("div", "stat");
  linha.appendChild(criar("span", "stat__label", STATS[chave] || chave));

  const barra = criar("span", "bar");
  const preenchimento = criar("span", "bar__fill");
  preenchimento.style.setProperty("--w", Math.min(100, (valor / 160) * 100) + "%");
  barra.appendChild(preenchimento);
  linha.appendChild(barra);

  linha.appendChild(criar("span", "stat__value", String(valor)));
  return linha;
}

function valorStat(pokemon, chave) {
  const item = pokemon.stats.find((s) => s.stat.name === chave);
  return item ? item.base_stat : 0;
}

// ============================================================
// 3) Favoritos (localStorage)
// ============================================================

function carregarFavoritos() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS) || "[]");
    return new Set(Array.isArray(salvo) ? salvo : []);
  } catch (erro) {
    return new Set();
  }
}

function salvarFavoritos() {
  try {
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify([...estado.favoritos]));
  } catch (erro) {
    /* armazenamento indisponível: os favoritos valem só nesta sessão */
  }
}

function atualizarContadorFavoritos() {
  el.contFav.textContent = estado.favoritos.size;
}

function alternarFavorito(id, botao) {
  const agora = !estado.favoritos.has(id);
  if (agora) estado.favoritos.add(id);
  else estado.favoritos.delete(id);

  salvarFavoritos();
  atualizarContadorFavoritos();
  botao.setAttribute("aria-pressed", String(agora));

  // Sincroniza outros botões do mesmo Pokémon (ex.: modal aberto)
  document.querySelectorAll(`[data-fav-id="${id}"]`).forEach((b) => {
    b.setAttribute("aria-pressed", String(agora));
  });

  if (estado.somenteFavoritos && !agora) aplicarFiltros();
}

function criarBotaoFavorito(pokemon) {
  const botao = criar("button", "fav");
  botao.type = "button";
  botao.dataset.favId = pokemon.id;
  botao.setAttribute("aria-label", "Favoritar " + capitalizar(pokemon.name));
  botao.setAttribute("aria-pressed", String(estado.favoritos.has(pokemon.id)));
  botao.appendChild(criarCoracao());
  botao.addEventListener("click", () => alternarFavorito(pokemon.id, botao));
  return botao;
}

// ============================================================
// 4) Criação do CARD (DOM manipulation)
// ============================================================

function criarCard(pokemon) {
  const nome = capitalizar(pokemon.name);

  const card = criar("article", "card");

  // Cabeçalho: nome + número + coração
  const cabecalho = criar("div", "card__head");
  const titulo = criar("h3", "card__name", nome);
  titulo.appendChild(criar("span", "card__number", formatarNumero(pokemon.id)));
  cabecalho.appendChild(titulo);
  cabecalho.appendChild(criarBotaoFavorito(pokemon));
  card.appendChild(cabecalho);

  // Imagem
  const figura = criar("figure", "card__art");
  figura.style.margin = "0 1rem";
  const img = document.createElement("img");
  img.src = imagemDoPokemon(pokemon);
  img.alt = "Arte oficial de " + nome;
  img.loading = "lazy";
  img.width = 475;
  img.height = 475;
  figura.appendChild(img);
  card.appendChild(figura);

  // Corpo: tipos, medidas e status
  const corpo = criar("div", "card__body");
  corpo.appendChild(criarTipos(pokemon));

  const medidas = criar("dl", "facts");
  [["Altura", formatarMedida(pokemon.height) + " m"], ["Peso", formatarMedida(pokemon.weight) + " kg"]]
    .forEach(([rotulo, valor]) => {
      const bloco = document.createElement("div");
      bloco.appendChild(criar("dt", "", rotulo));
      bloco.appendChild(criar("dd", "", valor));
      medidas.appendChild(bloco);
    });
  corpo.appendChild(medidas);

  const stats = criar("div", "stats");
  ["hp", "attack", "defense"].forEach((chave) => {
    stats.appendChild(criarBarraStat(chave, valorStat(pokemon, chave)));
  });
  corpo.appendChild(stats);

  const detalhes = criar("button", "btn-small", "Ver detalhes");
  detalhes.type = "button";
  detalhes.addEventListener("click", () => abrirModal(pokemon));
  corpo.appendChild(detalhes);

  card.appendChild(corpo);
  return card;
}

// ============================================================
// 5) Modal de detalhes
// ============================================================

function abrirModal(pokemon) {
  const nome = capitalizar(pokemon.name);
  el.modal.replaceChildren();

  const interno = criar("div", "modal__inner");

  const topo = criar("div", "modal__top");
  const titulo = criar("h2", "modal__title", nome + " " + formatarNumero(pokemon.id));
  titulo.id = "modal-titulo";
  topo.appendChild(titulo);

  const acoes = criar("div");
  acoes.style.display = "flex";
  acoes.style.gap = ".4rem";
  acoes.appendChild(criarBotaoFavorito(pokemon));
  const fechar = criar("button", "btn-small", "Fechar");
  fechar.type = "button";
  fechar.addEventListener("click", () => el.modal.close());
  acoes.appendChild(fechar);
  topo.appendChild(acoes);
  interno.appendChild(topo);

  const figura = criar("figure", "card__art modal__art");
  figura.style.margin = "0";
  const img = document.createElement("img");
  img.src = imagemDoPokemon(pokemon);
  img.alt = "Arte oficial de " + nome;
  figura.appendChild(img);
  interno.appendChild(figura);

  interno.appendChild(criarTipos(pokemon));

  const blocoStats = criar("div");
  blocoStats.appendChild(criar("h3", "", "Status base"));
  const listaStats = criar("div", "stats");
  pokemon.stats.forEach((s) => listaStats.appendChild(criarBarraStat(s.stat.name, s.base_stat)));
  blocoStats.appendChild(listaStats);
  interno.appendChild(blocoStats);

  const blocoHab = criar("div");
  blocoHab.appendChild(criar("h3", "", "Habilidades"));
  const ul = criar("ul", "abilities");
  pokemon.abilities.forEach((h) => {
    ul.appendChild(criar("li", "", capitalizar(h.ability.name) + (h.is_hidden ? " (oculta)" : "")));
  });
  blocoHab.appendChild(ul);
  interno.appendChild(blocoHab);

  interno.appendChild(
    criar(
      "p", "",
      `Altura: ${formatarMedida(pokemon.height)} m. Peso: ${formatarMedida(pokemon.weight)} kg. ` +
      `Experiência base: ${pokemon.base_experience ?? "n/d"}.`
    )
  );

  el.modal.appendChild(interno);
  el.modal.showModal();
}

// Fecha ao clicar fora da caixa
el.modal.addEventListener("click", (evento) => {
  if (evento.target === el.modal) el.modal.close();
});

// ============================================================
// 6) Listagem, filtros e paginação
// ============================================================

function mostrarStatus(mensagem, erro = false) {
  el.status.textContent = mensagem;
  el.status.classList.toggle("status--error", erro);
}

function mostrarEsqueletos(quantidade) {
  for (let i = 0; i < quantidade; i++) {
    const s = criar("div", "skeleton");
    s.setAttribute("data-skeleton", "");
    el.grid.appendChild(s);
  }
}

function removerEsqueletos() {
  el.grid.querySelectorAll("[data-skeleton]").forEach((s) => s.remove());
}

/** Aplica busca + tipo + favoritos e recomeça a listagem. */
async function aplicarFiltros() {
  const versao = ++estado.versao;
  const termo = el.busca.value.trim().toLowerCase().replace("#", "");
  const tipo = el.tipo.value;

  el.grid.replaceChildren();
  el.btnMais.hidden = true;
  mostrarStatus("Carregando Pokémon...");

  try {
    let lista = estado.todos;

    if (tipo) {
      const ids = await carregarIdsDoTipo(tipo);
      lista = lista.filter((p) => ids.has(p.id));
    }
    if (termo) {
      lista = lista.filter((p) => p.name.includes(termo) || String(p.id) === termo);
    }
    if (estado.somenteFavoritos) {
      lista = lista.filter((p) => estado.favoritos.has(p.id));
    }

    if (versao !== estado.versao) return; // chegou uma busca mais nova

    estado.lista = lista;
    estado.exibidos = 0;

    if (lista.length === 0) {
      mostrarStatus(
        estado.somenteFavoritos && !termo && !tipo
          ? "Você ainda não favoritou nenhum Pokémon. Toque no coração de um card para salvar."
          : "Nenhum Pokémon encontrado. Tente outro nome, número ou tipo."
      );
      return;
    }

    await carregarMais(versao);
  } catch (erro) {
    if (versao !== estado.versao) return;
    mostrarStatus("Não foi possível carregar os dados da PokéAPI. Verifique sua conexão e tente de novo.", true);
    console.error(erro);
  }
}

/** Busca os detalhes do próximo lote e cria os cards. */
async function carregarMais(versao = estado.versao) {
  const lote = estado.lista.slice(estado.exibidos, estado.exibidos + POR_PAGINA);
  if (lote.length === 0) return;

  el.btnMais.disabled = true;
  mostrarEsqueletos(lote.length);

  try {
    // Uma requisição fetch por Pokémon, todas em paralelo
    const detalhes = await Promise.all(lote.map((p) => buscarJSON(p.url)));
    if (versao !== estado.versao) return;

    removerEsqueletos();
    const fragmento = document.createDocumentFragment();
    detalhes.forEach((pokemon) => fragmento.appendChild(criarCard(pokemon)));
    el.grid.appendChild(fragmento);

    estado.exibidos += lote.length;
    const total = estado.lista.length;
    mostrarStatus(`Mostrando ${estado.exibidos} de ${total} Pokémon.`);
    el.btnMais.hidden = estado.exibidos >= total;
  } catch (erro) {
    if (versao !== estado.versao) return;
    removerEsqueletos();
    mostrarStatus("Falha ao carregar este lote de Pokémon. Toque em “Carregar mais” para tentar de novo.", true);
    el.btnMais.hidden = false;
    console.error(erro);
  } finally {
    el.btnMais.disabled = false;
  }
}

// ============================================================
// 7) Destaque em tempo real (Pokémon sorteado)
// ============================================================

async function carregarDestaque() {
  const id = Math.floor(Math.random() * ULTIMO_ID) + 1;
  el.destaque.replaceChildren(criar("p", "screen__msg", "Consultando a PokéAPI..."));

  try {
    const pokemon = await buscarJSON(`${API_URL}/pokemon/${id}`);
    const nome = capitalizar(pokemon.name);
    const hora = new Date().toLocaleTimeString("pt-BR");

    const img = document.createElement("img");
    img.className = "screen__art";
    img.src = imagemDoPokemon(pokemon);
    img.alt = "Arte oficial de " + nome;

    const info = criar("div");
    info.appendChild(criar("h3", "screen__name", nome));
    info.appendChild(criar("p", "screen__meta", `${formatarNumero(pokemon.id)}. Consultado às ${hora}.`));
    info.appendChild(criarTipos(pokemon));

    const acoes = criar("div", "screen__actions");
    const outro = criar("button", "btn-small", "Sortear outro");
    outro.type = "button";
    outro.addEventListener("click", carregarDestaque);
    const ver = criar("button", "btn-small", "Ver detalhes");
    ver.type = "button";
    ver.addEventListener("click", () => abrirModal(pokemon));
    acoes.append(outro, ver);
    info.appendChild(acoes);

    el.destaque.replaceChildren(img, info);
  } catch (erro) {
    const msg = criar("p", "screen__msg", "Não foi possível consultar a PokéAPI agora.");
    const tentar = criar("button", "btn-small", "Tentar de novo");
    tentar.type = "button";
    tentar.addEventListener("click", carregarDestaque);
    el.destaque.replaceChildren(msg, tentar);
    console.error(erro);
  }
}

// ============================================================
// 8) Inicialização e eventos
// ============================================================

function preencherSeletorDeTipos() {
  Object.entries(TIPOS).forEach(([chave, info]) => {
    const opcao = document.createElement("option");
    opcao.value = chave;
    opcao.textContent = info.nome;
    el.tipo.appendChild(opcao);
  });
}

function debounce(funcao, espera) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcao(...args), espera);
  };
}

el.form.addEventListener("submit", (e) => e.preventDefault());
el.busca.addEventListener("input", debounce(aplicarFiltros, 350));
el.tipo.addEventListener("change", aplicarFiltros);
el.btnMais.addEventListener("click", () => carregarMais());
el.btnFav.addEventListener("click", () => {
  estado.somenteFavoritos = !estado.somenteFavoritos;
  el.btnFav.setAttribute("aria-pressed", String(estado.somenteFavoritos));
  aplicarFiltros();
});

async function iniciar() {
  preencherSeletorDeTipos();
  atualizarContadorFavoritos();
  carregarDestaque();

  try {
    estado.todos = await carregarIndice();
    await aplicarFiltros();
  } catch (erro) {
    mostrarStatus("Não foi possível carregar a lista de Pokémon da PokéAPI. Atualize a página para tentar de novo.", true);
    console.error(erro);
  }
}

iniciar();
