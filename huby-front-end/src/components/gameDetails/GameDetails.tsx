import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import type { ComentarioApi, TipoConteudo } from '../../types/conteudo'
import { formatarParticipantes, formatarPeriodo } from '../../utils/formato'
import './GameDetails.css'

export type Game = {
    id: string
    tipo: TipoConteudo
    title: string
    description: string
    longDescription: string
    developer: string
    image: string
    tags: string[]
    score: number
    reviews: number
    platforms: ('website' | 'mobile' | 'pc')[]
    comentarios: ComentarioApi[]
    dataInicio?: string | null
    dataFim?: string | null
    participantes?: number | null
    local?: string | null
}

type DownloadPlatform = 'windows' | 'linux' | 'macos' | 'android'
type DownloadState = 'idle' | 'downloading' | 'done'
type PlayState = 'idle' | 'launching' | 'running'
type Aba = 'avaliacoes' | 'comentarios'
type Ordem = 'recentes' | 'populares'
type Voto = 'cima' | 'baixo'

type Avaliacao = {
    id: string
    autor: string
    handle: string
    avatar: string
    nota: number
    texto: string
    curtidas: number
    criadoEm: string
    voto: Voto | null
    minha: boolean
}

const downloadLabels: Record<DownloadPlatform, string> = {
    windows: 'Windows',
    linux: 'Linux',
    macos: 'MacOS',
    android: 'Android'
}

const normalizarTexto = (valor: string) =>
    valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

const handleDe = (nome?: string | null) => {
    if (!nome) return '@huby'

    return `@${normalizarTexto(nome).replace(/[^a-z0-9]+/g, '')}`
}

const dataCurta = (iso?: string | null) => {
    if (!iso) return ''

    const data = new Date(`${iso.slice(0, 10)}T00:00:00`)
    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const horaCurta = (iso?: string | null) => {
    if (!iso) return ''

    const data = new Date(iso)
    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const clonarComentarios = (lista?: ComentarioApi[] | null): ComentarioApi[] =>
    (lista ?? []).map((comentario) => ({
        ...comentario,
        respostas: clonarComentarios(comentario.respostas)
    }))

const atualizarComentario = (
    lista: ComentarioApi[],
    id: string,
    transformar: (comentario: ComentarioApi) => ComentarioApi
): ComentarioApi[] =>
    lista.map((comentario) => {
        if (comentario.id === id) return transformar(comentario)

        if (comentario.respostas?.length) {
            return {
                ...comentario,
                respostas: atualizarComentario(comentario.respostas, id, transformar)
            }
        }

        return comentario
    })

function IconeAvancar() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
        </svg>
    )
}

function IconeEstrela({ ativa }: { ativa: boolean }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={ativa ? 'is-ativa' : ''} aria-hidden="true">
            <path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9L12 3.2z" />
        </svg>
    )
}

function IconeSetaBaixo() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 9.5h12L12 16 6 9.5z" />
        </svg>
    )
}

function IconePolegar({ baixo }: { baixo?: boolean }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {baixo
                ? <path d="M7 14V4.5M7 14l-2.5 1.2a1.6 1.6 0 0 0-.9 1.4V19a2 2 0 0 0 2 2h9.9a2 2 0 0 0 2-1.6l.9-4.5a2 2 0 0 0-2-2.4H13V7.5A1.5 1.5 0 0 0 11.5 6H11L7 14z" />
                : <path d="M17 10v9.5M17 10l2.5-1.2a1.6 1.6 0 0 0 .9-1.4V5a2 2 0 0 0-2-2h-9.9a2 2 0 0 0-2 1.6L5.6 9.1a2 2 0 0 0 2 2.4H11v4.4a1.5 1.5 0 0 0 1.5 1.5h.5L17 10z" />}
        </svg>
    )
}

function IconeLixeira() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
            <path d="M10.5 11v6M13.5 11v6" />
        </svg>
    )
}

