import pino from 'pino'
import pretty from 'pino-pretty'

const stream = pretty({
  colorize: true,
  translateTime: 'SYS:standard',
})

export const logger = pino(stream)
