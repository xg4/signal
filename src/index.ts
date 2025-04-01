import app from './app'
import { Env } from './config/env'
import { eventsService } from './services'

const port = Env.PORT

await eventsService.init()

export default {
  fetch: app.fetch,
  port,
}
