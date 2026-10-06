# Qualidade e enquadramento das imagens

Auditoria realizada em 6 de outubro de 2026. Foram inspecionados todos os pontos
de renderização de imagens de `public/app.js` e `public/gacha.js`, os estilos de
imagens/fundos e todos os arquivos raster de `public/assets`. Os assets que não
estão em uso foram mantidos. Nenhuma fonte externa nova foi adicionada.

## Fontes e resoluções

| Uso | Fonte existente | Dimensões verificadas | Tratamento |
| --- | --- | --- | --- |
| Retrato de Hsin | Encore `RolePortrait` | 2048 × 2032 | Arte completa nos detalhes e Builder; fallback para card/ícone |
| Card de Hsin | Encore `FormationRoleCard` | 696 × 960 | `contain`, sem recorte em card quadrado |
| Ícone de Hsin | Encore `RoleHeadIconLarge` | 256 × 256 | Preferido na Tier List e seleção do Builder; ícone original como fallback |
| Arma Verdant Summit | Encore `IconBig` | 732 × 392 | Usado nos detalhes; fallback para ícone de 256 × 256 |
| Echo consultado | Encore `Icon` | 256 × 256 | Maior versão fornecida pelo catálogo; mantém `contain` |
| Banners oficiais locais | Poster Kuro já usado pelo projeto | 928 × 516 | Original e variante WebP de 464 × 258; proporção natural |
| Fundo Home | JPEG existente | 12000 × 6750 | WebP 960/1600/2560 e nova variante 3840 × 2160 |
| Fundo interno | JPEG existente | 2560 × 1440 | WebP existente 960/1600/2560; seleção por densidade |
| Logo | PNG existente | 550 × 550 | WebP de 84 e 126 px para logo de 42 px em telas 2x/3x |
| Eventos de fallback | PNGs existentes e idênticos | 900 × 500 | WebP compartilhado 640/900; fallback para o PNG original |

As dimensões acima são amostras verificadas diretamente na Encore; outros
personagens/armas conservam os campos efetivamente fornecidos por cada registro.
Não são inventados URLs, variantes maiores ou parâmetros de transformação do CDN.
`IconBig` é convertido de caminho Unreal somente quando presente no registro da
arma; a conversão aponta ao mesmo endpoint de recursos Encore já utilizado.
Imagens oficiais externas de eventos continuam usando o URL anexado ao registro.

## Problemas corrigidos

- `cover` cortava personagens nos cards, no Builder e nas opções do Builder.
  Esses espaços agora usam `contain` centralizado. Os ícones são usados nas áreas
  pequenas, evitando reduzir um personagem inteiro a uma miniatura ilegível.
- Banners e notícias recebiam proporções fixas 21:9/16:9, e a lista Gacha, 2.6:1.
  Agora usam altura automática e proporção natural; o banner principal mantém
  `contain` ao atingir a altura máxima do layout.
- O fundo Home de 960 px era ampliado para cobrir um container alto no celular.
  O fundo agora escolhe 1600/2560 no celular e até 3840 em desktop com densidade
  alta. O zoom adicional de 1.02 foi removido. `cover` é mantido somente nos fundos
  decorativos de página; as artes de conteúdo são exibidas completas.
- `event-placeholder-1280.webp` tem somente 900 px de largura. A nova variante
  usa o nome e descritor verdadeiros, 900; o arquivo legado foi preservado para
  compatibilidade. Dimensões 1280 × 720 incorretas foram removidas das notícias.
- O fallback antigo alterava `src` sem remover `srcset`. A recuperação central
  agora tenta o `src` original se a variante responsiva falhar, remove `srcset`
  e `sizes`, e tenta cada fallback uma vez. Atualizações de imagem também
  preservam a versão anterior caso a imagem maior esteja indisponível.
- A classe visual de placeholder é removida quando uma imagem real volta a
  carregar, incluindo após uma falha temporária.

## Compressão e carregamento

WebP foi mantido para compatibilidade com o encoder Chrome já utilizado pelo
projeto, sem adicionar dependência de produção. Novas variantes usam qualidade
0.90; banners usam 0.94. A redução usa suavização de alta qualidade, conserva a
proporção e nunca aumenta os pixels de uma fonte menor. Derivados existentes não
são recomprimidos. Não há conversão de imagens raster para SVG; os SVGs de
fallback continuam sendo desenhos de símbolos.

O Home de 3840 px ocupa cerca de 1.10 MB, contra 12 MB do JPEG original, e só é
selecionado em telas que precisam dessa densidade. Os banners pequenos ocupam
41–57 KB. O logo de 126 px ocupa 7.8 KB. Imagens de catálogo continuam lazy e com
decodificação assíncrona; o banner principal Gacha recebe prioridade de download.
`srcset` usa somente versões da mesma arte, nunca mistura ícone e retrato.

## Verificação

- `npm test`: testes de catálogos, cache, personagens, banners, Tier List e Gacha.
- `npm run test:http`: compressão HTTP, ETags, WebP e contratos das APIs.
- `npm run test:responsive`: 214 verificações em três idiomas, de 320 a 1440 px.
- `npm run test:images`: 40 layouts de imagens em 320/390/768/1440 px,
  retrato de 2048 px, arma de 732 px, ícones do Builder, falhas em `srcset` e
  upgrades, recuperação do placeholder e escolha de fontes em telas 2x/3x.

Os testes de navegador de imagens usam registros de API de fixture e carregam as
imagens reais do CDN Encore e os assets locais. Isso permite testar enquadramento
e recuperação sem depender da existência de banners ativos naquele dia. Executar
com o servidor local em `PORT=4173`, como nas demais suítes de navegador.
`scripts/audit-image-sources.mjs` registra dimensões de todos os rasters locais e
amostras da API em `artifacts/image-sources-audit.json`. Os resultados de layout
ficam em `artifacts/image-display-verification.json`.
