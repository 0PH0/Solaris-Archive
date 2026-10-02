# Auditoria antes das alterações — 1 de outubro de 2026

- SPA existente: páginas de personagens geradas a partir do catálogo, rotas próprias, filtros com debounce, detalhes de armas carregados sob demanda e cache de seis horas da Encore. Não é necessário criar outro framework nem páginas HTML individuais.
- `/api/characters` descartava a Hsin porque a fonte primária registra raridade zero, elemento e arma vazios. A Encore, já usada por armas e Echoes, fornece Hsin 1311, cinco estrelas, Electro, Rectifier e os detalhes completos. Registros incompletos precisam de uma confirmação de lançamento, para evitar publicar personagens ainda não lançados.
- Imagens do repositório existente são predominantemente ícones pequenos. A Encore fornece `FormationRoleCard` (696 × 960 para Hsin) e `RolePortrait` (2048 × 2032). Consultar esses detalhes só quando o personagem estiver visível evita carregar todo o catálogo de detalhes na abertura.
- A notícia oficial 5546 e seu espelho no feed contêm os quatro banners atuais e omitem os dois da Hsin. A publicação oficial 5529 contém a arte, os nomes e o calendário da Hsin e da Blooming Jadehaven. Preservar os registros atuais e acrescentar somente os ausentes, com expiração de fase e deduplicação.
- Blooming Jadehaven 21050116 já existe no catálogo de armas da Encore. Associar o item à Hsin e reutilizar os detalhes e imagens dessa fonte. `InitWeaponItemId` no personagem é uma arma básica, não a assinatura.
- Showcase `a3zMk49qpwI` confirmado no canal oficial `UC0Bi5KMcECRVYis5Gb_ZYZQ`. O iframe permanece sob demanda. Novos vídeos devem ser reconhecidos exclusivamente nesse canal, com validação do proprietário.

Fontes verificadas: https://anzfactory.github.io/wuwaaan/characters.json ; https://api-v2.encore.moe/api/en/character ; https://wutheringwaves.kurogames.com/en/main/news/detail/5529 ; https://wutheringwaves.kurogames.com/en/main/news/detail/5571 ; https://wuwaguide.kurogames.com/ ; https://www.youtube.com/@WutheringWaves/videos

Os dois WebP adicionados são recortes da imagem oficial `https://hw-media-cdn-mingchao.kurogame.com/object/1790524800000/0rioucn8tj7k7gjeo5-1790578091396.jpg`, sem recriação da arte. Coordenadas no original 1080 × 14717: Hsin (76,1286,928,516); arma (76,4562,928,516). Extração reproduzível em `scripts/crop-official-banners.mjs`.

## Alterações e atualização automática

- Catálogo primário enriquecido pela Encore; lançamentos confirmados no feed podem entrar antes de a lista primária ficar completa. Registros incompletos sem confirmação permanecem fora. Registros anteriores são preservados se a fonte deixar de enviá-los.
- Página da Hsin corrigida: Electro/Rectifier, atributos no nível 90, biografia e dez habilidades da API. O cadastro local antigo dizia Spectro/Broadblade e exibia uma build gerada; esse conteúdo foi corrigido somente para a Hsin.
- Rotas de novos personagens são geradas automaticamente. Os personagens da versão mais recente ficam em destaque, com os anteriores na lista e com filtros/favoritos preservados.
- Armas continuam entrando pelo catálogo da Encore, e banners pelo feed atual. A associação explícita da Hsin foi verificada. Para páginas novas sem associação conhecida, o guia oficial é consultado sob demanda, com cache e deduplicação; uma arma só é vinculada quando a descrição identifica explicitamente sua assinatura e fornece seu ID. `InitWeaponItemId` não é usado. Novos banners/armas/vídeos dependem da publicação desses dados pelas fontes.
- Retratos de detalhe e artes para cards vêm da Encore. IntersectionObserver carrega os dados de personagens próximos à tela; limite de três consultas simultâneas, deduplicação e cache de seis horas no navegador e servidor. A falha da Encore não derruba o catálogo primário. A página oferece nova tentativa se os detalhes estiverem indisponíveis.
- O catálogo é revalidado após seis horas, inclusive com a página aberta. O feed de banners mantém cinco minutos e expiração na mudança de fase. Os dois banners complementares expiram em 22/10/2026 às 09:59 UTC+8 e não duplicam anúncios já presentes no feed.
- O Builder preserva a arma e o personagem salvos enquanto os catálogos da API carregam. Antes, uma arma nova ainda ausente do catálogo local podia ser substituída ao recarregar a build.
- Showcases novos são descobertos na página de vídeos do canal oficial, com validação de seu identificador. Mapeamentos já confirmados são preservados. O player só carrega após clique.

## Validação

- `npm.cmd test`: 18 testes e motor de Gacha; dados incompletos, inclusão de novo personagem sem cadastro manual, falhas de fonte, deduplicação/cache, três consultas simultâneas, expiração e preservação integral dos banners antigos, associação explícita de armas e proprietário dos vídeos.
- `npm.cmd run test:responsive`: 214 verificações em 320, 390, 768, 1024 e 1440 pixels, três idiomas, filtros, Builder, Gacha e persistência.
- `npm.cmd run test:hsin`: página e arma em 390, 768 e 1440 pixels; dez habilidades, retrato 2048 pixels, destaque no catálogo, ausência de iframe antes do clique, dois banners e convocações garantidas da Hsin e da Blooming Jadehaven. A seleção da personagem e da arma no Builder sobrevive ao recarregamento. Um personagem futuro simulado somente no navegador confirma criação automática da página, destaque, dados, showcase e associação de arma, mantendo os anteriores.
- `npm.cmd run test:accessibility`: navegação, foco, configurações, traduções, mobile, Builder e armazenamento bloqueado.