function IconeCoracao() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 3.1c0 5.4-7.5 10-7.5 10z" />
        </svg>
    )
}

function IconeResponder() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 17l-5-5 5-5" />
            <path d="M4 12h10a6 6 0 0 1 6 6v1" />
        </svg>
    )
}

function IconePlay() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
        </svg>
    )
}

function IconeParar() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 7h10v10H7z" />
        </svg>
    )
}

function PlatformGlyph({ platform }: { platform: DownloadPlatform }) {
    if (platform === 'windows') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 5.5l8-1.1v7.1H3V5.5zM12 4.3 21 3v8.5h-9V4.3zM3 12.5h8v7.1l-8-1.1v-6zM12 12.5h9V21l-9-1.3v-7.2z" />
            </svg>
        )
    }

    if (platform === 'linux') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 1.8c-2.4 0-3.9 2-3.9 4.4 0 1.4.4 2.4.4 3.7 0 1.9-1 3.2-1 5.2 0 3 2 4.9 4.5 4.9s4.5-1.9 4.5-4.9c0-2-1-3.3-1-5.2 0-1.3.4-2.3.4-3.7 0-2.4-1.5-4.4-3.9-4.4z" />
                <ellipse cx="12" cy="14.6" rx="2.5" ry="3.4" fill="#fff" opacity="0.9" />
                <circle cx="10.4" cy="6.4" r="0.7" fill="#fff" />
                <circle cx="13.6" cy="6.4" r="0.7" fill="#fff" />
                <path d="M10.8 8.2h2.4L12 9.6z" fill="#fff" />
                <path d="M8.3 19.2l-1.6 1.4c-.4.3-.1 1 .4 1h3.2l.4-1.6zM15.7 19.2l1.6 1.4c.4.3.1 1-.4 1h-3.2l-.4-1.6z" />
            </svg>
        )
    }

    if (platform === 'macos') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M15.8 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8c-1.5 0-3 1-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.5-1-2.6-3.6zM13.9 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.4z" />
            </svg>
        )
    }

    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7.2 8.5h9.6v7.2a1.8 1.8 0 0 1-1.8 1.8h-.6v2.1a1.35 1.35 0 1 1-2.7 0v-2.1h-.4v2.1a1.35 1.35 0 1 1-2.7 0v-2.1H9a1.8 1.8 0 0 1-1.8-1.8V8.5z" />
            <path d="M4.6 8.7a1.35 1.35 0 0 0-1.35 1.35v4.5a1.35 1.35 0 0 0 2.7 0v-4.5A1.35 1.35 0 0 0 4.6 8.7zM19.4 8.7a1.35 1.35 0 0 0-1.35 1.35v4.5a1.35 1.35 0 0 0 2.7 0v-4.5a1.35 1.35 0 0 0-1.35-1.35z" />
            <path fillRule="evenodd" d="M15.9 4.7l1-1.5a.3.3 0 0 0-.5-.3l-1.1 1.6a5.7 5.7 0 0 0-6.6 0l-1.1-1.6a.3.3 0 1 0-.5.3l1 1.5A5.4 5.4 0 0 0 7 8.2h10a5.4 5.4 0 0 0-1.1-3.5zM9.8 6.7a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM14.2 6.7a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
        </svg>
    )
}

function CheckGlyph() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
    )
}

function Estrelas({ nota }: { nota: number }) {
    const cheias = Math.round(nota)

    return (
        <span className="game-details-estrelas" aria-label={`Nota ${nota} de 5`}>
            {[1, 2, 3, 4, 5].map((indice) => (
                <IconeEstrela key={indice} ativa={indice <= cheias} />
            ))}
        </span>
    )
}

type AcoesComentario = {
    curtidos: Set<string>
    curtir: (id: string) => void
    respostaAberta: string | null
    alternarResposta: (id: string) => void
    respostas: Record<string, string>
    definirResposta: (id: string, texto: string) => void
    enviarResposta: (id: string) => void
}

