import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import BarraDePesquisa from '../../components/searchBar/SearchBar'
import {
    buscarEventos,
    buscarJogosDaJam,
    criarEvento,
    type NovoEventoApi,
    type EventoApi,
    type PremioApi
} from '../../services/eventos'
import type { ConteudoApi } from '../../services/home'
import { adicionarBiblioteca, buscarBiblioteca } from '../../services/usuarios'
import type { ComentarioApi } from '../../types/conteudo'
import './Eventos.css'

type FiltroTipo = 'TODOS' | 'EVENTO' | 'GAME_JAM'
type AbaDetalhe = 'comentarios' | 'jogos'
type OrdemComentarios = 'recentes' | 'populares'

const normalizarTexto = (valor: string) =>
    valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

const handleDe = (nome?: string | null) => {
    if (!nome) return '@huby'

    return `@${normalizarTexto(nome).replace(/[^a-z0-9]+/g, '')}`
}

const categoriaDoEvento = (evento: EventoApi) => {
    if (evento.tags?.length) return evento.tags[0]
    return evento.tipo === 'GAME_JAM' ? 'GAME JAM' : 'EVENTO'
}

const dataNumerica = (iso?: string | null) => {
    if (!iso) return ''

    const data = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const dataCompleta = (iso?: string | null) => {
    if (!iso) return ''

    const data = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(data.getTime())) return ''

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatarDataHoraEvento = (iso: string) => {
    if (!iso) return ''
    const [data, hora] = iso.split('T')
    const [ano, mes, dia] = (data || '').split('-')
    if (!ano || !mes || !dia) return iso
    return `${dia}/${mes}/${ano.slice(-2)}${hora ? ` ${hora.slice(0, 5)}` : ''}`
}

const partesPeriodoEvento = (periodo: string) => {
    const partes = periodo.split(' - ')
    if (partes.length >= 2) return [partes[0], partes[1]]
    return [periodo, '']
}

const statusPeriodoEvento = (inicio?: string, fim?: string, agora = Date.now()) => {
    if (!inicio || !fim) return '-'
    const inicioMs = new Date(inicio).getTime()
    const fimMs = new Date(fim).getTime()
    if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs)) return '-'
    if (agora < inicioMs) return '-'
    if (agora > fimMs) return 'Encerrado'

    const restante = Math.max(0, Math.floor((fimMs - agora) / 1000))
    const dias = Math.floor(restante / 86400)
    const horas = Math.floor((restante % 86400) / 3600)
    const minutos = Math.floor((restante % 3600) / 60)
    const segundos = restante % 60
    if (dias > 0) return `${dias}d ${horas}h ${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`
    return `${horas}h ${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`
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

const agruparPremiosEvento = (premios?: PremioApi[] | null) => {
    const resultado = new Map<number, { dinheiro: string; premio: string }>()
    for (const premio of premios ?? []) {
        const atual = resultado.get(premio.posicao) ?? { dinheiro: '', premio: '' }
        if (premio.valor) atual.dinheiro = premio.valor
        if (premio.descricao) atual.premio = premio.descricao
        resultado.set(premio.posicao, atual)
    }
    return Array.from(resultado.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([posicao, valores]) => ({ posicao, ...valores }))
}

function IconeTrofeu() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
            <path d="M8 5H5.5a2.5 2.5 0 0 0 0 5H8M16 5h2.5a2.5 2.5 0 0 1 0 5H16" />
            <path d="M12 13v4M9 21h6M10 17h4" />
        </svg>
    )
}

function IconeSeta() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    )
}

function IconeAvancar() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
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

function CartaoEvento({ evento, onAbrir }: { evento: EventoApi; onAbrir: (evento: EventoApi) => void }) {
    const premio = evento.premios?.[0]

    return (
        <article
            className="evento-card"
            role="button"
            tabIndex={0}
            aria-label={`Ver detalhes de ${evento.titulo}`}
            onClick={() => onAbrir(evento)}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onAbrir(evento)
                }
            }}
        >
            <div className="evento-card-media">
                <img src={evento.imagem || '/imagem-polvojam.jpg'} alt="" loading="lazy" />
            </div>

            <span className="evento-card-tag">{categoriaDoEvento(evento)}</span>
            <h3>{evento.titulo}</h3>
            <p className="evento-card-org">{evento.desenvolvedor}</p>

            <div className="evento-card-inscricao">
                <div className="evento-card-inscricao-topo">
                    <span>INSCRIÇÃO</span>
                    <strong>{evento.participantes?.toLocaleString('pt-BR') ?? '0'}</strong>
                </div>
                <div className="evento-card-inscricao-base">
                    <small>{evento.inscricoesAte ? `Até ${dataNumerica(evento.inscricoesAte)}` : 'Abertas'}</small>
                    <span className="evento-card-inscritos">inscritos</span>
                </div>
            </div>

            <div className={`evento-card-footer ${premio ? 'is-premio' : 'is-sem-premio'}`}>
                {premio ? (
                    <span className="evento-card-premio">
                        <IconeTrofeu />
                        {premio.posicao}º | {premio.valor}
                    </span>
                ) : (
                    <span>Sem premiação</span>
                )}
                <span className="evento-card-seta"><IconeSeta /></span>
            </div>
        </article>
    )
}

