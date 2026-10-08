# Calendário de eventos — revisão de 8 de outubro de 2026

## Estrutura preservada

A página reutiliza a navegação, os cards, o relógio, os controles, as traduções e `/api/events`. A antiga página de notícias possui conteúdo editorial local; não havia uma API de notícias adicional para integrar. A origem dos eventos continua sendo os anúncios oficiais da Kuro Games disponibilizados no feed já usado pelo projeto:

- `https://raw.githubusercontent.com/TheLovinator1/wutheringwaves/master/articles_latest.xml`
- `https://raw.githubusercontent.com/TheLovinator1/wutheringwaves/master/articles_all.xml`, arquivo da mesma fonte.

O leitor reconhece eventos individuais e seções de eventos nas notas de atualização. Não limita o resultado aos primeiros 12 eventos ativos. São preservados nomes, identidades, períodos, descrições, recompensas publicadas e imagens oficiais. Artigos de convocações continuam excluídos; a extração, a fonte e `/api/convenes` permanecem independentes.

## Datas, imagens e histórico

- Eventos são separados em ativos, futuros, anunciados com datas a confirmar e encerrados. Atividades permanentes não recebem uma data fictícia de término.
- O fim da manutenção publicado na própria fonte identifica a abertura dos eventos que começam após a atualização. A interface exibe “Atualização da versão”, sem afirmar que cada evento possui um horário exato de abertura.
- Períodos descritos em versões permanecem em versões, sem transformar o final de uma versão em uma data inventada.
- Datas sem horários permanecem como datas. Anúncios que usam PT são classificados pelo calendário de `America/Los_Angeles`; a interface identifica PT e informa que o horário exato não foi divulgado. Não converte essas datas em horários locais fictícios.
- Uma imagem específica de evento tem prioridade. Quando apenas a capa oficial do anúncio está disponível, o card a identifica como arte do anúncio. A ausência de imagem é indicada; nenhuma arte de outro evento é reaproveitada como se fosse específica.
- Os eventos anteriores são mesclados por identidade e período. Atualizações de atividades permanentes não criam cards duplicados. Registros ausentes em um feed mais recente continuam preservados.
- O arquivo completo é armazenado em memória por seis horas; eventos recentes são atualizados a cada 30 minutos, com pedidos simultâneos compartilhados. O navegador mantém os eventos consultados em `solaris:event-archive:v1` e os preserva após falhas de atualização.
- Não são usados eventos demonstrativos nem o código de exemplo WAVEBUILDER como conteúdo atual do jogo. A antiga função de exemplos foi mantida, mas deixou de ser chamada pelo fluxo real.

## Códigos independentes

Não existia uma API de códigos: a lista era fixa no frontend. Foi adicionado somente `/api/codes`, necessário para atualizar essa lista sem misturar eventos ou convocações. O widget existente é compartilhado entre a página de Eventos, a aba de Códigos e a página inicial.

Fontes consultadas automaticamente:

- https://www.pockettactics.com/wuthering-waves/codes
- https://beebom.com/wuthering-waves-redeem-codes/

O leitor considera somente as seções explicitamente ativas, exclui os códigos presentes nas listas de expirados e mantém as recompensas e a validade publicadas. Não considera a seção de transmissão ao vivo da Beebom como uma confirmação de validade atual. Repetições são consolidadas, e uma indicação de expiração prevalece sobre a listagem ativa de outra fonte.

As consultas têm armazenamento de uma hora e um ciclo próprio. Falhas são sinalizadas, com nova tentativa após dois minutos no servidor. Se nenhuma fonte puder ser validada, códigos antigos não são apresentados como confirmados ativos. Se apenas uma fonte responder, os códigos dessa fonte continuam disponíveis com aviso da atualização parcial. Não há tentativa de resgate em contas de jogadores.

Na conferência de 8 de outubro, as duas fontes listavam WUTHERINGGIFT; a Beebom também listava DVME2MOHOQJT. Nenhuma delas divulgava uma data de expiração para esses registros. São resultados da consulta, não uma lista cadastrada no site.

## Interface e verificação

A página oferece resumo, navegação por seção, pesquisa, filtro de categoria, horário local/servidor, botão de atualização, códigos copiáveis e histórico paginado. Na visão geral, o histórico fica recolhido para evitar excesso de conteúdo. Novos textos seguem `pt-BR`, `en` e `es`; nomes próprios são preservados.

- `npm test`: 46 testes e verificação do mecanismo de convocações. Inclui leitura das notas oficiais, arquivo, imagens, períodos, datas sem horários, preservação após falhas, códigos expirados, pedidos compartilhados e independência das convocações.
- `npm run test:events`: navegação, pesquisa/categoria, paginação, cópia, expiração e indisponibilidade das fontes nos três idiomas, em 320, 390, 768 e 1440 pixels.
- `npm run test:translations`: regressão das 57 páginas/detalhes nos três idiomas.

As fixtures reproduzem trechos e registros das fontes consultadas para tornar os testes previsíveis. Elas não alimentam o site. Relatórios, respostas completas e imagens de verificação ficam somente em `artifacts/`.
