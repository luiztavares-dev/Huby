import type { ComentarioApi, TipoConteudo } from '../types/conteudo'

export type ConteudoApi = {
    id: string
    tipo: TipoConteudo
    titulo: string
    descricao: string
    descricaoLonga: string
    desenvolvedor: string
    imagem: string
    tags: string[]
    plataformas: string[]
    nota: number
    avaliacoes: number
    preco?: number | null
    destaque: boolean
    relevancia: number
    dataPublicacao?: string | null
    dataInicio?: string | null
    dataFim?: string | null
    tema?: string | null
    inscricoesInicio?: string | null
    inscricoesFim?: string | null
    inscricoesAte?: string | null
    desenvolvimentoInicio?: string | null
    desenvolvimentoFim?: string | null
    analiseInicio?: string | null
    analiseFim?: string | null
    dataPremiacao?: string | null
    cronograma?: Array<{ titulo: string; periodo: string }> | null
    participantes?: number | null
    local?: string | null
    gameJamId?: string | null
    linkUrl?: string | null
    criadorId?: string | null
    comentarios?: ComentarioApi[] | null
}

export type CarrosselApi = {
    id: string
    titulo: string
    subtitulo?: string | null
    itens: ConteudoApi[]
}

export type PlataformaJogoApi = 'pc' | 'mobile' | 'website'

export type NovoJogoApi = {
    criadorId: string
    titulo: string
    descricao: string
    descricaoLonga: string
    desenvolvedor: string
    imagem?: string
    linkUrl: string
    tags: string[]
    plataformas: PlataformaJogoApi[]
    preco: number
}

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8080'

export function linkJogoValido(link?: string | null): string | null {
    if (!link) return null

    try {
        const url = new URL(link)
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
    } catch {
        return null
    }
}

export async function buscarCarrosseisHome(signal?: AbortSignal): Promise<CarrosselApi[]> {
    const resposta = await fetch(`${API_URL}/api/home/carrosseis`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar os destaques (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<CarrosselApi[]>
}

export async function buscarJogos(signal?: AbortSignal): Promise<ConteudoApi[]> {
    const resposta = await fetch(`${API_URL}/api/home/jogos`, { signal })
    if (!resposta.ok) throw new Error('Não foi possível carregar os jogos.')
    return resposta.json() as Promise<ConteudoApi[]>
}

export async function publicarJogo(payload: NovoJogoApi): Promise<ConteudoApi> {
    const resposta = await fetch(`${API_URL}/api/jogos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })

    if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null) as { message?: string } | null
        throw new Error(corpo?.message ?? `Não foi possível publicar o jogo (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<ConteudoApi>
}
