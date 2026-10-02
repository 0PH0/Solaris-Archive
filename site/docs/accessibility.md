# Configurações → Acessibilidade

O painel existente de Configurações agora contém uma seção única de Acessibilidade. Não há rota nova. `public/settings-accessibility.js` é o único controlador; `public/accessibility.css` contém seus estilos. O módulo anterior e o bloco `.a11y-*` foram removidos. Os botões do cabeçalho e rodapé abrem o mesmo painel.

Os perfis Visual, Audição e Navegação podem ser combinados. Clicar em um perfil ativo desativa seus recursos; alterar uma opção individual atualiza o estado do perfil. Restaurar padrão desativa as preferências opcionais. Navegação básica por teclado, nomes acessíveis, foco básico e preferência de movimento reduzido do sistema operacional continuam disponíveis.

As preferências são validadas e salvas em `solaris:accessibility:v2` no localStorage. Preferências antigas ativas são migradas uma vez, e a chave v1 é removida. Armazenamento bloqueado mantém os ajustes apenas na sessão e apresenta um aviso. Eventos de storage sincronizam abas abertas.

## Recursos e limites de conteúdo

- Texto e interface podem ser ampliados separadamente. Alto contraste, contraste sobre imagens e paletas alternativas para protanopia, deuteranopia e tritanopia são independentes. As paletas ajustam indicadores da interface; não simulam daltonismo nem prometem corrigir a percepção das ilustrações.
- O zoom adiciona controles próprios ao lado das imagens de personagens, armas e Echoes. A imagem abre em diálogo, com ampliação de 100% a 300%, rolagem e restauração do foco, inclusive dentro do Builder.
- Tab e Enter usam controles nativos; Esc fecha diálogos, navegação móvel e sugestões de busca. Os atalhos opcionais são Alt+1 para conteúdo, Alt+2 para busca e Alt+3 para Configurações.
- O modo simplificado remove métricas e decoração do destaque e simplifica a apresentação dos painéis. Instruções diretas auxiliam os filtros de personagens e o Builder. Avisos visuais exibem resultados de ações; a convocação também mantém seu estado textual visível.
- Legendas do YouTube são solicitadas ao iniciar o próximo vídeo e dependem das faixas oferecidas pelo publicador. Vídeos HTML com faixas de legendas usam a mesma preferência.
- **Os trailers atuais não possuem transcrições locais.** A opção Transcrições mostra essa disponibilidade e orienta o acesso ao recurso “Mostrar transcrição” no YouTube pelo link do vídeo. Não há transcrição automática, extração de áudio ou texto inventado. Uma transcrição integral dentro da Wiki depende de conteúdo transcrito fornecido para cada vídeo.

## Verificação

Com `npm start` em execução, rode `npm run test:accessibility`. O teste usa Chrome local em modo headless (caminho Windows definido no script), sem dependências adicionais. Cobre perfis, opções, paletas, persistência, reset, falha de armazenamento, idiomas, legendas, zoom, teclado, foco, navegação entre rotas, Builder e larguras de 1440, 390 e 320 pixels. Capturas ficam em `artifacts/accessibility-v2-*.png`.

Os antigos comandos em `artifacts/check-accessibility*.mjs` apenas encaminham para esse teste. As verificações não equivalem a uma auditoria com usuários ou leitores de tela.
