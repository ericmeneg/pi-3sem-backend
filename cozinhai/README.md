<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Resumo de avaliações

O backend gera e persiste um resumo em português quando uma receita atinge 5,
10, 15... comentários não vazios de usuários ativos. Editar uma avaliação não
cria um novo marco. Se a geração falhar, a avaliação continua salva, o resumo
anterior é mantido e a geração pendente é tentada novamente na próxima avaliação
da receita.

Configure `GEMINI_API_KEY` no ambiente do backend. Opcionalmente, configure
`GEMINI_MODEL` (padrão: `gemini-3.1-flash-lite`). Não exponha a chave no
frontend. A disponibilidade e os limites gratuitos do Gemini dependem do modelo,
da região e dos termos atuais do provedor; os comentários serão enviados ao
Gemini para gerar o texto.

Consulte o resumo em `GET /recipe/:recipeId/review-summary`. A resposta inclui:

- `status`: `not_ready`, `pending` ou `available`;
- `summary`: texto salvo ou `null`;
- `reviewCount`: quantidade de comentários usada no resumo salvo;
- `pendingReviewCount`: marco pendente, quando a geração falhou;
- `generatedAt`: data da última geração ou `null`;
- `averageRating`: média das notas de usuários ativos, arredondada para uma
  casa decimal, ou `null` quando não houver avaliações;
- `ratingCount`: quantidade de notas incluídas na média.

O frontend pode usar `averageRating` para preencher estrelas e exibir a nota
média; `ratingCount` informa quantas avaliações foram consideradas.

## Project setup

```bash
$ npm install
```

## Docker Compose deployment

This Compose setup runs only the backend. MongoDB remains an external service
(for example, MongoDB Atlas); no database container or database port is exposed.

1. Create `.env` from `.env.example`, or add the required entries to the
   existing `.env` without overwriting its current values.
2. Set `MONGO_URI` to the MongoDB connection string and `JWT_SECRET` to a
   randomly generated secret. Use at least 32 random bytes for the JWT secret.
   Do not commit or share `.env`.
3. Set `CORS_ORIGINS` to the frontend origin or comma-separated origins, without
   trailing slashes. `GEMINI_API_KEY` is optional unless review summaries are
   enabled. Keep provider keys on the backend, never in the frontend.
4. Build and start the service:

   ```bash
   docker compose up --build -d
   ```

5. Check status and logs:

   ```bash
   docker compose ps
   docker compose logs -f backend
   ```

The backend listens on port `3001` inside the container and is bound to
`127.0.0.1:3001` on the host by default, suitable for a local reverse proxy or
Cloudflare Tunnel origin. Set `HOST_PORT` in `.env` to change the host-side
port. The root endpoint is used for the container health check. To stop the
service, run `docker compose down`.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
