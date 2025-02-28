import { z } from 'zod'

export const idValidator = z.object({ id: z.coerce.number().int() })
