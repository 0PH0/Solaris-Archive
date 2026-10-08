# Ajustes dos catálogos e do rodapé

- O filtro de armas conserva o seletor e seus tipos existentes, com painel responsivo, funil SVG, contagem de resultados, foco e hover. Animações respeitam redução de movimento.
- Cards de armas exibem o nome da passiva, quando disponível na Encore. Textos completos continuam nos detalhes da arma.
- Cards de Sonatas apresentam uma prévia curta dos efeitos já resolvidos pela API, sem modificar valores. Todo o card abre os efeitos completos.
- Configurações usa um SVG de tamanho fixo de 20 px, mantendo o mesmo botão e diálogo. O rodapé contém um aviso discreto sobre desenvolvimento com auxílio de inteligência artificial. Nenhum asset de imagem foi alterado.
- Phantom são associados por `ParentMonsterId` obtido dos detalhes da Encore, sem inferência por nome. A aba de Echoes e os membros das Sonatas listam os originais; os Phantom aparecem como skins selecionáveis nos detalhes. Links antigos para skins abrem o respectivo Echo original.
- O filtro de variantes Phantom encontra Echoes com skins; a pesquisa também considera os nomes dessas skins. Os registros compartilhados do Builder permanecem disponíveis para preservar as seleções e builds existentes.
- O cache de Echoes passa a v4 para atualizar instalações que ainda não possuem os vínculos dos Phantom.

## Validação

API Encore consultada em 08/10/2026: 187 Echoes originais, 42 skins, todas vinculadas a um original válido, e 37 Sonatas com efeitos resolvidos. As imagens das skins vêm do mesmo catálogo Encore.

`npm test`: 35 testes aprovados, além da validação de gacha. `npm run test:archive`: três idiomas, larguras 320, 390, 768 e 1440 px, filtros combinados, seleção de skins, links antigos, cards resumidos, rodapé e abertura das Configurações. Capturas locais em `artifacts/` não são publicadas.

`npm run test:accessibility` confirmou os controles de Configurações antes de falhar na verificação de transbordamento da página inicial (348 px), com texto/interface ampliados e zoom ativos. A mesma falha foi reproduzida na versão anterior, servida separadamente em 4174. O problema preexistente da página inicial permanece fora destes ajustes.
