# Responsividade e performance

## Auditoria antes das alterações

O site é uma SPA em JavaScript nativo, sem framework ou dependências de produção. `app.js` contém as 13 páginas, navegação, pesquisa local, catálogo de personagens, Builder e renderização dos componentes. `gacha.js` usa o motor independente `gacha-engine.js`. `settings-accessibility.js` controla preferências e diálogos. `styles.css` e `accessibility.css` já têm breakpoints, grids e suporte a movimento reduzido.

- Home, Introdução: o fundo original da Home pesa 12.217.344 bytes e também aparece na Introdução. O preload precisa usar a mesma variante do CSS para evitar download duplo.
- Personagens, Tier List: cards e filtros já usam grids adaptáveis; os resultados são atualizados parcialmente, mas a pesquisa reconstrói cards a cada tecla. Tags, nomes e mensagens longas precisam caber em 320 px.
- Armas, Echoes, Itens, Guia: imagens já usam lazy loading e proporção controlada. Tabelas têm rolagem interna necessária. Preservar esse comportamento, sem esconder transbordamentos da página.
- Builder: cinco slots, cálculo de custo, persistência e filtros já funcionam. O seletor usa `dialog` nativo, com altura limitada, mas precisa acomodar telas baixas e teclado virtual. A pesquisa de catálogo é local e roda a cada tecla.
- Gacha: vídeo já é solicitado somente depois da convocação, com `preload="none"`, suporte a Range e opção de pular. O cálculo é feito no `change`, portanto debounce adicional não é necessário. O módulo e seu motor são importados mesmo fora da página de convocações.
- Eventos, banners: preservar as consultas independentes. Convocações revalidam a cada cinco minutos e nas transições; usam `no-store` no navegador para não exibir banners vencidos. Eventos usam cache de 30 minutos na origem. Já existem deduplicação de requisições e tratamento de indisponibilidade.
- Notícias: dados locais, imagens lazy e arquivo separado; nenhuma API de notícias a otimizar.
- Menu: `sticky`, sem altura máxima ou rolagem própria; pode ocupar toda uma tela baixa. Cabeçalho fica apertado em 320 px. Alvos de toque e fontes dos campos não são uniformes.
- Servidor: ETags e cache HTTP existentes, mas sem gzip/Brotli. JSON é enviado com indentação. Manter revalidação de JS/CSS para atualização segura e suporte a Range dos vídeos.
- Serviços de armas e Echoes: cache em `localStorage` por seis horas e deduplicação de consultas simultâneas. Adicionar apenas cache em memória para quando armazenamento não estiver disponível; preservar validação, expiração e fallback.
- Assets locais de eventos e banners: os 12 PNGs têm exatamente o mesmo hash e 1.248.542 bytes cada. Podem compartilhar um único arquivo WebP derivado, preservando os originais e o conteúdo visual.

## Verificação

Foram aplicadas variantes WebP para os fundos (960, 1600 e 2560 px), logo e imagens locais compartilhadas. CSS e preload escolhem a mesma variante de fundo; imagens da Introdução e notícias usam `srcset`. Os arquivos originais foram preservados para regeneração. As imagens externas permanecem em suas fontes; vídeos WebM já compactados conservam seu conteúdo e carregamento após interação.

O menu passou a ter rolagem própria e altura limitada pelo viewport dinâmico. Campos e botões importantes têm alvos de 44 px em telas pequenas, fontes de campos de 16 px e textos longos podem quebrar linha. Os diálogos conservam rolagem interna. A largura mínima global de tabelas deixava o histórico do Gacha com rolagem horizontal desnecessária; o histórico agora usa largura flexível e colunas fixas. As tabelas extensas de Itens mantêm a rolagem interna necessária.

Gacha e seu motor carregam por `import()` somente na primeira visita à página, com opção de tentar novamente em caso de falha. Pesquisas locais de personagens, sugestões e seletores do Builder usam debounce de 160 ms, cancelado ao navegar, fechar ou pressionar Escape. Seleções, cálculos e campos de atributos continuam imediatos. Os serviços de catálogo compartilham o cache existente com memória, inclusive quando `localStorage` é bloqueado, mantendo validade de seis horas e fallback para dados antigos.

O servidor negocia Brotli/gzip para texto e JSON, envia JSON sem indentação e usa `Vary: Accept-Encoding`. ETags, revalidação de código, cache de assets e respostas `HEAD` foram preservados. Range dos vídeos permanece sem compressão adicional. Convocações continuam independentes do cache de eventos e com `no-store` no navegador.

| Asset | Original | Transferência otimizada |
| --- | ---: | ---: |
| Home | 12.217.344 B | 100.872 B (960 px), 259.302 B (1600 px), 485.856 B (2560 px) |
| Imagem local compartilhada de eventos/notícias | 1.248.542 B por PNG | 56.556 B (640 px), 104.258 B (900 px) |
| Logo | 69.225 B | 4.566 B |
| JavaScript principal | cerca de 204 KB | cerca de 52 KB por gzip/Brotli |
| CSS | cerca de 77 KB | cerca de 14–15 KB por gzip/Brotli |

Validação realizada no Chrome automatizado:

- 214 verificações de layout: 320, 390, 768, 1024 e 1440 px, páginas em português, inglês e espanhol, detalhes, resultados de Gacha e diálogos. Modais também foram medidos em 844 × 390 e 320 × 360. Nenhum transbordamento horizontal da página ou exceção de JavaScript na suíte.
- Menu aberto por toque real via protocolo do navegador, rolagem em tela baixa e fechamento ao navegar.
- Digitar `Jiyan` produz uma única atualização dos resultados e nenhuma consulta à API.
- Builder: cinco slots, custo máximo, seleção, pesquisa, atributos, troca do Echo principal, salvamento e recuperação; verificação com dados controlados e teste existente com catálogos reais.
- Gacha: carregamento adiado, vídeo solicitado após sorteio, pular animação, sorteios ×1/×10, garantia, contadores separados, calculadora e persistência do histórico. Os sorteios da suíte usam banners controlados para funcionar mesmo fora de uma fase ativa.
- Testes existentes de acessibilidade, regras de convocação, transições de banners e normalização/cache de Echoes; teste adicional de cache em memória com armazenamento bloqueado, expiração e indisponibilidade.
- Servidor temporário: Brotli/gzip descomprimem para os mesmos bytes originais, negociação, ETag/304, HEAD, Range/206 e Range inválido/416, MIME WebP e métodos HTTP.
- Endpoints reais: personagens, eventos e convocações responderam 200 sem erro externo; 54 personagens, nenhum evento elegível e quatro banners na consulta. Teste no navegador confirmou correspondência dos quatro banners às imagens oficiais e carregamento de todas elas, incluindo as que ficam abaixo da dobra.

Com o servidor local iniciado, executar `npm.cmd test`, `npm.cmd run test:responsive`, `npm.cmd run test:accessibility`, `npm.cmd run test:http` e `node scripts/check-convenes-browser.mjs`. Regenerar WebP com `npm.cmd run optimize:assets`. Os testes de navegador usam o Chrome instalado no Windows; os testes unitários não precisam dele. Relatórios em `artifacts/responsive-verification.json` e `artifacts/http-performance.json`; capturas em `artifacts/responsive-*.png`.

As resoluções foram emuladas no Chrome, sem teste em aparelhos físicos ou Safari. Os ganhos acima medem tamanho transferido, não uma pontuação Lighthouse nem tempo de carregamento em rede móvel real.
