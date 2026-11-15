# Pokédex 90s

Site estático feito com **HTML, CSS e JavaScript puros** que consome a [PokéAPI](https://pokeapi.co/) e exibe cards de Pokémon das gerações I a III (1996 a 2006).

## Funcionalidades
- Cards criados 100% via JavaScript (`fetch`, `createElement`, `appendChild`).
- Cada card mostra nome, número, imagem oficial, tipos, altura, peso e barras de HP, Ataque e Defesa.
- Pokémon sorteado em tempo real no topo, com o horário da consulta.
- Busca por nome ou número, filtro por tipo e carregamento por lotes de 24.
- Favoritos salvos no `localStorage`.
- Janela de detalhes com todos os status e habilidades.
- Layout responsivo, foco visível no teclado e respeito a `prefers-reduced-motion`.

## Como executar
Abra o `index.html` no navegador (é preciso ter internet para acessar a API).
Se preferir um servidor local: `python -m http.server 8000` e acesse `http://localhost:8000`.

## Publicar no GitHub Pages
1. Crie um repositório e envie `index.html`, `style.css`, `script.js` e este `README.md`.
2. Em **Settings > Pages**, escolha a branch `main` e a pasta `/ (root)`.
3. O site ficará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## API
- Base: `https://pokeapi.co/api/v2/`. Sem token, somente GET.
- Política de uso justo: o projeto guarda as respostas em cache e carrega poucos itens por vez.

## Estrutura
```
index.html   estrutura da página (contêiner vazio para os cards)
style.css    estilos
script.js    consumo da API e criação dos cards
```
