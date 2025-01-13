import { get } from 'lodash-es'

export async function generateUniqueKey(input: string): Promise<string> {
  // 将订阅信息转换为 ArrayBuffer
  const message = new TextEncoder().encode(input)

  // 使用浏览器原生 crypto API 生成哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', message)

  // 将 ArrayBuffer 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}
export function generateSubscriptionKey(subscription: Partial<{ endpoint: string; keys: Record<string, string> }>) {
  return generateUniqueKey(
    [get(subscription, 'endpoint'), get(subscription, 'keys.auth'), get(subscription, 'keys.p256dh')].join('|'),
  )
}
