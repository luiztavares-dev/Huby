import type { TipoConteudo } from '../types/conteudo'

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
    destaque: boolean
    relevancia: number
    dataPublicacao?: string | null
    dataInicio?: string | null
    dataFim?: string | null
    participantes?: number | null
    local?: string | null
    gameJamId?: string | null
}

export type CarrosselApi = {
    id: string
    titulo: string
    subtitulo?: string | null
    itens: ConteudoApi[]
}

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8080'

export async function buscarCarrosseisHome(signal?: AbortSignal): Promise<CarrosselApi[]> {
    const resposta = await fetch(`${API_URL}/api/home/carrosseis`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar os destaques (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<CarrosselApi[]>
}