function TrilhaEventos({ titulo, eventos, onAbrir }: {
    titulo: string
    eventos: EventoApi[]
    onAbrir: (evento: EventoApi) => void
}) {
    const trilhaRef = useRef<HTMLDivElement | null>(null)
    const [podeEsquerda, setPodeEsquerda] = useState(false)
    const [podeDireita, setPodeDireita] = useState(false)

    const atualizarSetas = useCallback(() => {
        const trilha = trilhaRef.current
        if (!trilha) return

        const maximo = trilha.scrollWidth - trilha.clientWidth
        setPodeEsquerda(trilha.scrollLeft > 10)
        setPodeDireita(trilha.scrollLeft < maximo - 10)
    }, [])

    useEffect(() => {
        atualizarSetas()

        const trilha = trilhaRef.current
        if (!trilha) return

        const aoRolar = () => atualizarSetas()
        trilha.addEventListener('scroll', aoRolar)

        const observador = new ResizeObserver(atualizarSetas)
        observador.observe(trilha)

        return () => {
            trilha.removeEventListener('scroll', aoRolar)
            observador.disconnect()
        }
    }, [eventos, atualizarSetas])

    const rolar = (direcao: number) => {
        if (!trilhaRef.current) return

        const largura = trilhaRef.current.querySelector('.evento-card')?.clientWidth ?? 350
        trilhaRef.current.scrollBy({
            left: direcao * (largura + 20),
            behavior: 'smooth'
        })
    }

    return (
        <div className="eventos-carrossel-wrap">
            <button
                type="button"
                className={`eventos-seta eventos-seta-esquerda ${podeEsquerda ? 'is-visible' : ''}`}
                aria-label={`Voltar em ${titulo}`}
                onClick={() => rolar(-1)}
                disabled={!podeEsquerda}
            >
                ‹
            </button>

            <div className="eventos-trilha" ref={trilhaRef}>
                {eventos.map((evento) => (
                    <CartaoEvento key={evento.id} evento={evento} onAbrir={onAbrir} />
                ))}
            </div>

            <button
                type="button"
                className={`eventos-seta eventos-seta-direita ${podeDireita ? 'is-visible' : ''}`}
                aria-label={`Avançar em ${titulo}`}
                onClick={() => rolar(1)}
                disabled={!podeDireita}
            >
                ›
            </button>
        </div>
    )
}

