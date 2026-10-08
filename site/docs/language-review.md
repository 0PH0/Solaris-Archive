# Revisão dos idiomas — 8 de outubro de 2026

Os idiomas continuam sendo `pt-BR`, `en` e `es`, com os mesmos caminhos, seleção de idioma e dicionários existentes. As mudanças abrangem navegação, pesquisa, filtros, configurações, montagem de equipamentos, convocações, catálogos, guias, notícias, eventos, rodapé e mensagens de carregamento/erro.

## Interface e dados

- Os dicionários principal e do Builder têm as mesmas chaves nos três idiomas. Textos estáticos adicionais usam traduções de apresentação compartilhadas, incluindo rótulos dos atributos, classes, tipos de arma, funções e elementos.
- IDs, nomes oficiais, imagens, números, valores dos filtros e equipamentos salvos permanecem canônicos. Os filtros exibem rótulos traduzidos; a pesquisa também reconhece os elementos traduzidos.
- Descrições de personagens e armas e efeitos das Sonatas usam os textos dos idiomas disponíveis na mesma fonte Encore. Não foram modificados o servidor, as APIs ou os carregadores dos catálogos originais. `pt-BR` corresponde ao caminho `pt` da Encore; espanhol usa `es`; inglês mantém os dados originais.
- `source-localization.js` lê somente os campos de texto necessários, com pedidos compartilhados, quatro solicitações simultâneas no máximo e armazenamento separado por idioma durante seis horas. As descrições são solicitadas quando sua página é aberta ou quando necessárias no Builder.
- A lista portuguesa de Echoes utiliza `phantomsList`, enquanto as demais usam `Echo`. Os efeitos localizados das Sonatas são associados pelo ID do conjunto, usando os nomes de grupos presentes na própria fonte para encontrar seus detalhes. A quantidade de peças continua vindo do catálogo original.
- Uma falha mantém traduções já armazenadas daquele idioma. Sem tradução disponível, a interface mostra um aviso no idioma selecionado e o acesso à fonte, em vez de apresentar a descrição em outro idioma. Novas tentativas são limitadas por um intervalo de um minuto.
- Os títulos e destaques estruturados de banners traduzem os rótulos e as frases de interface, preservando nomes próprios. O título do documento e seus metadados acompanham o idioma escolhido.

## Verificação

`scripts/fixtures/encore-localized-text.json` contém amostras reais de português e espanhol da Encore: os efeitos dos 37 conjuntos de Sonatas, descrições de Verdant Summit e Ages of Harvest e a introdução e habilidades de Hsin. É uma fixture de testes; o site continua lendo sua fonte de dados.

- `npm test`: 39 testes, mais as verificações do mecanismo de convocações. Inclui igualdade de chaves, valores numéricos preservados, nomes próprios, separação de idiomas, compartilhamento de pedidos, armazenamento offline e o formato português dos Echoes.
- `npm run test:translations`: 57 páginas/detalhes nos três idiomas, em 390 e 1440 pixels; navegação, textos da fonte, pesquisa traduzida, Builder, equipamentos salvos, convocações, configurações e falhas da fonte sem erros de JavaScript.
- `npm run test:archive`: 187 Echoes, 42 aparências Phantom associadas aos originais, 37 Sonatas, filtros combinados e cards compactos nos três idiomas e em quatro larguras: 320, 390, 768 e 1440 pixels.

Os testes de navegador usam respostas controladas e amostras reais para verificar a interface sem depender da disponibilidade dos serviços externos durante cada execução. Os relatórios e imagens gerados ficam em `artifacts/` e não são publicados.
