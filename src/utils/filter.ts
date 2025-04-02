import { z } from 'zod'

export const pageSchema = z.object({
  pageSize: z.coerce.number().default(20),
  current: z.coerce.number().default(1),
})

export function generateOffset(params: z.infer<typeof pageSchema>) {
  const take = params.pageSize
  const skip = (params.current - 1) * params.pageSize

  return {
    take,
    skip,
  }
}

export const orderSchema = z.enum(['ascend', 'descend']).transform(v => {
  if (v === 'ascend') {
    return 'asc'
  }
  if (v === 'descend') {
    return 'desc'
  }
})
