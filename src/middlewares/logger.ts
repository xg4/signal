import type { MiddlewareHandler } from 'hono'
import { getConnInfo } from 'hono/bun'
import ms from 'ms'
import type { Logger } from 'pino'
import pino from 'pino'
import pretty from 'pino-pretty'

export type LoggerVariables = {
  logger: Logger
}

declare module 'hono' {
  interface ContextVariableMap extends LoggerVariables {}
}

const stream = pretty({
  colorize: true,
  translateTime: 'SYS:standard',
})

export const logger = pino(stream)

export const pinoLogger: MiddlewareHandler = async (c, next) => {
  const { url } = c.req
  const path = url.slice(url.indexOf('/', 8))
  const { method } = c.req
  const { requestId } = c.var

  const child = logger.child({
    requestId,
  })

  const info = getConnInfo(c)
  const userAgent = c.req.header('user-agent')

  c.set('logger', child)
  const start = Date.now()
  await next()
  const end = Date.now()

  const { status } = c.res
  const elapsed = ms(end - start)

  const logLevel = status >= 400 ? 'error' : 'info'

  child[logLevel]([info.remote.address, method, path, status, elapsed, userAgent].join(' '))
}
