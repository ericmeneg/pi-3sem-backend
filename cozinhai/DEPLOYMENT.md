# CozinhAI — Guia de implantação

Este documento descreve como operar a implantação do CozinhAI no servidor doméstico `vostro-srv`. Os comandos pressupõem que os projetos estejam nos caminhos abaixo:

| Componente | Diretório no servidor |
|---|---|
| Repositório backend | `~/apps/pi-3sem-backend` |
| Compose do backend e `cloudflared` | `~/apps/pi-3sem-backend/cozinhai` |
| Frontend | `~/apps/frontend-repo/cozinhai-next` |
| Caddy | `~/apps/caddy` |

O frontend e o backend estão em repositórios e projetos Compose separados. Caddy e Cloudflare Tunnel são escolhas de infraestrutura do servidor, não componentes obrigatórios do CozinhAI. Nesta instalação, ambos são executados em containers Docker para publicar os serviços. A aplicação pode ser implantada por outro mecanismo de proxy/acesso sem alteração da sua arquitetura funcional.

## Repositórios da aplicação e configuração local

Os repositórios do backend e do frontend foram clonados via HTTPS para fornecer o código da aplicação. O objetivo desta implantação é configurar e operar a infraestrutura do servidor; não é necessário alterar nem enviar mudanças aos repositórios remotos do produto.

Os arquivos de implantação criados para este servidor (`Dockerfile`, `compose.yaml` e `.dockerignore`) permanecem como configurações locais nos diretórios de trabalho indicados neste guia. O Compose do backend também inicia o conector opcional do Tunnel. Essas alterações locais não são automaticamente sincronizadas com GitHub e não devem ser tratadas como alterações já publicadas no projeto. Ao atualizar o código com Git, confira primeiro o estado do checkout e preserve os arquivos locais de implantação. Não use comandos que descartem alterações locais.

Este `DEPLOYMENT.md` é documentação operacional da implantação. Pode ser guardado junto ao material do PI ou copiado para o servidor; sua inclusão no repositório da aplicação é opcional e não é necessária para que os serviços funcionem.

Arquivos com credenciais, como `.env`, `.env.local` e `.env.cloudflared`, permanecem apenas no servidor e não devem ser adicionados ao Git. Na recuperação em outro host, clone o código via HTTPS, recrie os arquivos locais de implantação conforme este guia e configure novamente os arquivos de ambiente usando cópias seguras ou credenciais rotacionadas.

## Arquitetura

```text
Navegador
   |
   | HTTPS
   v
Cloudflare Tunnel (opcional; infraestrutura do servidor)
   |
   | HTTP para localhost:80 no host
   v
Caddy (127.0.0.1:80)
   |                              |
   | cozinhai.monpy.com.br       | apicozinhai.monpy.com.br
   v                              v
Next.js                         NestJS
127.0.0.1:3000                 127.0.0.1:3001
                                    |
                                    v
                               MongoDB Atlas
```

O hostname `cozinhai.monpy.com.br` atende o frontend e `apicozinhai.monpy.com.br` atende a API. As duas rotas públicas do Tunnel apontam para `http://localhost:80`; o Caddy encaminha as requisições ao serviço correspondente pelo hostname. O frontend usa `NEXT_PUBLIC_API_URL=https://apicozinhai.monpy.com.br`. O backend deve permitir `https://cozinhai.monpy.com.br` em `CORS_ORIGINS`.

O túnel não oferece, por si só, alta disponibilidade. A implantação depende do servidor doméstico, da energia, da conexão de Internet, do Cloudflare e das dependências externas.

## Segredos e arquivos locais

Os arquivos de ambiente contêm dados locais e não devem ser enviados ao GitHub. Em particular, `.env.cloudflared` é uma configuração local do conector da infraestrutura e não faz parte dos arquivos versionados do projeto:

- `cozinhai/.env`: configuração e credenciais do backend;
- `cozinhai/.env.cloudflared`: variável `TUNNEL_TOKEN` usada pelo Compose para iniciar o conector;
- `.env.local` no frontend: `NEXT_PUBLIC_API_URL` e chave de API usada no build.

Restrinja as permissões dos arquivos que contêm credenciais, por exemplo:

