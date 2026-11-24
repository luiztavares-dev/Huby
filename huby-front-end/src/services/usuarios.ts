import { API_URL, type ConteudoApi } from './home'

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

export type AtividadesPerfilApi = {
    criados: ConteudoApi[]
    publicados: ConteudoApi[]
    participados: ConteudoApi[]
}

/** Relações derivadas diretamente dos conteúdos e equipes persistidos no MongoDB. */
export async function buscarAtividadesPerfil(
    usuarioId: string,
    signal?: AbortSignal
): Promise<AtividadesPerfilApi> {
    const resposta = await fetch(`${API_URL}/api/perfil/${encodeURIComponent(usuarioId)}/atividades`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar as atividades do perfil (HTTP ${resposta.status}).`)
    }

    const dados = await resposta.json() as Partial<AtividadesPerfilApi> | null
    return {
        criados: dados?.criados ?? [],
        publicados: dados?.publicados ?? [],
        participados: dados?.participados ?? []
    }
}

export async function buscarBiblioteca(usuarioId: string, signal?: AbortSignal): Promise<string[]> {
    const resposta = await fetch(`${API_URL}/api/perfil/${encodeURIComponent(usuarioId)}/biblioteca`, { signal })
    if (!resposta.ok) throw new Error('Não foi possível carregar sua biblioteca.')
    return resposta.json() as Promise<string[]>
}

export async function buscarCompras(usuarioId: string, signal?: AbortSignal): Promise<string[]> {
    const resposta = await fetch(`${API_URL}/api/perfil/${encodeURIComponent(usuarioId)}/compras`, { signal })
    if (!resposta.ok) throw new Error('Não foi possível carregar suas compras.')
    return resposta.json() as Promise<string[]>
}

export async function comprarJogo(usuarioId: string, jogoId: string): Promise<void> {
    const resposta = await fetch(
        `${API_URL}/api/perfil/${encodeURIComponent(usuarioId)}/compras/${encodeURIComponent(jogoId)}`,
        { method: 'POST' }
    )
    if (!resposta.ok) throw new Error('Não foi possível concluir a compra do jogo.')
}

export async function adicionarBiblioteca(usuarioId: string, jogoId: string): Promise<void> {
    const resposta = await fetch(
        `${API_URL}/api/perfil/${encodeURIComponent(usuarioId)}/biblioteca/${encodeURIComponent(jogoId)}`,
        { method: 'POST' }
    )
    if (!resposta.ok) throw new Error('Não foi possível adicionar o jogo à biblioteca.')
}

export async function removerBiblioteca(usuarioId: string, jogoId: string): Promise<void> {
    const resposta = await fetch(
        `${API_URL}/api/perfil/${encodeURIComponent(usuarioId)}/biblioteca/${encodeURIComponent(jogoId)}`,
        { method: 'DELETE' }
    )
    if (!resposta.ok) throw new Error('Não foi possível remover o jogo da biblioteca.')
}
