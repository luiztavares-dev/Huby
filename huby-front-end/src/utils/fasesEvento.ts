import type { EventoApi } from '../services/eventos'

export type FaseEvento = 'INSCRICOES' | 'DESENVOLVIMENTO' | 'ANALISE' | 'PREMIACAO' | 'ENCERRADO'

type Periodo = {
    inicio: Date | null
    fim: Date | null
    inicioTexto: string | null
    fimTexto: string | null
}

type EventoComInscricoes = Pick<EventoApi,
    'inscricoesInicio' | 'inscricoesFim' | 'inscricoesAte' | 'desenvolvimentoInicio' | 'dataInicio' | 'cronograma'
>

function normalizarSemAcentos(valor: string) {
    return valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
}

function dataLocal(valor?: string | null, fimDoDia = false): Date | null {
    if (!valor) return null

    const somenteData = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    const data = somenteData
        ? new Date(Number(valor.slice(0, 4)), Number(valor.slice(5, 7)) - 1, Number(valor.slice(8, 10)))
        : new Date(valor)

    if (Number.isNaN(data.getTime())) return null
    if (somenteData && fimDoDia) data.setHours(23, 59, 59, 999)
    return data
}

function periodo(inicio?: string | null, fim?: string | null): Periodo {
    return {
        inicio: dataLocal(inicio),
        fim: dataLocal(fim, true),
        inicioTexto: inicio?.trim() || null,
        fimTexto: fim?.trim() || null
    }
}

function etapa(evento: Pick<EventoApi, 'cronograma'>, trecho: string): Periodo {
    const alvo = normalizarSemAcentos(trecho)
    const item = evento.cronograma?.find((etapa) => (
        normalizarSemAcentos(etapa.titulo).includes(alvo)
    ))
    if (!item) return periodo(null, null)

    const partes = item.periodo.split(/\s+-\s+/)
    return periodo(partes[0], partes[1] ?? partes[0])
}

function inscricoes(evento: EventoComInscricoes): Periodo {
    const cronograma = etapa(evento, 'inscri')
    const fim = evento.inscricoesFim ?? evento.inscricoesAte ?? cronograma.fimTexto
        ?? evento.desenvolvimentoInicio ?? evento.dataInicio

    return periodo(evento.inscricoesInicio ?? cronograma.inicioTexto, fim)
}

function desenvolvimento(evento: EventoApi): Periodo {
    const cronograma = etapa(evento, 'desenvolvimento')
    return periodo(
        evento.desenvolvimentoInicio ?? cronograma.inicioTexto ?? evento.dataInicio,
        evento.desenvolvimentoFim ?? cronograma.fimTexto ?? evento.dataFim
    )
}

function analise(evento: EventoApi): Periodo {
    const cronograma = etapa(evento, 'analise')
    return periodo(evento.analiseInicio ?? cronograma.inicioTexto, evento.analiseFim ?? cronograma.fimTexto)
}

function premio(evento: EventoApi): Date | null {
    if (evento.dataPremiacao) return dataLocal(evento.dataPremiacao)
    const cronograma = etapa(evento, 'premia')
    return cronograma.inicio ?? etapa(evento, 'resultado').inicio
}

function dentro(periodoAtual: Periodo, agora: Date) {
    if (periodoAtual.inicio && agora < periodoAtual.inicio) return false
    if (periodoAtual.fim && agora > periodoAtual.fim) return false
    return periodoAtual.inicio !== null || periodoAtual.fim !== null
}

export function inscricoesAbertas(evento: EventoApi, agora = new Date()) {
    return dentro(inscricoes(evento), agora)
}

export function temaRevelado(evento: EventoComInscricoes, agora = new Date()) {
    const fim = inscricoes(evento).fim
    return !fim || agora.getTime() > fim.getTime()
}

export function podeEnviarEntrega(evento: EventoApi, agora = new Date()) {
    return dentro(desenvolvimento(evento), agora)
}

export function faseAtual(evento: EventoApi, agora = new Date()): FaseEvento {
    if (inscricoesAbertas(evento, agora)) return 'INSCRICOES'
    if (podeEnviarEntrega(evento, agora)) return 'DESENVOLVIMENTO'
    if (dentro(analise(evento), agora)) return 'ANALISE'

    const dataPremio = premio(evento)
    if (dataPremio && agora >= dataPremio) return 'PREMIACAO'

    const inicioDesenvolvimento = desenvolvimento(evento).inicio
    if (inicioDesenvolvimento && agora < inicioDesenvolvimento) return 'INSCRICOES'
    return 'ENCERRADO'
}

export function rotuloFase(fase: FaseEvento) {
    const rotulos: Record<FaseEvento, string> = {
        INSCRICOES: 'Período de inscrição',
        DESENVOLVIMENTO: 'Período de desenvolvimento',
        ANALISE: 'Período de análise',
        PREMIACAO: 'Premiação',
        ENCERRADO: 'Encerrado'
    }
    return rotulos[fase]
}

export function formatarDataHoraEvento(valor?: string | null) {
    const data = dataLocal(valor)
    if (!data) return ''
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function formatarMoeda(valor?: string | number | null) {
    if (valor === null || valor === undefined || valor === '') return ''

    let numero: number
    if (typeof valor === 'number') {
        numero = valor
    } else {
        const texto = valor.replace(/[R$\s]/gi, '')
        const normalizado = texto.includes(',')
            ? texto.replace(/\./g, '').replace(',', '.')
            : /^\d{1,3}(\.\d{3})+$/.test(texto)
                ? texto.replace(/\./g, '')
                : texto
        numero = Number(normalizado)
    }

    if (!Number.isFinite(numero)) return ''
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

