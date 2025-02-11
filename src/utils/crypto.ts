// 加密密码
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
}

// 比对密码
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return Bun.password.verify(password, hashedPassword)
}

export async function sha256(message: string): Promise<string> {
  // 将订阅信息转换为 ArrayBuffer
  const data = new TextEncoder().encode(message)

  // 使用浏览器原生 crypto API 生成哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)

  // 将 ArrayBuffer 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}