function ComentarioItem({ comentario, nivel, acoes }: {
    comentario: ComentarioApi
    nivel: number
    acoes: AcoesComentario
}) {
    const curtido = acoes.curtidos.has(comentario.id)
    const respondendo = acoes.respostaAberta === comentario.id
    const textoResposta = acoes.respostas[comentario.id] ?? ''

    return (
        <div className={`game-details-comentario ${nivel > 0 ? 'is-resposta' : ''}`}>
            <img
                className="game-details-comentario-avatar"
                src={comentario.avatar || '/icon-perfil.png'}
                alt=""
            />

            <div className="game-details-comentario-corpo">
                <div className="game-details-comentario-topo">
                    <strong>{comentario.autor}</strong>
                </div>
                {comentario.criadoEm && (
                    <span className="game-details-comentario-data">{dataCurta(comentario.criadoEm)}</span>
                )}

                <p className="game-details-comentario-texto">{comentario.texto}</p>

                <div className="game-details-comentario-acoes">
                    <button
                        type="button"
                        className={curtido ? 'is-curtido' : ''}
                        onClick={() => acoes.curtir(comentario.id)}
                        aria-pressed={curtido}
                        aria-label={`Curtir comentário de ${comentario.autor}`}
                    >
                        <IconeCoracao />
                        <span>{comentario.curtidas}</span>
                    </button>
                    <button type="button" onClick={() => acoes.alternarResposta(comentario.id)}>
                        <IconeResponder />
                        Responder
                    </button>
                </div>

                {respondendo && (
                    <form
                        className="game-details-resposta-form"
                        onSubmit={(event: FormEvent) => {
                            event.preventDefault()
                            acoes.enviarResposta(comentario.id)
                        }}
                    >
                        <input
                            type="text"
                            value={textoResposta}
                            onChange={(event) => acoes.definirResposta(comentario.id, event.target.value)}
                            placeholder={`Responder ${comentario.handle}`}
                            aria-label={`Responder ${comentario.autor}`}
                        />
                        <button type="submit" disabled={!textoResposta.trim()}>Enviar</button>
                    </form>
                )}

                {comentario.respostas && comentario.respostas.length > 0 && (
                    <div className="game-details-comentario-respostas">
                        {comentario.respostas.map((resposta) => (
                            <ComentarioItem
                                key={resposta.id}
                                comentario={resposta}
                                nivel={nivel + 1}
                                acoes={acoes}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

interface GameDetailsProps {
    game: Game | null
    isOpen: boolean
    onClose: () => void
}

export default function GameDetails({ game, isOpen, onClose }: GameDetailsProps) {
    const [lastGame, setLastGame] = useState<Game | null>(null)
    const [downloads, setDownloads] = useState<Partial<Record<DownloadPlatform, DownloadState>>>({})
    const [lastDownload, setLastDownload] = useState<DownloadPlatform | null>(null)
    const [playState, setPlayState] = useState<PlayState>('idle')

    const [aba, setAba] = useState<Aba>('avaliacoes')
    const [ordem, setOrdem] = useState<Ordem>('recentes')
    const [filtroNota, setFiltroNota] = useState<number | null>(null)
    const [filtrosAbertos, setFiltrosAbertos] = useState(false)

    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
    const [editorAvaliacao, setEditorAvaliacao] = useState(false)
    const [notaRascunho, setNotaRascunho] = useState(5)
    const [textoAvaliacao, setTextoAvaliacao] = useState('')

    const [comentarios, setComentarios] = useState<ComentarioApi[]>([])
    const [editorComentario, setEditorComentario] = useState(false)
    const [novoComentario, setNovoComentario] = useState('')
    const [curtidos, setCurtidos] = useState<Set<string>>(() => new Set())
    const [respostaAberta, setRespostaAberta] = useState<string | null>(null)
    const [respostas, setRespostas] = useState<Record<string, string>>({})

    const timers = useRef<number[]>([])
    const fecharRef = useRef<HTMLButtonElement | null>(null)
    const avaliacoesRef = useRef<HTMLDivElement | null>(null)
    const textoRef = useRef<HTMLTextAreaElement | null>(null)
    const comentarioRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        if (!game) return

        setLastGame(game)
        setDownloads({})
        setLastDownload(null)
        setPlayState('idle')
        setAba('avaliacoes')
        setOrdem('recentes')
        setFiltroNota(null)
        setFiltrosAbertos(false)
        setAvaliacoes([])
        setEditorAvaliacao(false)
        setNotaRascunho(5)
        setTextoAvaliacao('')
        setComentarios(clonarComentarios(game.comentarios))
        setEditorComentario(false)
        setNovoComentario('')
        setCurtidos(new Set())
        setRespostaAberta(null)
        setRespostas({})

        timers.current.forEach(clearTimeout)
        timers.current = []
    }, [game])

    useEffect(() => () => timers.current.forEach(clearTimeout), [])

    useEffect(() => {
        if (!isOpen) return

        fecharRef.current?.focus()

        const aoTeclar = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', aoTeclar)
        return () => window.removeEventListener('keydown', aoTeclar)
    }, [isOpen, onClose])

    const current = game ?? lastGame

    const avaliacoesVisiveis = useMemo(() => {
        const filtradas = filtroNota === null
            ? avaliacoes
            : avaliacoes.filter((avaliacao) => Math.round(avaliacao.nota) === filtroNota)

        return [...filtradas].sort((a, b) => {
            if (ordem === 'populares') return b.curtidas - a.curtidas

            return b.criadoEm.localeCompare(a.criadoEm)
        })
    }, [avaliacoes, filtroNota, ordem])

    const comentariosOrdenados = useMemo(() => {
        const copia = [...comentarios]

        if (ordem === 'populares') {
            return copia.sort((a, b) => (b.curtidas ?? 0) - (a.curtidas ?? 0))
        }

        return copia.sort((a, b) => (b.criadoEm ?? '').localeCompare(a.criadoEm ?? ''))
    }, [comentarios, ordem])

    if (!current) return null

    const isJogo = current.tipo === 'JOGO'
    const participantes = formatarParticipantes(current.participantes)

    const isAvailable = (platform: DownloadPlatform) => {
        return platform === 'android'
            ? current.platforms.includes('mobile')
            : current.platforms.includes('pc')
    }

    const startDownload = (platform: DownloadPlatform) => {
        if (!isAvailable(platform) || downloads[platform] === 'downloading') return

        setDownloads((prev) => ({ ...prev, [platform]: 'downloading' }))
        setLastDownload(platform)

        const timer = window.setTimeout(() => {
            setDownloads((prev) => ({ ...prev, [platform]: 'done' }))
        }, 1500)

        timers.current.push(timer)
    }

    const togglePlay = () => {
        if (!current.platforms.includes('website')) return

        if (playState === 'running') {
            setPlayState('idle')
            return
        }

        if (playState === 'launching') return

        setPlayState('launching')
        const timer = window.setTimeout(() => setPlayState('running'), 1300)
        timers.current.push(timer)
    }

    const downloadStatus = lastDownload
        ? downloads[lastDownload] === 'downloading'
            ? `Baixando versão para ${downloadLabels[lastDownload]}…`
            : downloads[lastDownload] === 'done'
                ? `Download de ${downloadLabels[lastDownload]} concluído.`
                : null
        : null

    const abrirEditorAvaliacao = () => {
        setAba('avaliacoes')
        setEditorAvaliacao(true)
        avaliacoesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        window.setTimeout(() => textoRef.current?.focus(), 250)
    }

    const enviarAvaliacao = (event: FormEvent) => {
        event.preventDefault()

        const texto = textoAvaliacao.trim()
        if (!texto) return

        setAvaliacoes((lista) => [{
            id: `avaliacao-local-${Date.now()}`,
            autor: 'Você',
            handle: '@voce',
            avatar: '/icon-perfil.png',
            nota: notaRascunho,
            texto,
            curtidas: 0,
            criadoEm: new Date().toISOString(),
            voto: null,
            minha: true
        }, ...lista])

        setTextoAvaliacao('')
        setNotaRascunho(5)
        setEditorAvaliacao(false)
        setOrdem('recentes')
        setFiltroNota(null)
    }

    const votarAvaliacao = (id: string, voto: Voto) => {
        setAvaliacoes((lista) => lista.map((avaliacao) => {
            if (avaliacao.id !== id) return avaliacao

            const proximo = avaliacao.voto === voto ? null : voto
            const delta = (proximo === 'cima' ? 1 : 0) - (avaliacao.voto === 'cima' ? 1 : 0)

            return { ...avaliacao, voto: proximo, curtidas: Math.max(0, avaliacao.curtidas + delta) }
        }))
    }

    const excluirAvaliacao = (id: string) => {
        setAvaliacoes((lista) => lista.filter((avaliacao) => avaliacao.id !== id))
    }

    const alternarCurtida = (id: string) => {
        const jaCurtido = curtidos.has(id)

        setCurtidos((anterior) => {
            const proximo = new Set(anterior)
            if (jaCurtido) proximo.delete(id)
            else proximo.add(id)
            return proximo
        })

        setComentarios((lista) => atualizarComentario(lista, id, (comentario) => ({
            ...comentario,
            curtidas: Math.max(0, (comentario.curtidas ?? 0) + (jaCurtido ? -1 : 1))
        })))
    }

    const alternarResposta = (id: string) => {
        setRespostaAberta((atual) => (atual === id ? null : id))
    }

    const definirResposta = (id: string, texto: string) => {
        setRespostas((anterior) => ({ ...anterior, [id]: texto }))
    }

    const enviarResposta = (id: string) => {
        const texto = respostas[id]?.trim()
        if (!texto) return

        const nova: ComentarioApi = {
            id: `resposta-local-${Date.now()}`,
            autor: 'Você',
            handle: '@voce',
            avatar: '/icon-perfil.png',
            texto,
            curtidas: 0,
            criadoEm: new Date().toISOString().slice(0, 10),
            respostas: []
        }

        setComentarios((lista) => atualizarComentario(lista, id, (comentario) => ({
            ...comentario,
            respostas: [...(comentario.respostas ?? []), nova]
        })))

        setRespostas((anterior) => ({ ...anterior, [id]: '' }))
        setRespostaAberta(null)
    }

    const abrirEditorComentario = () => {
        setAba('comentarios')
        setEditorComentario(true)
        avaliacoesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        window.setTimeout(() => comentarioRef.current?.focus(), 250)
    }

    const enviarComentario = (event: FormEvent) => {
        event.preventDefault()

        const texto = novoComentario.trim()
        if (!texto) return

        setComentarios((lista) => [{
            id: `comentario-local-${Date.now()}`,
            autor: 'Você',
            handle: '@voce',
            avatar: '/icon-perfil.png',
            texto,
            curtidas: 0,
            criadoEm: new Date().toISOString().slice(0, 10),
            respostas: []
        }, ...lista])

        setNovoComentario('')
        setOrdem('recentes')
    }

    const acoesComentario: AcoesComentario = {
        curtidos,
        curtir: alternarCurtida,
        respostaAberta,
        alternarResposta,
        respostas,
        definirResposta,
        enviarResposta
    }

    return (
        <>
            <div
                className={`game-details-overlay ${isOpen ? 'is-open' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />

            <button
                ref={fecharRef}
                type="button"
                className={`game-details-voltar ${isOpen ? 'is-open' : ''}`}
                onClick={onClose}
                aria-label="Fechar detalhes"
                tabIndex={isOpen ? 0 : -1}
            >
                <IconeAvancar />
            </button>

            <aside
                className={`game-details ${isOpen ? 'is-open' : ''}`}
                aria-label={`Detalhes de ${current.title}`}
            >
                <div className="game-details-capa">
                    <img src={current.image} alt={current.title} />
                </div>

                <div className="game-details-faixa">
                    <h2>{current.title}</h2>
                    <div className="game-details-pills">
                        {current.tags.map((tag) => (
                            <span key={tag} className="game-details-pill">{tag}</span>
                        ))}
                    </div>
                </div>

                <div className="game-details-corpo">
                    <strong className="game-details-dev">{current.developer}</strong>
                    <span className="game-details-handle">{handleDe(current.developer)}</span>

                    <section className="game-details-secao">
                        <h3>Descrição</h3>
                        <p>{current.longDescription || current.description}</p>
                    </section>

                    {!isJogo && (
                        <section className="game-details-secao">
                            <h3>{current.tipo === 'COMUNIDADE' ? 'Sobre a comunidade' : 'Sobre o evento'}</h3>
                            <dl className="game-details-facts">
                                <div>
                                    <dt>Período</dt>
                                    <dd>{formatarPeriodo(current.dataInicio, current.dataFim)}</dd>
                                </div>
                                {current.local && (
                                    <div>
                                        <dt>Local</dt>
                                        <dd>{current.local}</dd>
                                    </div>
                                )}
                                {participantes && (
                                    <div>
                                        <dt>Participantes</dt>
                                        <dd>{participantes}</dd>
                                    </div>
                                )}
                            </dl>
                        </section>
                    )}

                    {isJogo && (
                        <section className="game-details-secao">
                            <h3>Downloads</h3>
                            <div className="game-details-downloads">
                                {(Object.keys(downloadLabels) as DownloadPlatform[]).map((platform) => {
                                    const state = downloads[platform] ?? 'idle'
                                    const available = isAvailable(platform)

                                    return (
                                        <button
                                            key={platform}
                                            type="button"
                                            className={`game-details-download ${state === 'done' ? 'is-done' : ''}`}
                                            disabled={!available}
                                            onClick={() => startDownload(platform)}
                                        >
                                            {state === 'downloading' ? (
                                                <span className="game-details-spinner" aria-hidden="true" />
                                            ) : state === 'done' ? (
                                                <CheckGlyph />
                                            ) : (
                                                <PlatformGlyph platform={platform} />
                                            )}
                                            <span>
                                                {state === 'downloading' ? 'Baixando…' : state === 'done' ? 'Baixado' : downloadLabels[platform]}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                            {downloadStatus && (
                                <p className="game-details-status" role="status">{downloadStatus}</p>
                            )}
                        </section>
                    )}

                    {isJogo && (
                        <>
                            <section className="game-details-secao">
                                <h3>Jogar no Browser</h3>
                                <button
                                    type="button"
                                    className={`game-details-play ${playState === 'running' ? 'is-running' : ''}`}
                                    disabled={!current.platforms.includes('website')}
                                    onClick={togglePlay}
                                >
                                    {playState === 'launching' ? (
                                        <span className="game-details-spinner" aria-hidden="true" />
                                    ) : playState === 'running' ? (
                                        <IconeParar />
                                    ) : (
                                        <IconePlay />
                                    )}
                                    <span>
                                        {playState === 'launching' ? 'Abrindo…' : playState === 'running' ? 'Parar' : 'Jogar'}
                                    </span>
                                </button>
                                {playState === 'running' && (
                                    <p className="game-details-status" role="status">
                                        {current.title} está rodando no navegador.
                                    </p>
                                )}
                            </section>

                            <div className="game-details-divisor" />

                            <div className="game-details-acoes">
                                <button
                                    type="button"
                                    className="game-details-acao is-primaria"
                                    onClick={abrirEditorAvaliacao}
                                >
                                    Avaliar jogo
                                </button>
                                <button
                                    type="button"
                                    className="game-details-acao is-secundaria"
                                    onClick={abrirEditorComentario}
                                >
                                    Comentar
                                </button>
                            </div>
                        </>
                    )}

                    <section className="game-details-interacao" ref={avaliacoesRef}>
                        <div className="game-details-abas" role="tablist" aria-label="Avaliações e comentários">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={aba === 'avaliacoes'}
                                className={aba === 'avaliacoes' ? 'is-active' : ''}
                                onClick={() => setAba('avaliacoes')}
                            >
                                Avaliações
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={aba === 'comentarios'}
                                className={aba === 'comentarios' ? 'is-active' : ''}
                                onClick={() => setAba('comentarios')}
                            >
                                Comentários
                            </button>
                        </div>

                        {aba === 'avaliacoes' && (
                            <>
                                {editorAvaliacao && (
                                    <form className="game-details-editor" onSubmit={enviarAvaliacao}>
                                        <div className="game-details-nota" role="radiogroup" aria-label="Sua nota">
                                            {[1, 2, 3, 4, 5].map((indice) => (
                                                <button
                                                    key={indice}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={notaRascunho === indice}
                                                    aria-label={`${indice} ${indice === 1 ? 'estrela' : 'estrelas'}`}
                                                    className={indice <= notaRascunho ? 'is-ativa' : ''}
                                                    onClick={() => setNotaRascunho(indice)}
                                                >
                                                    <IconeEstrela ativa={indice <= notaRascunho} />
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            ref={textoRef}
                                            value={textoAvaliacao}
                                            onChange={(event) => setTextoAvaliacao(event.target.value)}
                                            placeholder="Conte o que você achou do jogo..."
                                            aria-label="Escreva sua avaliação"
                                            rows={3}
                                        />
                                        <div className="game-details-editor-acoes">
                                            <button
                                                type="button"
                                                onClick={() => setEditorAvaliacao(false)}
                                            >
                                                Cancelar
                                            </button>
                                            <button type="submit" disabled={!textoAvaliacao.trim()}>
                                                Enviar avaliação
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="game-details-filtros">
                                    <div className="game-details-ordem">
                                        <button
                                            type="button"
                                            className={ordem === 'recentes' ? 'is-active' : ''}
                                            onClick={() => setOrdem('recentes')}
                                        >
                                            Recentes
                                        </button>
                                        <button
                                            type="button"
                                            className={ordem === 'populares' ? 'is-active' : ''}
                                            onClick={() => setOrdem('populares')}
                                        >
                                            Populares
                                        </button>
                                    </div>

                                    <div className="game-details-nota-filtro">
                                        <button
                                            type="button"
                                            className="game-details-nota-botao"
                                            onClick={() => setFiltrosAbertos((aberto) => !aberto)}
                                            aria-expanded={filtrosAbertos}
                                            aria-label="Filtrar avaliações por nota"
                                        >
                                            <span>{filtroNota ?? 'Notas'}</span>
                                            <IconeEstrela ativa />
                                            <span className="game-details-nota-seta"><IconeSetaBaixo /></span>
                                        </button>

                                        {filtrosAbertos && (
                                            <div className="game-details-nota-lista" role="menu">
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => {
                                                        setFiltroNota(null)
                                                        setFiltrosAbertos(false)
                                                    }}
                                                >
                                                    Todas
                                                </button>
                                                {[5, 4, 3, 2, 1].map((nota) => (
                                                    <button
                                                        key={nota}
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setFiltroNota(nota)
                                                            setFiltrosAbertos(false)
                                                        }}
                                                    >
                                                        {nota} {nota === 1 ? 'Estrela' : 'Estrelas'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {avaliacoesVisiveis.length === 0 && (
                                    <p className="game-details-vazio">
                                        {filtroNota === null
                                            ? 'Nenhuma avaliação ainda. Seja a primeira pessoa a avaliar.'
                                            : 'Nenhuma avaliação com essa nota.'}
                                    </p>
                                )}

                                <div className="game-details-lista">
                                    {avaliacoesVisiveis.map((avaliacao) => (
                                        <article className="game-details-avaliacao" key={avaliacao.id}>
                                            <img className="game-details-avaliacao-avatar" src={avaliacao.avatar} alt="" />

                                            <div className="game-details-avaliacao-corpo">
                                                <div className="game-details-avaliacao-topo">
                                                    <strong>{avaliacao.autor}</strong>
                                                </div>
                                                <span className="game-details-avaliacao-meta">
                                                    <span>{dataCurta(avaliacao.criadoEm)}</span>
                                                    <span>{horaCurta(avaliacao.criadoEm)}</span>
                                                </span>

                                                <Estrelas nota={avaliacao.nota} />

                                                <p className="game-details-avaliacao-texto">{avaliacao.texto}</p>

                                                <div className="game-details-avaliacao-acoes">
                                                    <button
                                                        type="button"
                                                        className={avaliacao.voto === 'cima' ? 'is-votado' : ''}
                                                        onClick={() => votarAvaliacao(avaliacao.id, 'cima')}
                                                        aria-pressed={avaliacao.voto === 'cima'}
                                                        aria-label="Achei útil"
                                                    >
                                                        <IconePolegar />
                                                        <span>{avaliacao.curtidas}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={avaliacao.voto === 'baixo' ? 'is-votado' : ''}
                                                        onClick={() => votarAvaliacao(avaliacao.id, 'baixo')}
                                                        aria-pressed={avaliacao.voto === 'baixo'}
                                                        aria-label="Não achei útil"
                                                    >
                                                        <IconePolegar baixo />
                                                    </button>
                                                    {avaliacao.minha && (
                                                        <button
                                                            type="button"
                                                            onClick={() => excluirAvaliacao(avaliacao.id)}
                                                            aria-label="Excluir minha avaliação"
                                                        >
                                                            <IconeLixeira />
                                                            Excluir
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </>
                        )}

                        {aba === 'comentarios' && (
                            <>
                                {editorComentario && (
                                    <form className="game-details-comentario-form" onSubmit={enviarComentario}>
                                        <img src="/icon-perfil.png" alt="" />
                                        <input
                                            ref={comentarioRef}
                                            type="text"
                                            value={novoComentario}
                                            onChange={(event) => setNovoComentario(event.target.value)}
                                            placeholder="Escreva um comentário..."
                                            aria-label="Escreva um comentário"
                                        />
                                        <button type="submit" disabled={!novoComentario.trim()}>Comentar</button>
                                    </form>
                                )}

                                <div className="game-details-filtros">
                                    <div className="game-details-ordem">
                                        <button
                                            type="button"
                                            className={ordem === 'recentes' ? 'is-active' : ''}
                                            onClick={() => setOrdem('recentes')}
                                        >
                                            Recentes
                                        </button>
                                        <button
                                            type="button"
                                            className={ordem === 'populares' ? 'is-active' : ''}
                                            onClick={() => setOrdem('populares')}
                                        >
                                            Populares
                                        </button>
                                    </div>
                                </div>

                                {comentariosOrdenados.length === 0 && (
                                    <p className="game-details-vazio">Seja a primeira pessoa a comentar.</p>
                                )}

                                <div className="game-details-lista">
                                    {comentariosOrdenados.map((comentario) => (
                                        <ComentarioItem
                                            key={comentario.id}
                                            comentario={comentario}
                                            nivel={0}
                                            acoes={acoesComentario}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </aside>
        </>
    )
}
