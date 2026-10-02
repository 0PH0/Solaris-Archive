# Publicação na Vercel

O projeto é uma SPA em HTML/CSS/JavaScript nativos, com um servidor HTTP Node.js
em `server.js`. Não usa um framework de frontend nem requer transpilação.
A Vercel reconhece o servidor Node.js e produz uma Function; arquivos de `public/`
são servidos como assets. `vercel.json` inclui esses arquivos no servidor para
preservar o fallback de rotas da SPA. Não configurar a publicação como site
puramente estático: os endpoints `/api/*` precisam do servidor.

## Configuração do projeto

- Repositório: `https://github.com/0PH0/Solaris-Archive`.
- Diretório raiz: `Solaris Archive` (subpasta do repositório).
- Framework: Node.js (`node`).
- Runtime: Node.js 24.x, definido em `package.json`.
- Build e diretório de saída: padrões da Vercel para Node.js; sem override.
- Branch de produção: `main`.
- Integração GitHub: habilitada para esse repositório, com deploy automático.
- Acesso de produção: público, sem exigir autenticação da Vercel.
- HTTPS: usar o domínio `.vercel.app` fornecido pela plataforma.

O build é o empacotamento nativo da Vercel. Não executar `generate:assets` nem
`optimize:assets` no build: as imagens e os vídeos necessários já estão versionados.
As configurações da conta, da integração GitHub e do acesso público são verificadas
na plataforma; o arquivo de configuração sozinho não cria a integração Git.

## Ambiente e fontes externas

Nenhuma chave de API, banco de dados ou variável secreta é necessária pelo código
atual. `PORT` é opcional para execução local; na Vercel o runtime captura a chamada
a `listen()`. Não adicionar credenciais ao frontend nem versionar arquivos `.env`.

O servidor consulta o catálogo público de personagens, a Encore, o feed oficial
espelhado, o guia da Kuro e o canal oficial do YouTube. O navegador consulta os
catálogos públicos de armas/Echoes da Encore e carrega imagens do CDN e vídeos
do YouTube. Os endpoints da Encore precisam permitir CORS para a origem pública.
Caches do servidor ficam em memória por instância; não são armazenamento permanente
e podem ser perdidos em cold starts. Os tratamentos de falha existentes continuam
ativos, mas dados externos dependem da disponibilidade de seus fornecedores.

## Verificação

Antes de publicar, executar `npm test` e `npm run test:http`. Após o deploy, verificar
anonimamente a Home, rotas diretas e recarregamento, os endpoints `/api/characters`,
`/api/characters/1311`, `/api/character-media`, `/api/character-weapons/1311`,
`/api/events`, `/api/convenes`, assets WebP e vídeos WebM com suporte a byte ranges.
Conferir no navegador as imagens, o catálogo de armas/Echoes e ausência de erros de
CORS. Uma resposta HTTP 200 com `externalError` não confirma uma sincronização real.

Referências:
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/git
- https://vercel.com/docs/project-configuration/vercel-json
