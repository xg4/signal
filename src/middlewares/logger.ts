import dayjs from 'dayjs'
import type { MiddlewareHandler } from 'hono'
import ms from 'ms'

export const logger: MiddlewareHandler = async (c, next) => {
  const { url } = c.req

  const path = url.slice(url.indexOf('/', 8))

  const start = Date.now()
  await next()
  const end = Date.now()

  const msg = [
    dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
    `[${c.req.method}]`,
    path,
    c.res.status,
    ms(end - start),
  ]

  console.log(...msg)
}
