import { serve } from '@hono/node-server'
import app from './app'

const port = parseInt(process.env.PORT || '3789')
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