function HeroEventos({ itens, indice, onIndice }: {
    itens: EventoApi[]
    indice: number
    onIndice: (indice: number) => void
}) {
    if (itens.length === 0) return null

    const atual = itens[indice % itens.length]

    return (
        <section className="eventos-hero" aria-roledescription="carrossel">
            <img
                key={atual.id}
                className="eventos-hero-imagem"
                src={atual.imagem || '/imagem-polvojam.jpg'}
                alt=""
            />

            <div className="eventos-hero-sombra" aria-hidden="true" />

            <div className="eventos-hero-dots">
                {itens.map((item, posicao) => (
                    <button
                        key={item.id}
                        type="button"
                        className={posicao === indice ? 'is-active' : ''}
                        onClick={() => onIndice(posicao)}
                        aria-label={`Ir para ${item.titulo}`}
                        aria-current={posicao === indice}
                    />
                ))}
            </div>
        </section>
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
        <div className={`evento-comentario ${nivel > 0 ? 'is-resposta' : ''}`}>
            <img
                className="evento-comentario-avatar"
                src={comentario.avatar || '/icon-perfil.png'}
                alt=""
            />

            <div className="evento-comentario-corpo">
                <div className="evento-comentario-topo">
                    <strong>{comentario.autor}</strong>
                </div>
                {comentario.criadoEm && (
                    <span className="evento-comentario-data">{dataCompleta(comentario.criadoEm)}</span>
                )}

                <p className="evento-comentario-texto">{comentario.texto}</p>

                <div className="evento-comentario-acoes">
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
                        className="evento-resposta-form"
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
                    <div className="evento-comentario-respostas">
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

function EsqueletoEventos() {
    return (
        <div className="eventos-esqueleto" aria-hidden="true">
            <div className="eventos-esqueleto-hero" />
            <div className="eventos-esqueleto-trilha">
                {[0, 1, 2, 3, 4, 5, 6].map((item) => (
                    <div className="eventos-esqueleto-card" key={item} />
                ))}
            </div>
        </div>
    )
}

export function Eventos() {
    const navigate = useNavigate()
    const [dados, setDados] = useState<{ destaques: EventoApi[]; inscricoes: EventoApi[]; jams: EventoApi[] } | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [tentativa, setTentativa] = useState(0)

    const [busca, setBusca] = useState('')
    const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS')
    const [tagFiltro, setTagFiltro] = useState<string | null>(null)
    const [filtrosAbertos, setFiltrosAbertos] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)

    const [heroIndice, setHeroIndice] = useState(0)

    const [selecionado, setSelecionado] = useState<EventoApi | null>(null)
    const [ultimoEvento, setUltimoEvento] = useState<EventoApi | null>(null)
    const [abaDetalhe, setAbaDetalhe] = useState<AbaDetalhe>('comentarios')
    const [ordemComentarios, setOrdemComentarios] = useState<OrdemComentarios>('recentes')
    const [comentarios, setComentarios] = useState<ComentarioApi[]>([])
    const [curtidos, setCurtidos] = useState<Set<string>>(() => new Set())
    const [respostaAberta, setRespostaAberta] = useState<string | null>(null)
    const [respostas, setRespostas] = useState<Record<string, string>>({})
    const [novoComentario, setNovoComentario] = useState('')
    const [editorAberto, setEditorAberto] = useState(false)
    const [procurandoEquipe, setProcurandoEquipe] = useState<Set<string>>(() => new Set())
    const [agora, setAgora] = useState(() => Date.now())

    const [jogos, setJogos] = useState<Record<string, ConteudoApi[]>>({})
    const [jogosErro, setJogosErro] = useState<string | null>(null)
    const [carregandoJogos, setCarregandoJogos] = useState(false)
    const [criacaoAberta, setCriacaoAberta] = useState(false)
    const [criandoEvento, setCriandoEvento] = useState(false)
    const [erroCriacao, setErroCriacao] = useState<string | null>(null)
    const [novoEvento, setNovoEvento] = useState({
        tipo: 'GAME_JAM' as 'EVENTO' | 'GAME_JAM',
        titulo: '',
        descricao: '',
        imagem: '',
        organizador: '',
        tema: '',
        local: '',
        dataInicio: '',
        dataFim: '',
        inscricoesAte: '',
        tamanhoEquipe: 4,
        modeloEquipe: 'COMUM' as 'COMUM' | 'SURPRESA' | 'INDIVIDUAL',
        tags: '',
        regras: '',
        premioDescricao: '',
        premioValor: ''
    })
    const [bibliotecaIds, setBibliotecaIds] = useState<Set<string>>(() => new Set())

    const fecharRef = useRef<HTMLButtonElement | null>(null)
    const comentariosRef = useRef<HTMLDivElement | null>(null)
    const editorRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        setCarregando(true)
        setErro(null)

        buscarEventos(controller.signal)
            .then((resposta) => {
                setDados({
                    destaques: resposta.destaques ?? [],
                    inscricoes: resposta.inscricoesTerminando ?? [],
                    jams: resposta.gameJams ?? []
                })
                setHeroIndice(0)
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setErro(error instanceof Error ? error.message : 'Não foi possível carregar os eventos.')
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false)
            })

        return () => controller.abort()
    }, [tentativa])

    useEffect(() => {
        if (!aviso) return

        const timer = window.setTimeout(() => setAviso(null), 4500)
        return () => window.clearTimeout(timer)
    }, [aviso])

    useEffect(() => {
        const controller = new AbortController()
        let usuarioId = ''
        try {
            usuarioId = (JSON.parse(localStorage.getItem('huby_user') || '{}') as { id?: string }).id || ''
        } catch {
            usuarioId = ''
        }
        if (!usuarioId) return
        buscarBiblioteca(usuarioId, controller.signal)
            .then((ids) => setBibliotecaIds(new Set(ids)))
            .catch(() => undefined)
        return () => controller.abort()
    }, [])

    const destaques = dados?.destaques ?? []
    const inscricoes = dados?.inscricoes ?? []
    const jams = dados?.jams ?? []

    const tagsDisponiveis = useMemo(() => {
        const todas = [...destaques, ...inscricoes, ...jams].flatMap((evento) => evento.tags ?? [])
        return Array.from(new Set(todas)).sort((a, b) => a.localeCompare(b)).slice(0, 14)
    }, [destaques, inscricoes, jams])

    const filtrar = useCallback((lista: EventoApi[]) => {
        const termo = normalizarTexto(busca.trim())

        return lista.filter((evento) => {
            if (filtroTipo !== 'TODOS' && evento.tipo !== filtroTipo) return false
            if (tagFiltro && !(evento.tags ?? []).includes(tagFiltro)) return false
            if (!termo) return true

            const alvo = normalizarTexto([evento.titulo, evento.desenvolvedor, ...(evento.tags ?? [])].join(' '))
            return alvo.includes(termo)
        })
    }, [busca, filtroTipo, tagFiltro])

    const destaquesFiltrados = filtrar(destaques)
    const inscricoesFiltradas = filtrar(inscricoes)
    const jamsFiltradas = filtrar(jams)

    const filtrosAtivos = filtroTipo !== 'TODOS' || tagFiltro !== null || busca.trim().length > 0
    const semResultados = !carregando && !erro && dados !== null
        && inscricoesFiltradas.length === 0
        && jamsFiltradas.length === 0

    const heroItens = destaquesFiltrados.length > 0 ? destaquesFiltrados : destaques

    useEffect(() => {
        if (heroItens.length < 2 || selecionado) return

        const timer = window.setInterval(() => {
            setHeroIndice((indice) => (indice + 1) % heroItens.length)
        }, 8000)

        return () => window.clearInterval(timer)
    }, [heroItens.length, selecionado])

    useEffect(() => {
        if (heroIndice < heroItens.length) return
        setHeroIndice(0)
    }, [heroItens.length, heroIndice])

    useEffect(() => {
        if (!selecionado) return

        setAgora(Date.now())
        const timer = window.setInterval(() => setAgora(Date.now()), 1000)
        return () => window.clearInterval(timer)
    }, [selecionado])

    const abrirEvento = useCallback((evento: EventoApi) => {
        setSelecionado(evento)
        setUltimoEvento(evento)
        setAbaDetalhe('comentarios')
        setOrdemComentarios('recentes')
        setComentarios(clonarComentarios(evento.comentarios))
        setNovoComentario('')
        setEditorAberto(false)
        setRespostaAberta(null)
        setRespostas({})
        setJogosErro(null)
    }, [])

    const fecharEvento = useCallback(() => setSelecionado(null), [])

    const atual = selecionado ?? ultimoEvento
    const atualId = atual?.id

    useEffect(() => {
        if (!selecionado) return

        fecharRef.current?.focus()

        const aoTeclar = (event: KeyboardEvent) => {
            if (event.key === 'Escape') fecharEvento()
        }

        window.addEventListener('keydown', aoTeclar)
        return () => window.removeEventListener('keydown', aoTeclar)
    }, [selecionado, fecharEvento])

    useEffect(() => {
        if (abaDetalhe !== 'jogos' || !atualId || jogos[atualId]) return

        const controller = new AbortController()

        setCarregandoJogos(true)
        setJogosErro(null)

        buscarJogosDaJam(atualId, controller.signal)
            .then((lista) => setJogos((anterior) => ({ ...anterior, [atualId]: lista })))
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setJogosErro(error instanceof Error ? error.message : 'Não foi possível carregar os jogos publicados.')
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregandoJogos(false)
            })

        return () => controller.abort()
    }, [abaDetalhe, atualId, jogos])

    const comentariosOrdenados = useMemo(() => {
        const copia = [...comentarios]

        if (ordemComentarios === 'populares') {
            return copia.sort((a, b) => (b.curtidas ?? 0) - (a.curtidas ?? 0))
        }

        return copia.sort((a, b) => (b.criadoEm ?? '').localeCompare(a.criadoEm ?? ''))
    }, [comentarios, ordemComentarios])

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
        setRespostaAberta((atualResposta) => (atualResposta === id ? null : id))
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

    const enviarComentario = (event: FormEvent) => {
        event.preventDefault()

        const texto = novoComentario.trim()
        if (!texto) return

        const comentario: ComentarioApi = {
            id: `comentario-local-${Date.now()}`,
            autor: 'Você',
            handle: '@voce',
            avatar: '/icon-perfil.png',
            texto,
            curtidas: 0,
            criadoEm: new Date().toISOString().slice(0, 10),
            respostas: []
        }

        setComentarios((lista) => [comentario, ...lista])
        setNovoComentario('')
        setOrdemComentarios('recentes')
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

    const irParaComentarios = () => {
        setAbaDetalhe('comentarios')
        setEditorAberto(true)
        comentariosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        window.setTimeout(() => editorRef.current?.focus(), 250)
    }

    const alternarProcurando = (evento: EventoApi) => {
        const ativo = procurandoEquipe.has(evento.id)

        setProcurandoEquipe((anterior) => {
            const proximo = new Set(anterior)
            if (ativo) proximo.delete(evento.id)
            else proximo.add(evento.id)
            return proximo
        })

        setAviso(ativo
            ? `Perfil de "procurando equipe" desativado em ${evento.titulo}.`
            : `Perfil de "procurando equipe" ativado em ${evento.titulo}.`)
    }

    const limparFiltros = () => {
        setFiltroTipo('TODOS')
        setTagFiltro(null)
        setBusca('')
    }

    const adicionarJogoBiblioteca = async (jogoId: string) => {
        let usuarioId = ''
        try {
            usuarioId = (JSON.parse(localStorage.getItem('huby_user') || '{}') as { id?: string }).id || ''
        } catch {
            usuarioId = ''
        }
        if (!usuarioId) {
            setAviso('Entre na sua conta para adicionar jogos à biblioteca.')
            return
        }
        try {
            await adicionarBiblioteca(usuarioId, jogoId)
            setBibliotecaIds((anterior) => new Set([...anterior, jogoId]))
            setAviso('Jogo adicionado à biblioteca.')
        } catch (error) {
            setAviso(error instanceof Error ? error.message : 'Não foi possível adicionar o jogo.')
        }
    }

    const enviarCriacao = async (event: FormEvent) => {
        event.preventDefault()

        let criadorId = ''
        try {
            const dados = JSON.parse(localStorage.getItem('huby_user') || '{}') as { id?: string }
            criadorId = dados.id || ''
        } catch {
            criadorId = ''
        }
        if (!criadorId) {
            setErroCriacao('Entre na sua conta antes de criar um evento.')
            return
        }
        if (!novoEvento.titulo.trim() || !novoEvento.dataInicio || !novoEvento.dataFim) {
            setErroCriacao('Informe título, data de início e data de término.')
            return
        }
        if (novoEvento.dataFim < novoEvento.dataInicio) {
            setErroCriacao('A data de término não pode ser anterior ao início.')
            return
        }

        const premios = novoEvento.premioDescricao.trim() || novoEvento.premioValor.trim()
            ? [{
                posicao: 1,
                descricao: novoEvento.premioDescricao.trim(),
                valor: novoEvento.premioValor.trim()
            }]
            : []
        const payload: NovoEventoApi = {
            criadorId,
            tipo: novoEvento.tipo,
            titulo: novoEvento.titulo.trim(),
            descricao: novoEvento.descricao.trim(),
            imagem: novoEvento.imagem.trim() || undefined,
            organizador: novoEvento.organizador.trim(),
            tema: novoEvento.tema.trim(),
            local: novoEvento.local.trim(),
            dataInicio: novoEvento.dataInicio,
            dataFim: novoEvento.dataFim,
            inscricoesAte: novoEvento.inscricoesAte || undefined,
            tamanhoEquipe: novoEvento.tamanhoEquipe,
            modeloEquipe: novoEvento.modeloEquipe,
            tags: novoEvento.tags.split(',').map((item) => item.trim()).filter(Boolean),
            regras: novoEvento.regras.split('\n').map((item) => item.trim()).filter(Boolean),
            premios,
            cronograma: []
        }

        setCriandoEvento(true)
        setErroCriacao(null)
        try {
            const criado = await criarEvento(payload)
            setCriacaoAberta(false)
            setTentativa((valor) => valor + 1)
            setSelecionado(criado)
            setAviso('Evento criado com sucesso.')
        } catch (error) {
            setErroCriacao(error instanceof Error ? error.message : 'Não foi possível criar o evento.')
        } finally {
            setCriandoEvento(false)
        }
    }

    return (
        <main className={`eventos ${selecionado ? 'has-details' : ''}`}>

            {carregando && <EsqueletoEventos />}

            {!carregando && erro && (
                <div className="eventos-estado eventos-estado-erro" role="alert">
                    <p>{erro}</p>
                    <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button>
                </div>
            )}

            {!carregando && !erro && (
                <>
                    <HeroEventos
                        itens={heroItens}
                        indice={heroItens.length ? heroIndice % heroItens.length : 0}
                        onIndice={setHeroIndice}
                    />

                    <div className="eventos-toolbar">
                        <button
                            type="button"
                            className="eventos-criar"
                            onClick={() => navigate('/eventos/criar')}
                        >
                            <img src="/icon-mais.svg" alt="" />
                            <span>Criar evento</span>
                        </button>

                        <div className="eventos-busca">
                            <BarraDePesquisa
                                value={busca}
                                onChange={setBusca}
                                placeholder="Ex: RPG"
                                filtroAtivo={filtrosAbertos}
                                onFiltroClick={() => setFiltrosAbertos((aberto) => !aberto)}
                            />
                        </div>
                    </div>

                    {criacaoAberta && (
                        <div className="evento-criacao-fundo" role="presentation" onMouseDown={(event) => {
                            if (event.target === event.currentTarget) setCriacaoAberta(false)
                        }}>
                            <form className="evento-criacao" onSubmit={enviarCriacao}>
                                <div className="evento-criacao-midia">
                                    {novoEvento.imagem
                                        ? <img src={novoEvento.imagem} alt="" />
                                        : <span aria-hidden="true">+</span>}
                                </div>
                                <input
                                    className="evento-criacao-capa"
                                    type="url"
                                    value={novoEvento.imagem}
                                    onChange={(event) => setNovoEvento((atual) => ({ ...atual, imagem: event.target.value }))}
                                    placeholder="Coloque o link da capa aqui"
                                />

                                <input
                                    className="evento-criacao-titulo"
                                    value={novoEvento.titulo}
                                    onChange={(event) => setNovoEvento((atual) => ({ ...atual, titulo: event.target.value }))}
                                    placeholder="Coloque o nome aqui"
                                />

                                <div className="evento-criacao-campo">
                                    <label>Organizador</label>
                                    <input
                                        value={novoEvento.organizador}
                                        onChange={(event) => setNovoEvento((atual) => ({ ...atual, organizador: event.target.value }))}
                                        placeholder="@organizador"
                                    />
                                </div>

                                <div className="evento-criacao-campo">
                                    <label>Descrição</label>
                                    <textarea
                                        value={novoEvento.descricao}
                                        onChange={(event) => setNovoEvento((atual) => ({ ...atual, descricao: event.target.value }))}
                                        placeholder="Conte como será o evento"
                                    />
                                </div>

                                <div className="evento-criacao-grid">
                                    <div className="evento-criacao-campo">
                                        <label>Tipo</label>
                                        <select
                                            value={novoEvento.tipo}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, tipo: event.target.value as 'EVENTO' | 'GAME_JAM' }))}
                                        >
                                            <option value="GAME_JAM">Game Jam</option>
                                            <option value="EVENTO">Evento</option>
                                        </select>
                                    </div>
                                    <div className="evento-criacao-campo">
                                        <label>Tamanho da equipe</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={novoEvento.tamanhoEquipe}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, tamanhoEquipe: Number(event.target.value) }))}
                                        />
                                    </div>
                                </div>

                                <div className="evento-criacao-grid">
                                    <div className="evento-criacao-campo">
                                        <label>Inscrições até</label>
                                        <input
                                            type="date"
                                            value={novoEvento.inscricoesAte}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, inscricoesAte: event.target.value }))}
                                        />
                                    </div>
                                    <div className="evento-criacao-campo">
                                        <label>Data de início</label>
                                        <input
                                            type="date"
                                            value={novoEvento.dataInicio}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, dataInicio: event.target.value }))}
                                        />
                                    </div>
                                    <div className="evento-criacao-campo">
                                        <label>Data de término</label>
                                        <input
                                            type="date"
                                            value={novoEvento.dataFim}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, dataFim: event.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="evento-criacao-campo">
                                    <label>Premiação</label>
                                    <div className="evento-criacao-grid">
                                        <input
                                            value={novoEvento.premioDescricao}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, premioDescricao: event.target.value }))}
                                            placeholder="Descrição da premiação"
                                        />
                                        <input
                                            value={novoEvento.premioValor}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, premioValor: event.target.value }))}
                                            placeholder="Valor ou prêmio"
                                        />
                                    </div>
                                </div>

                                <div className="evento-criacao-campo">
                                    <label>Regras</label>
                                    <textarea
                                        value={novoEvento.regras}
                                        onChange={(event) => setNovoEvento((atual) => ({ ...atual, regras: event.target.value }))}
                                        placeholder="Uma regra por linha"
                                    />
                                </div>

                                <div className="evento-criacao-grid">
                                    <div className="evento-criacao-campo">
                                        <label>Tags</label>
                                        <input
                                            value={novoEvento.tags}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, tags: event.target.value }))}
                                            placeholder="RPG, Indie"
                                        />
                                    </div>
                                    <div className="evento-criacao-campo">
                                        <label>Modo de participação</label>
                                        <select
                                            value={novoEvento.modeloEquipe}
                                            onChange={(event) => setNovoEvento((atual) => ({ ...atual, modeloEquipe: event.target.value as 'COMUM' | 'SURPRESA' | 'INDIVIDUAL' }))}
                                        >
                                            <option value="COMUM">Equipe comum</option>
                                            <option value="SURPRESA">Equipe surpresa</option>
                                            <option value="INDIVIDUAL">Individual</option>
                                        </select>
                                    </div>
                                </div>

                                {erroCriacao && <p className="evento-criacao-erro" role="alert">{erroCriacao}</p>}
                                <div className="evento-criacao-acoes">
                                    <button type="button" onClick={() => setCriacaoAberta(false)}>Cancelar</button>
                                    <button type="submit" disabled={criandoEvento}>
                                        {criandoEvento ? 'Criando...' : 'Enviar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {filtrosAbertos && (
                        <div className="eventos-filtros">
                            <div className="eventos-filtros-grupo">
                                <span>Tipo</span>
                                {(['TODOS', 'EVENTO', 'GAME_JAM'] as FiltroTipo[]).map((tipo) => (
                                    <button
                                        key={tipo}
                                        type="button"
                                        className={filtroTipo === tipo ? 'is-active' : ''}
                                        onClick={() => setFiltroTipo(tipo)}
                                    >
                                        {tipo === 'GAME_JAM' ? 'Game Jam' : tipo === 'EVENTO' ? 'Eventos' : 'Todos'}
                                    </button>
                                ))}
                            </div>

                            {tagsDisponiveis.length > 0 && (
                                <div className="eventos-filtros-grupo">
                                    <span>Categorias</span>
                                    {tagsDisponiveis.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            className={tagFiltro === tag ? 'is-active' : ''}
                                            onClick={() => setTagFiltro((atualTag) => (atualTag === tag ? null : tag))}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {filtrosAtivos && (
                                <button type="button" className="eventos-filtros-limpar" onClick={limparFiltros}>
                                    Limpar filtros
                                </button>
                            )}
                        </div>
                    )}

                    {aviso && <p className="eventos-aviso" role="status">{aviso}</p>}

                    {semResultados && (
                        <div className="eventos-estado">
                            <p>Nenhum evento encontrado com esses filtros.</p>
                            <button type="button" onClick={limparFiltros}>Limpar filtros</button>
                        </div>
                    )}

                    {!semResultados && inscricoesFiltradas.length > 0 && (
                        <section className="eventos-secao">
                            <h2 className="eventos-secao-titulo">Inscrições terminando</h2>

                            <TrilhaEventos
                                titulo="Inscrições terminando"
                                eventos={inscricoesFiltradas}
                                onAbrir={abrirEvento}
                            />
                        </section>
                    )}

                    {!semResultados && jamsFiltradas.length > 0 && (
                        <section className="eventos-secao">
                            <h2 className="eventos-secao-titulo">Game jam</h2>

                            <TrilhaEventos
                                titulo="Game jam"
                                eventos={jamsFiltradas}
                                onAbrir={abrirEvento}
                            />
                        </section>
                    )}
                </>
            )}

            {atual && (
                <>
                    <div
                        className={`evento-detalhe-overlay ${selecionado ? 'is-open' : ''}`}
                        onClick={fecharEvento}
                        aria-hidden="true"
                    />

                    <button
                        ref={fecharRef}
                        type="button"
                        className={`evento-detalhe-voltar ${selecionado ? 'is-open' : ''}`}
                        onClick={fecharEvento}
                        aria-label="Fechar detalhes"
                        tabIndex={selecionado ? 0 : -1}
                    >
                        <IconeAvancar />
                    </button>

                    <aside
                        className={`evento-detalhe ${selecionado ? 'is-open' : ''}`}
                        aria-label={`Detalhes de ${atual.titulo}`}
                    >
                        <div className="evento-detalhe-capa">
                            <img src={atual.imagem || '/imagem-polvojam.jpg'} alt={atual.titulo} />
                        </div>

                        <div className="evento-detalhe-faixa">
                            <h2>{atual.titulo}</h2>
                            <span className="evento-detalhe-pill">{categoriaDoEvento(atual)}</span>
                        </div>

                        <div className="evento-detalhe-corpo">
                            <strong className="evento-detalhe-dev">{atual.desenvolvedor}</strong>
                            <span className="evento-detalhe-handle">{handleDe(atual.desenvolvedor)}</span>

                            {atual.tema && <p className="evento-tema">{atual.tema}</p>}

                            <section className="evento-detalhe-secao">
                                <h3>Descrição</h3>
                                <p>{atual.descricaoLonga || atual.descricao}</p>
                            </section>

                            {atual.premios && atual.premios.length > 0 && (
                                <section className="evento-detalhe-secao">
                                    <h3>Premiação</h3>
                                    <div className="evento-premios">
                                        {agruparPremiosEvento(atual.premios).map((premio) => (
                                            <div
                                                className={`evento-premio ${premio.dinheiro && premio.premio ? 'is-dupla' : ''}`}
                                                key={premio.posicao}
                                            >
                                                <span className="evento-premio-posicao">{premio.posicao}</span>
                                                {premio.dinheiro && (
                                                    <span className="evento-premio-info">R$ {premio.dinheiro}</span>
                                                )}
                                                {premio.premio && (
                                                    <span className="evento-premio-info" title={premio.premio}>
                                                        {premio.premio}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {atual.cronograma && atual.cronograma.length > 0 && (
                                <section className="evento-detalhe-secao">
                                    <h3>Cronograma</h3>

                                    <div className="evento-cronograma">
                                        {atual.cronograma.map((etapa) => {
                                            const [inicio, fim] = partesPeriodoEvento(etapa.periodo)
                                            const isResultado = etapa.titulo === 'Data do resultado'
                                            const status = isResultado
                                                ? (agora > new Date(`${inicio}T23:59:59`).getTime() ? 'Encerrado' : '-')
                                                : statusPeriodoEvento(inicio, fim, agora)

                                            return (
                                                <div className="evento-etapa-cron" key={`${etapa.titulo}-${etapa.periodo}`}>
                                                    <div className="evento-campo">
                                                        <span>Tempo restante:</span>
                                                        <div className={`evento-campo-box ${status === 'Encerrado' ? 'is-encerrado' : ''}`}>{status}</div>
                                                    </div>

                                                    <div className="evento-campo">
                                                        <span>{etapa.titulo}:</span>
                                                        <div className={`evento-campo-duplo ${isResultado ? 'is-unico' : ''}`}>
                                                            <div className="evento-campo-box">{formatarDataHoraEvento(inicio)}</div>
                                                            {!isResultado && <div className="evento-campo-box">{formatarDataHoraEvento(fim)}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>
                            )}

                            {atual.regras && atual.regras.length > 0 && (
                                <section className="evento-detalhe-secao">
                                    <h3>Regras</h3>
                                    <div className="evento-regras">
                                        {atual.regras.map((regra) => (
                                            <p key={regra}>{regra}</p>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <div className="evento-acoes">
                                <button
                                    type="button"
                                    className="evento-acao is-primaria"
                                    onClick={() => {
                                        setSelecionado(null)
                                        navigate(`/eventos/${atual.id}/inscricao`)
                                    }}
                                >
                                    Inscrever equipe
                                </button>

                                <button
                                    type="button"
                                    className="evento-acao is-secundaria"
                                    onClick={() => {
                                        setSelecionado(null)
                                        navigate(`/eventos/${atual.id}/equipes`)
                                    }}
                                >
                                    Equipes inscritas
                                </button>

                                <button
                                    type="button"
                                    className={`evento-acao is-secundaria ${procurandoEquipe.has(atual.id) ? 'is-ativo' : ''}`}
                                    onClick={() => alternarProcurando(atual)}
                                    aria-pressed={procurandoEquipe.has(atual.id)}
                                >
                                    {procurandoEquipe.has(atual.id) ? 'Procurando equipe ✓' : 'Procurando equipe'}
                                </button>
                            </div>

                            <div className="evento-comentar-bloco">
                                <button type="button" className="evento-acao is-primaria" onClick={irParaComentarios}>
                                    Comentar
                                </button>
                            </div>

                            <section className="evento-comentarios" ref={comentariosRef}>
                                <div className="evento-abas" role="tablist" aria-label="Seções do evento">
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={abaDetalhe === 'comentarios'}
                                        className={abaDetalhe === 'comentarios' ? 'is-active' : ''}
                                        onClick={() => setAbaDetalhe('comentarios')}
                                    >
                                        Comentários
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={abaDetalhe === 'jogos'}
                                        className={abaDetalhe === 'jogos' ? 'is-active' : ''}
                                        onClick={() => setAbaDetalhe('jogos')}
                                    >
                                        Jogos Publicados
                                    </button>
                                </div>

                                {abaDetalhe === 'comentarios' && (
                                    <>
                                        {editorAberto && (
                                            <form className="evento-comentario-form" onSubmit={enviarComentario}>
                                                <img src="/icon-perfil.png" alt="" />
                                                <input
                                                    ref={editorRef}
                                                    type="text"
                                                    value={novoComentario}
                                                    onChange={(event) => setNovoComentario(event.target.value)}
                                                    placeholder="Escreva um comentário..."
                                                    aria-label="Escreva um comentário"
                                                />
                                                <button type="submit" disabled={!novoComentario.trim()}>Comentar</button>
                                            </form>
                                        )}

                                        <div className="evento-ordem">
                                            <button
                                                type="button"
                                                className={ordemComentarios === 'recentes' ? 'is-active' : ''}
                                                onClick={() => setOrdemComentarios('recentes')}
                                            >
                                                Recentes
                                            </button>
                                            <button
                                                type="button"
                                                className={ordemComentarios === 'populares' ? 'is-active' : ''}
                                                onClick={() => setOrdemComentarios('populares')}
                                            >
                                                Populares
                                            </button>
                                        </div>

                                        {comentariosOrdenados.length === 0 && (
                                            <p className="evento-comentarios-vazio">Seja a primeira pessoa a comentar.</p>
                                        )}

                                        <div className="evento-comentarios-lista">
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

                                {abaDetalhe === 'jogos' && (
                                    <div className="evento-jogos">
                                        {carregandoJogos && <p className="evento-comentarios-vazio">Carregando jogos...</p>}

                                        {!carregandoJogos && jogosErro && (
                                            <p className="evento-comentarios-vazio">{jogosErro}</p>
                                        )}

                                        {!carregandoJogos && !jogosErro && (jogos[atual.id] ?? []).length === 0 && (
                                            <p className="evento-comentarios-vazio">
                                                {atual.tipo === 'GAME_JAM'
                                                    ? 'Nenhum jogo publicado nesta jam ainda.'
                                                    : 'Este evento ainda não tem jogos publicados.'}
                                            </p>
                                        )}

                                        {!carregandoJogos && !jogosErro && (jogos[atual.id] ?? []).map((jogo) => (
                                            <article className="evento-jogo" key={jogo.id}>
                                                <img src={jogo.imagem} alt="" />
                                                <div>
                                                    <strong>{jogo.titulo}</strong>
                                                    <span>{jogo.desenvolvedor}</span>
                                                    <p>{jogo.descricao}</p>
                                                    {jogo.linkUrl && (
                                                        <a
                                                            className="evento-jogo-link"
                                                            href={jogo.linkUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            Abrir jogo
                                                        </a>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="evento-jogo-biblioteca"
                                                        onClick={() => adicionarJogoBiblioteca(jogo.id)}
                                                        disabled={bibliotecaIds.has(jogo.id)}
                                                    >
                                                        {bibliotecaIds.has(jogo.id) ? 'Na biblioteca' : 'Adicionar à biblioteca'}
                                                    </button>
                                                </div>
                                                <span className="evento-jogo-nota">{jogo.nota?.toFixed(1)}</span>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </aside>
                </>
            )}
        </main>
    )
}
