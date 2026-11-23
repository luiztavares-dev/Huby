import type { ConteudoApi } from './home'
import { API_URL } from './home'

export type CargoApi = 'DONO' | 'ADMIN' | 'MEMBRO'

export type IntegranteComunidadeApi = {
    usuarioId: string
    nomeUsuario: string
    avatar?: string | null
    cargo: CargoApi
    entrouEm?: string | null
}

export type SolicitacaoComunidadeApi = {
    id: string
    usuarioId: string
    nomeUsuario: string
    avatar?: string | null
    mensagem?: string | null
    criadoEm?: string | null
}

export type ComunidadeApi = ConteudoApi & {
    donoId?: string | null
    membros?: IntegranteComunidadeApi[] | null
    solicitacoes?: SolicitacaoComunidadeApi[] | null
    abertaParaSolicitacoes?: boolean | null
}

export type ConfigComunidadeApi = {
    usuarioId: string
    titulo?: string
    imagem?: string
    abertaParaSolicitacoes?: boolean
}

const base = (id: string) => `${API_URL}/api/comunidades/${encodeURIComponent(id)}`

async function lerMensagem(resposta: Response, padrao: string) {
    let mensagem = `${padrao} (HTTP ${resposta.status}).`

    try {
        const corpo = await resposta.json() as { mensagem?: string }
        if (corpo?.mensagem) mensagem = corpo.mensagem
    } catch {
        // mantém a mensagem padrão quando a resposta não tem JSON
    }

    return mensagem
}

async function devolverComunidade(resposta: Response, padrao: string): Promise<ComunidadeApi> {
    if (!resposta.ok) {
        throw new Error(await lerMensagem(resposta, padrao))
    }

    return resposta.json() as Promise<ComunidadeApi>
}

async function enviar(
    url: string,
    method: string,
    corpo: Record<string, unknown>,
    padrao: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    const resposta = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal
    })

    return devolverComunidade(resposta, padrao)
}

export async function buscarComunidades(signal?: AbortSignal): Promise<ComunidadeApi[]> {
    const resposta = await fetch(`${API_URL}/api/comunidades`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar as comunidades (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<ComunidadeApi[]>
}

export async function buscarComunidadesDoUsuario(
    usuarioId: string,
    signal?: AbortSignal
): Promise<ComunidadeApi[]> {
    const resposta = await fetch(`${API_URL}/api/comunidades/minhas/${encodeURIComponent(usuarioId)}`, { signal })

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar suas comunidades (HTTP ${resposta.status}).`)
    }

    return resposta.json() as Promise<ComunidadeApi[]>
}

export async function solicitarEntrada(
    id: string,
    usuarioId: string,
    mensagem = '',
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    return enviar(`${base(id)}/solicitacoes`, 'POST', { usuarioId, mensagem }, 'Não foi possível enviar o pedido', signal)
}

export async function cancelarPedido(
    id: string,
    solicitacaoId: string,
    usuarioId: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    const url = `${base(id)}/solicitacoes/${encodeURIComponent(solicitacaoId)}`

    return enviar(url, 'DELETE', { usuarioId }, 'Não foi possível cancelar o pedido', signal)
}

export async function aceitarPedido(
    id: string,
    solicitacaoId: string,
    usuarioId: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    const url = `${base(id)}/solicitacoes/${encodeURIComponent(solicitacaoId)}/aceitar`

    return enviar(url, 'POST', { usuarioId }, 'Não foi possível aceitar o pedido', signal)
}

export async function recusarPedido(
    id: string,
    solicitacaoId: string,
    usuarioId: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    const url = `${base(id)}/solicitacoes/${encodeURIComponent(solicitacaoId)}/recusar`

    return enviar(url, 'POST', { usuarioId }, 'Não foi possível recusar o pedido', signal)
}

export async function alterarCargo(
    id: string,
    usuarioId: string,
    alvoId: string,
    cargo: CargoApi,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    const url = `${base(id)}/membros/${encodeURIComponent(alvoId)}`

    return enviar(url, 'PATCH', { usuarioId, cargo }, 'Não foi possível alterar o cargo', signal)
}

export async function banirMembro(
    id: string,
    usuarioId: string,
    alvoId: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    const url = `${base(id)}/membros/${encodeURIComponent(alvoId)}`

    return enviar(url, 'DELETE', { usuarioId }, 'Não foi possível remover o integrante', signal)
}

export async function sairDaComunidade(
    id: string,
    usuarioId: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    return enviar(`${base(id)}/sair`, 'POST', { usuarioId }, 'Não foi possível sair da comunidade', signal)
}

export async function excluirComunidade(
    id: string,
    usuarioId: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    return enviar(base(id), 'DELETE', { usuarioId }, 'Não foi possível excluir a comunidade', signal)
}

export async function salvarConfiguracoes(
    id: string,
    config: ConfigComunidadeApi,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    return enviar(base(id), 'PATCH', config, 'Não foi possível salvar as configurações', signal)
}

export async function editarPublicacao(
    id: string,
    publicacaoId: string,
    usuarioId: string,
    texto: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    const url = `${base(id)}/publicacoes/${encodeURIComponent(publicacaoId)}`

    return enviar(url, 'PATCH', { usuarioId, texto }, 'Não foi possível editar a publicação', signal)
}

export async function apagarPublicacao(
    id: string,
    publicacaoId: string,
    usuarioId: string,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    const url = `${base(id)}/publicacoes/${encodeURIComponent(publicacaoId)}`

    return enviar(url, 'DELETE', { usuarioId }, 'Não foi possível apagar a publicação', signal)
}

export async function publicar(
    id: string,
    usuarioId: string,
    texto: string,
    respondendoA?: string | null,
    signal?: AbortSignal
): Promise<ComunidadeApi> {
    return enviar(
        `${base(id)}/publicacoes`,
        'POST',
        { usuarioId, texto, respondendoA: respondendoA ?? null },
        'Não foi possível publicar',
        signal
    )
}
