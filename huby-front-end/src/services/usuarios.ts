import { API_URL } from './home'

export type UsuarioResumoApi = {
    id: string
    username: string
    nomeExibicao: string
    avatarUrl: string
}

/** Usuários públicos da Huby, usados para localizar integrantes pelo @. */
export async function buscarUsuarios(signal?: AbortSignal): Promise<UsuarioResumoApi[]> {
    const resposta = await fetch(`${API_URL}/api/usuarios`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar os usuários (HTTP ${resposta.status}).`)
    }

    const lista = await resposta.json() as Array<{
        id: string
        username?: string | null
        nomeExibicao?: string | null
        avatarUrl?: string | null
    }>

    return lista
        .map((usuario) => ({
            id: usuario.id,
            username: (usuario.username ?? '').replace(/^[@#]+/, '').trim(),
            nomeExibicao: (usuario.nomeExibicao ?? '').trim(),
            avatarUrl: (usuario.avatarUrl ?? '').trim()
        }))
        .filter((usuario) => usuario.username.length > 0)
}
