import { appConfig, plugins } from '@app/app.config'
import { authMiddleware } from '@auth/auth.middlewares'
import { appRoutes } from '@app/app.routes'
import Elysia from 'elysia'

const app = new Elysia()
  .use(plugins.jwt)
  .use(plugins.logger)
  .use(plugins.cookie)
  .use(plugins.cors)
  .use(appRoutes)
  .derive(authMiddleware)

  .listen(appConfig.port, () => {
    console.log('Connexion bien effectuée !')
    console.log(`Serveur disponible sur http://localhost:${appConfig.port}`)
  })

export default app