```bash
chmod 600 ~/apps/pi-3sem-backend/cozinhai/.env
chmod 600 ~/apps/pi-3sem-backend/cozinhai/.env.cloudflared
chmod 600 ~/apps/frontend-repo/cozinhai-next/.env.local
```

Embora não seja necessário fazer commits para esta implantação, confirme que os arquivos com segredos não aparecem como arquivos a adicionar ao Git:

```bash
git -C ~/apps/pi-3sem-backend check-ignore -v \
  cozinhai/.env cozinhai/.env.cloudflared
git -C ~/apps/frontend-repo/cozinhai-next check-ignore -v .env.local
```

Os arquivos `.env`, `.env.local` e `.env.cloudflared` podem existir nos checkouts locais para a operação dos serviços, mas devem permanecer fora do Git. Não é necessário alterar os repositórios remotos; se um segredo aparecer como não rastreado, não o adicione. Não coloque tokens, senhas, strings de conexão ou chaves de API em documentação ou logs compartilhados.

`NEXT_PUBLIC_SPOONACULAR_API_KEY` é incorporada ao bundle do navegador por usar o prefixo `NEXT_PUBLIC_`; seu valor fica visível aos usuários. Trate-a como pública, aplique limites de uso no serviço quando disponíveis e não reutilize essa chave como credencial privada.

## Consultar estado e logs

### Backend e conector do Tunnel

```bash
cd ~/apps/pi-3sem-backend/cozinhai
sudo docker compose --env-file .env.cloudflared ps
sudo docker compose --env-file .env.cloudflared logs --tail=100 backend cloudflared
```

### Frontend

```bash
cd ~/apps/frontend-repo/cozinhai-next
sudo docker compose --env-file .env.local ps
sudo docker compose --env-file .env.local logs --tail=100 frontend
```

### Caddy

```bash
cd ~/apps/caddy
sudo docker compose ps
sudo docker compose logs --tail=100 caddy
```

Para acompanhar logs em tempo real, acrescente `--follow` ao comando `logs`; use `Ctrl+C` para sair sem parar os containers.

## Iniciar ou atualizar os serviços

### Backend e conector do Tunnel

O serviço `backend` carrega as configurações de aplicação de `cozinhai/.env`. Nesta implantação, o Compose também inicia o conector de Tunnel opcional; o arquivo local `.env.cloudflared` fornece o token sem gravá-lo no YAML. O Tunnel é uma dependência operacional do modo de publicação atual, não uma dependência do código da aplicação. Caso a publicação seja migrada para outro proxy ou plataforma, remova ou substitua essa configuração de infraestrutura sem alterar o frontend ou a API.

```bash
cd ~/apps/pi-3sem-backend/cozinhai
sudo docker compose --env-file .env.cloudflared up -d --build
sudo docker compose --env-file .env.cloudflared ps
```

Para reconstruir somente o backend após uma alteração no código:

```bash
sudo docker compose --env-file .env.cloudflared up -d --build backend
```

### Frontend

O valor de `NEXT_PUBLIC_API_URL` e as variáveis `NEXT_PUBLIC_*` são aplicados durante o build do Next.js. Após atualizar código ou alterar essas variáveis, reconstrua a imagem:

```bash
cd ~/apps/frontend-repo/cozinhai-next
sudo docker compose --env-file .env.local up -d --build
sudo docker compose --env-file .env.local ps
```

O `next.config.ts` precisa estar presente na imagem runtime para que o otimizador de imagens do Next.js aceite `img.spoonacular.com`. Ele é copiado do estágio de build no `Dockerfile`.

### Caddy

```bash
cd ~/apps/caddy
sudo docker compose up -d
sudo docker compose ps
```

Após alterar o `Caddyfile`, valide a configuração e recrie o serviço:

```bash
cd ~/apps/caddy
sudo docker run --rm \
  -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2-alpine caddy validate \
  --config /etc/caddy/Caddyfile --adapter caddyfile
sudo docker compose up -d --force-recreate caddy
```

## Verificações de implantação

Estas verificações confirmam respostas básicas e encaminhamento; não substituem testes funcionais, de carga ou disponibilidade.

