const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export function cloudinaryConfigurado() {
    return Boolean(CLOUD_NAME && UPLOAD_PRESET)
}

type RespostaCloudinary = {
    secure_url?: string
    error?: { message?: string }
}

/**
 * Envia qualquer imagem do site para o Cloudinary (upload unsigned) e devolve
 * a URL segura, que deve ser persistida no banco pela tela que chamou.
 */
export async function enviarImagemParaCloudinary(arquivo: File | Blob, pasta = 'huby'): Promise<string> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('O upload de imagens ainda não está configurado (Cloudinary).')
    }

    const dados = new FormData()
    dados.append('file', arquivo)
    dados.append('upload_preset', UPLOAD_PRESET)
    dados.append('folder', pasta)

    let resposta: Response

    try {
        resposta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: dados
        })
    } catch {
        throw new Error('Não foi possível enviar a imagem. Verifique sua conexão.')
    }

    const corpo = (await resposta.json().catch(() => null)) as RespostaCloudinary | null

    if (!resposta.ok || !corpo?.secure_url) {
        throw new Error(corpo?.error?.message ?? `Não foi possível enviar a imagem (HTTP ${resposta.status}).`)
    }

    return corpo.secure_url
}
