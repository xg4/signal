import app from './app'
import { Env } from './config/env'

const port = Env.PORT

export default {
  fetch: app.fetch,
  port,
}
