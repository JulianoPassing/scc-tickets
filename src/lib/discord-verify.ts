// Validação de assinatura do Discord usando Web Crypto API

export async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    // Converter a chave pública hex para formato necessário
    const keyData = Uint8Array.from(
      Buffer.from(publicKey, 'hex')
    )

    // Importar chave pública
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'NODE-ED25519',
        namedCurve: 'NODE-ED25519',
      } as any,
      false,
      ['verify']
    )

    // Criar mensagem para verificar
    const message = Uint8Array.from(
      Buffer.from(timestamp + body)
    )
    const sig = Uint8Array.from(
      Buffer.from(signature, 'hex')
    )

    // Verificar assinatura
    const isValid = await crypto.subtle.verify(
      'NODE-ED25519' as any,
      cryptoKey,
      sig,
      message
    )

    return isValid
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error)
    return false
  }
}