```bash
# Backend diretamente no host
curl -i --max-time 10 http://127.0.0.1:3001/

# Frontend diretamente no host
curl -i --max-time 10 http://127.0.0.1:3000/

# Roteamento local do Caddy por hostname
curl -i --max-time 10 --resolve cozinhai.monpy.com.br:80:127.0.0.1 \
  http://cozinhai.monpy.com.br/
curl -i --max-time 10 --resolve apicozinhai.monpy.com.br:80:127.0.0.1 \
  http://apicozinhai.monpy.com.br/

# Acesso público HTTPS
curl -i --max-time 20 https://cozinhai.monpy.com.br/
curl -i --max-time 20 https://apicozinhai.monpy.com.br/
```

Espera-se `200 OK` para a página do frontend e para a rota raiz da API. Uma resposta bem-sucedida na rota raiz da API não valida todas as rotas nem os fluxos de negócio.

## Diagnóstico básico

### Imagens retornam erro 500

Consulte os logs do frontend:

```bash
cd ~/apps/frontend-repo/cozinhai-next
sudo docker compose --env-file .env.local logs --tail=100 frontend
```

Se os logs indicarem `EAI_AGAIN` para `img.spoonacular.com`, verifique DNS no host e no container:

```bash
getent ahosts img.spoonacular.com
sudo docker compose --env-file .env.local exec frontend \
  node -e 'require("node:dns").lookup("img.spoonacular.com", (e, a) => {
    if (e) { console.error(e.code); process.exit(1) }
    console.log(a)
  })'
```

Se o host resolver o nome, mas o container não, examine a configuração DNS do Docker e do serviço `frontend` no `compose.yaml`. Não altere a configuração global do Docker sem necessidade; valide primeiro se a falha está limitada ao container.

Se os logs indicarem hostname não permitido pelo otimizador, confirme que `/app/next.config.ts` existe no container e que o arquivo contém o domínio de origem usado pelas imagens. Após alterar Dockerfile ou configuração do Next.js, reconstrua o frontend com `--build`.

### Container não inicia ou está unhealthy

Consulte o estado e os logs do serviço correspondente. Corrija a causa indicada antes de reconstruir ou remover containers:

```bash
sudo docker ps -a
sudo docker compose logs --tail=100 NOME_DO_SERVICO
```

Use os comandos Compose a partir do diretório correto do componente e carregue o arquivo de ambiente necessário. Não use `docker system prune` como procedimento de diagnóstico.

## Reinicialização e recuperação

Os serviços usam políticas de reinício no Docker Compose. Após uma reinicialização planejada do servidor:

1. Verifique o serviço Docker: `sudo systemctl is-active docker`.
2. Confira os containers com os comandos da seção “Consultar estado e logs”.
3. Se algum componente não estiver em execução, use o comando `docker compose up -d` correspondente.
4. Verifique os endereços públicos e os logs do componente afetado.

Para recuperar a aplicação em outro host, instale Docker Engine e Docker Compose, recupere os repositórios e arquivos de configuração versionados, recrie os arquivos de ambiente a partir de cópias seguras ou rotacione as credenciais e inicie os serviços necessários. A configuração do Tunnel só é necessária se o Cloudflare continuar sendo usado como mecanismo de publicação; nesse caso, recupere ou rotacione o token pelo painel Cloudflare e crie o arquivo local de ambiente no servidor. Nunca recupere segredos de commits ou logs.

## Backups e manutenção

O MongoDB Atlas é gerenciado externamente; verifique e documente separadamente as opções de backup e restauração habilitadas na conta. Para o servidor, mantenha cópias protegidas dos arquivos de configuração necessários à reconstrução (`compose.yaml`, `Dockerfile`, `Caddyfile` e configurações não secretas). Armazene cópias dos arquivos de ambiente e do token do Tunnel em meio seguro e criptografado, ou planeje sua recriação e rotação. Não inclua segredos em backups não criptografados.

Atualize imagens e dependências de forma planejada. Depois de cada atualização, confira os estados dos containers, os logs e os dois hostnames. A implantação atual não possui pipeline automatizado de build/deploy; alterações são construídas e aplicadas manualmente por SSH com Docker Compose.
