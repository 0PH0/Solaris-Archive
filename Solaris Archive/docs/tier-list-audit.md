# Auditoria da Tier List — 01/10/2026

## Implementação anterior

A página e a prévia da Home usavam `character.tiers`, preenchido por modelos genéricos de função, sobrescritas manuais e notas de três sites. Personagens novos herdavam essas notas sem avaliação específica. A função era inferida principalmente pelo tipo de arma. Dano, suporte e exploração eram tratados como rankings universais, sem separar os modos de endgame. O filtro de elemento era compartilhado com outras telas, e não havia pesquisa nem filtros próprios de arma, raridade ou função.

As imagens e páginas próprias já existem no catálogo. A API fornece identidade, elemento, arma e raridade, mas não notas da Prydwen. A correção deve separar o catálogo factual das avaliações, sem modificar os dados do Builder, Gacha ou das páginas de personagens.

## Referência conferida antes de alterar o site

https://www.prydwen.gg/wuthering-waves/tier-list confirma patch 3.7 e atualização em 30/09/2026. Estrutura: Tower of Adversity e Whimpering Wastes; DPS, Hybrid e Support; tiers T0, T0.5, T1, T1.5, T2, T3 e T4; busca, raridade, elemento e arma. A página também destaca sequências, arquétipos, exigência de execução e sinergias.

As avaliações foram conferidas nos perfis individuais da própria Prydwen em 01/10/2026. Um personagem pode ter funções e notas distintas em cada modo. Iuno, Phoebe e Brant são exemplos com duas funções. As condições de sequência S0, S2 e S6 serão mantidas por avaliação. As avaliações de desempenho e as de “Value” são listas diferentes; esta implementação usa somente desempenho.

O acesso direto de Chrome/HTTP à referência apresentou a verificação de segurança da Cloudflare. A leitura foi feita pela ferramenta de consulta web, sem contornar a verificação. Os critérios descritos no Solaris serão paráfrases do que foi verificável: desempenho em equipe, execução, função, modo e sequência; não serão acrescentadas suposições de arma, investimento ou nível que não tenham sido confirmadas.

## Decisões

Snapshot verificável e versionado das avaliações, sem scrape no carregamento do usuário. Notas nunca são inferidas da arma, raridade ou função. Todo personagem do catálogo aparece; ausência na referência gera “Sem avaliação”, separada dos tiers. A Home usa o mesmo snapshot para evitar duas classificações conflitantes. Os controles da Tier List têm estado próprio e pesquisa local com debounce de 160 ms, reutilizando imagens e rotas existentes.

O catálogo atual tem 60 personagens distintos, incluindo as quatro variantes do Rover. São 59 personagens avaliados, 62 avaliações por modo e um personagem sem avaliação (Suoming). Personagens com duas funções aparecem em ambas e são contados uma única vez no total de personagens. Os links da Tier List distinguem as variantes do Rover, preservando a rota antiga e os identificadores usados no Builder. As imagens do Rover vêm do mesmo catálogo de assets Encore já utilizado pelo projeto.

## Manutenção dos dados

As avaliações estão em `public/data/tier-list-3.7.json`, com fonte, patch, data da fonte, data de conferência, perfil individual e notas dos dois modos. O catálogo da API pode incorporar personagens novos; quando ainda não estiverem neste arquivo, aparecem sem nota. As notas editoriais **não são atualizadas automaticamente pela API de personagens**.

Para atualizar a referência, conferir novamente a página da Tier List e os perfis da Prydwen, registrar função, sequência e notas de desempenho de ambos os modos e atualizar o snapshot. Em um novo patch, versionar o arquivo e sua URL em `public/tier-list.js`; atualizar também a descrição da prévia da Home. Datas e patch da página principal são renderizados a partir do snapshot. Rodar `npm.cmd test` e `npm.cmd run test:tier`. Nunca preencher avaliações ausentes por inferência.

O arquivo é carregado uma vez por documento, com compartilhamento de requisições simultâneas e cache HTTP do servidor. Pesquisa, filtros e troca de modo processam os dados localmente. Imagens mantêm o lazy loading e o cache de detalhes existentes. Em caso de falha ou dados inválidos, a interface mostra erro e permite tentar novamente, sem restaurar notas antigas geradas.

## Validação concluída

- 23 testes unitários passaram, além da suíte do motor de Gacha.
- Tier List: dois modos, três idiomas, 320/390/768/1024/1440 px, sem rolagem horizontal; filtros combinados, pesquisa com debounce, funções duplas, quatro variantes do Rover, sequências, ausência de nota e recuperação após HTTP 503.
- Filtros e troca de modo não repetem chamadas do catálogo nem do snapshot; a troca de modo preserva o foco do botão.
- 214 verificações gerais de layout/navegação passaram, incluindo Builder, Gacha, menus por toque e cache, sem exceções JavaScript.
- Suíte de acessibilidade passou, incluindo teclado, foco, preferências persistidas, idiomas e rotas da Wiki.
- Capturas revisadas em `artifacts/tier-list-cards-390.png` e `artifacts/tier-list-cards-1440.png`; relatório em `artifacts/tier-list-validation.json`.

A regressão detectou uma remoção acidental da função vizinha de Ecos durante a substituição inicial do trecho. A função original foi restaurada antes da validação final; o comportamento da aba de Ecos foi preservado.
