import { serve } from '@hono/node-server'
import app from './app'
import { ProcessEnv } from './env'

const port = ProcessEnv.PORT
console.log(`Server is running on http://${ProcessEnv.HOSTNAME}:${port}`)

serve({
  fetch: app.fetch,
  port,
})
