import type { ConteudoApi } from './home'
import { API_URL } from './home'

export type PremioApi = {
    posicao: number
    valor: string
    descricao: string
}

export type EtapaCronogramaApi = {
    titulo: string
    periodo: string
}

export type EventoApi = ConteudoApi & {
    tema?: string | null
    bannerUrl?: string | null
    tipoPremiacao?: 'SEM_PREMIACAO' | 'DINHEIRO' | 'PREMIOS' | 'AMBOS' | null
    contatos?: string[] | null
    inscricoesAte?: string | null
    premios?: PremioApi[] | null
    cronograma?: EtapaCronogramaApi[] | null
    regras?: string[] | null
    equipes?: string[] | null
    equipesInscritas?: number | null
    tamanhoEquipe?: number | null
    modeloEquipe?: ModeloEquipeApi | null
}

export type FuncaoApi = {
    id: string
    nome: string
    ordem: number
}

export type IntegranteEquipeApi = {
    nomeUsuario: string
    funcao: string
    avatar?: string | null
    status?: 'CONFIRMADO' | 'PENDENTE' | 'RECUSADO' | null
}

export type ModeloEquipeApi = 'COMUM' | 'SURPRESA' | 'INDIVIDUAL'

export type EquipeApi = {
    id: string
    eventoId: string
    nome: string
    liderId?: string | null
    experiencia: string
    modelo?: ModeloEquipeApi | null
    imagem?: string | null
    avatar?: string | null
    abertaParaSolicitacoes: boolean
    integrantes: IntegranteEquipeApi[]
    criadoEm?: string | null
    entregaTitulo?: string | null
    entregaDescricao?: string | null
    entregaLink?: string | null
    entregaImagem?: string | null
    entregueEm?: string | null
    jogoId?: string | null
}

export type PedidoEquipeApi = {
    id: string
    tipo: string
    equipeId?: string | null
    eventoId?: string | null
    equipeNome?: string | null
    eventoTitulo?: string | null
    conviteStatus?: 'PENDENTE' | 'ACEITO' | 'RECUSADO' | null
}

export type NovaEquipeApi = {
    nome: string
    experiencia: string
    imagem?: string
    avatar?: string
    criadorId?: string
    abertaParaSolicitacoes: boolean
    integrantes: IntegranteEquipeApi[]
}

export type EventosApi = {
    destaques: EventoApi[]
    inscricoesTerminando: EventoApi[]
    gameJams: EventoApi[]
}

export type NovoEventoApi = {
    criadorId: string
    tipo: 'EVENTO' | 'GAME_JAM'
    titulo: string
    descricao: string
    imagem?: string
    bannerUrl?: string
    tipoPremiacao?: 'SEM_PREMIACAO' | 'DINHEIRO' | 'PREMIOS' | 'AMBOS'
    contatos?: string[]
    organizador: string
    tema: string
    local: string
    dataInicio: string
    dataFim: string
    inscricoesAte?: string
    tamanhoEquipe: number
    modeloEquipe: ModeloEquipeApi
    tags: string[]
    regras: string[]
    premios: PremioApi[]
    cronograma: EtapaCronogramaApi[]
}

export type EntregaEquipeApi = {
    usuarioId: string
    titulo: string
    descricao: string
    linkUrl: string
    imagem?: string
}

export async function buscarEventos(signal?: AbortSignal): Promise<EventosApi> {
    const resposta = await fetch(`${API_URL}/api/eventos`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar os eventos (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<EventosApi>
}

export async function buscarJogosDaJam(id: string, signal?: AbortSignal): Promise<ConteudoApi[]> {
    const resposta = await fetch(`${API_URL}/api/eventos/${encodeURIComponent(id)}/jogos`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar os jogos publicados (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<ConteudoApi[]>
}

export async function buscarEvento(id: string, signal?: AbortSignal): Promise<EventoApi> {
    const resposta = await fetch(`${API_URL}/api/eventos/${encodeURIComponent(id)}`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar o evento (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<EventoApi>
}

export async function buscarFuncoes(signal?: AbortSignal): Promise<FuncaoApi[]> {
    const resposta = await fetch(`${API_URL}/api/eventos/funcoes`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar as funções (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<FuncaoApi[]>
}

export async function buscarEquipes(id: string, signal?: AbortSignal): Promise<EquipeApi[]> {
    const resposta = await fetch(`${API_URL}/api/eventos/${encodeURIComponent(id)}/equipes`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar as equipes inscritas (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<EquipeApi[]>
}

export async function solicitarEntrada(
    eventoId: string,
    equipeId: string,
    usuarioId: string,
    signal?: AbortSignal
): Promise<PedidoEquipeApi> {
    const resposta = await fetch(
        `${API_URL}/api/eventos/${encodeURIComponent(eventoId)}/equipes/${encodeURIComponent(equipeId)}/solicitacoes`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId }),
            signal
        }
    )

    if (!resposta.ok) {
        let mensagem = `Não foi possível enviar o pedido (HTTP ${resposta.status}).`

        try {
            const corpo = await resposta.json() as { mensagem?: string }
            if (corpo?.mensagem) mensagem = corpo.mensagem
        } catch {
            // mantém a mensagem padrão quando a resposta não tem JSON
        }

        throw new Error(mensagem)
    }

    return resposta.json() as Promise<PedidoEquipeApi>
}

export async function buscarMeusPedidos(usuarioId: string, signal?: AbortSignal): Promise<PedidoEquipeApi[]> {
    const resposta = await fetch(`${API_URL}/api/mensagens/pedidos/${encodeURIComponent(usuarioId)}`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar seus pedidos (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<PedidoEquipeApi[]>
}

export async function inscreverEquipe(id: string, equipe: NovaEquipeApi, signal?: AbortSignal): Promise<EquipeApi> {
    const resposta = await fetch(`${API_URL}/api/eventos/${encodeURIComponent(id)}/equipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equipe),
        signal
    })

    if (!resposta.ok) {
        let mensagem = `Não foi possível inscrever a equipe (HTTP ${resposta.status}).`

        try {
            const corpo = await resposta.json() as { mensagem?: string }
            if (corpo?.mensagem) mensagem = corpo.mensagem
        } catch {
            // mantém a mensagem padrão quando a resposta não tem JSON
        }

        throw new Error(mensagem)
    }

    return resposta.json() as Promise<EquipeApi>
}

export async function criarEvento(evento: NovoEventoApi, signal?: AbortSignal): Promise<EventoApi> {
    const resposta = await fetch(`${API_URL}/api/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evento),
        signal
    })
    if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null) as { mensagem?: string } | null
        throw new Error(corpo?.mensagem ?? `Não foi possível criar o evento (HTTP ${resposta.status}).`)
    }
    return resposta.json() as Promise<EventoApi>
}

export async function enviarEntrega(
    eventoId: string,
    equipeId: string,
    entrega: EntregaEquipeApi,
    signal?: AbortSignal
): Promise<EquipeApi> {
    const resposta = await fetch(
        `${API_URL}/api/eventos/${encodeURIComponent(eventoId)}/equipes/${encodeURIComponent(equipeId)}/entrega`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entrega),
            signal
        }
    )
    if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null) as { mensagem?: string } | null
        throw new Error(corpo?.mensagem ?? `Não foi possível enviar o jogo (HTTP ${resposta.status}).`)
    }
    return resposta.json() as Promise<EquipeApi>
}
