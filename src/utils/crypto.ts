export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return Bun.password.verify(password, hashedPassword)
}

export async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
