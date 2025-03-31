import { RecurrenceType } from '@prisma/client'
import { z } from 'zod'

export const recurrenceTypeSchema = z.nativeEnum(RecurrenceType)

const dateLike = z.union([
  z.string().datetime({
    offset: true,
    local: true,
  }),
  z.date(),
])

export const dateLikeToDate = dateLike.pipe(z.coerce.date())
