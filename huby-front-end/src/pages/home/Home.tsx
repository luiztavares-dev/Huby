import './Home.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Banner from '../../components/banner/Banner'
import BarraDePesquisa from '../../components/searchBar/SearchBar'
import GameDetails, { type Game } from '../../components/gameDetails/GameDetails'
import categoriesData from '../../data/DadosCategories.json'
import { buscarCarrosseisHome, type CarrosselApi, type ConteudoApi } from '../../services/home'
import { formatarParticipantes, formatarPeriodo } from '../../utils/formato'

type CategoriaMap = Record<string, {
    Descricao: string
    SubCategorias?: Array<{ Titulo: string; Descricao: string }>
}>

const categoriaMap = categoriesData as CategoriaMap

const categoriasExtras: Record<string, string> = {
    'GAME JAM': 'Evento em que desenvolvedores criam jogos do zero em um curto período, geralmente a partir de um tema surpresa.',
    'COMUNIDADE': 'Espaços e projetos mantidos pela comunidade de jogadores e desenvolvedores.',
    'ONLINE': 'Experiências jogadas online, com partidas e eventos conectados.',
    'PIXEL ART': 'Jogos com estética de pixel art, gráficos retrô e animações quadro a quadro.',
    'RÁPIDO': 'Partidas e desafios rápidos, feitos para sessões curtas de jogo.',
    'CRIATIVO': 'Projetos que priorizam criatividade, experimentação e ideias originais.'
}

const normalizarCategoria = (valor: string) => {
    return valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
}

const normalizarFiltroCategoria = (valor: string) => {
    const categoria = normalizarCategoria(valor)
    return categoria === 'horror' ? 'terror' : categoria
}

const getCategoriaInfo = (tag: string) => {
    const tagNormalizada = normalizarCategoria(tag)
    const entradas = Object.entries(categoriaMap)

    const categoriaExata = entradas.find(([categoria]) => normalizarCategoria(categoria) === tagNormalizada)
    if (categoriaExata) {
        return categoriaExata[1].Descricao
    }

    for (const [, info] of entradas) {
        const sub = info.SubCategorias?.find((item) => normalizarCategoria(item.Titulo) === tagNormalizada)
        if (sub) {
            return sub.Descricao
        }
    }

    return categoriasExtras[tag] ?? 'Categoria do jogo.'
}

type HomeGame = Game & {
    dataPublicacao?: string | null
    preco: number
}

type Secao = {
    id: string
    title: string
    subtitle?: string
    items: HomeGame[]
}

type FiltroPreco = 'todos' | 'gratuito' | 'faixa'
type Ordenacao = 'padrao' | 'recentes' | 'antigos' | 'menor-preco' | 'maior-preco' | 'melhor-avaliacao' | 'menor-avaliacao'

type Filtros = {
    categorias: string[]
    preco: FiltroPreco
    precoMinimo: number
    precoMaximo: number
    ordenacao: Ordenacao
}

const filtrosIniciais: Filtros = {
    categorias: [],
    preco: 'todos',
    precoMinimo: 10,
    precoMaximo: 200,
    ordenacao: 'padrao'
}
const categoriasFiltro = Object.keys(categoriaMap)
const precoMinimo = 10
const precoMaximo = 200
const plataformasValidas = new Set(['website', 'mobile', 'pc'])

function paraGame(item: ConteudoApi): HomeGame {
    return {
        id: item.id,
        tipo: item.tipo,
        title: item.titulo,
        description: item.descricao,
        longDescription: item.descricaoLonga,
        developer: item.desenvolvedor,
        image: item.imagem,
        tags: item.tags ?? [],
        score: item.nota ?? 0,
        reviews: item.avaliacoes ?? 0,
        preco: item.preco ?? 0,
        platforms: (item.plataformas ?? []).filter(
            (plataforma): plataforma is 'website' | 'mobile' | 'pc' => plataformasValidas.has(plataforma)
        ),
        dataPublicacao: item.dataPublicacao,
        dataInicio: item.dataInicio,
        dataFim: item.dataFim,
        participantes: item.participantes,
        local: item.local,
        comentarios: item.comentarios ?? []
    }
}

function paraSecao(carrossel: CarrosselApi): Secao {
    return {
        id: carrossel.id,
        title: carrossel.titulo,
        subtitle: carrossel.subtitulo ?? undefined,
        items: carrossel.itens.map(paraGame)
    }
}

function PlatformIcon({ type }: { type: 'website' | 'mobile' | 'pc' }) {
    if (type === 'pc') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
                <path d="M9 20.5h6M12 16.5v4" />
            </svg>
        )
    }

    if (type === 'website') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4.5" y="5" width="15" height="10.5" rx="1" />
                <path d="M2.5 18.5h19" />
            </svg>
        )
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="7.5" y="3" width="9" height="18" rx="1.8" />
            <path d="M11 17.5h2" />
        </svg>
    )
}

const platformLabels: Record<'website' | 'mobile' | 'pc', string> = {
    pc: 'PC',
    website: 'Navegador',
    mobile: 'Celular'
}

function Stars({ score }: { score: number }) {
    const filled = Math.round(score)

    return (
    <span className="game-card-stars" aria-label={`Nota ${score} de 5`}>
        {[1, 2, 3, 4, 5].map((index) => (
            <span key={index} className={index <= filled ? 'is-filled' : ''} aria-hidden="true">★</span>
        ))}
    </span>
    )
}

function GameCard({ game, isSelected, onSelect }: {
    game: Game
    isSelected: boolean
    onSelect: (game: Game) => void
}) {
    const [activeTag, setActiveTag] = useState<{ tag: string; descricao: string } | null>(null)

    const showTag = (tag: string) => {
        setActiveTag({ tag, descricao: getCategoriaInfo(tag) })
    }

    const isJogo = game.tipo === 'JOGO'
    const participantes = formatarParticipantes(game.participantes)

    return (
        <article
            className={`game-card ${isSelected ? 'is-selected' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={`Ver detalhes de ${game.title}`}
            onClick={() => onSelect(game)}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(game)
                }
            }}
        >
            <div className="game-card-image">
                <img src={game.image} alt={game.title} />
                <button
                    type="button"
                    className="game-card-more"
                    aria-label={`Mais opções para ${game.title}`}
                    onClick={(event) => {
                        event.stopPropagation()
                        onSelect(game)
                    }}
                >
                    •••
                </button>
            </div>

            <div className="game-card-body">
                <h3>{game.title}</h3>
                <p>{game.description}</p>

                {isJogo ? (
                    <div className="game-card-rating">
                        <Stars score={game.score} />
                        <small>{game.score.toFixed(1)} ({game.reviews})</small>
                    </div>
                ) : (
                    <div className="game-card-event-meta">
                        <span className="game-card-event-period">{formatarPeriodo(game.dataInicio, game.dataFim)}</span>
                        {participantes && <small>{participantes}</small>}
                    </div>
                )}

                <div className="game-card-tags">
                    {game.tags.map((tag) => (
                        <button
                            key={`${game.id}-${tag}`}
                            type="button"
                            className={`game-card-tag ${activeTag?.tag === tag ? 'is-active' : ''}`}
                            onMouseEnter={() => showTag(tag)}
                            onMouseLeave={() => setActiveTag(null)}
                            onFocus={() => showTag(tag)}
                            onBlur={() => setActiveTag(null)}
                            onClick={(event) => {
                                event.stopPropagation()
                                showTag(tag)
                            }}
                        >
                            {tag}
                        </button>
                    ))}

                    {game.platforms.length > 0 && (
                        <span className="game-card-platforms">
                            {game.platforms.map((platform) => (
                                <span key={platform} title={platformLabels[platform]} aria-label={platformLabels[platform]}>
                                    <PlatformIcon type={platform} />
                                </span>
                            ))}
                        </span>
                    )}
                </div>

                <div className={`game-card-tooltip ${activeTag ? 'is-open' : ''}`}>
                    <div className="game-card-tooltip-clip">
                        <p>{activeTag?.descricao}</p>
                    </div>
                </div>
            </div>
        </article>
    )
}

function CarouselSection({ title, subtitle, items, selectedId, onSelect }: {
    title: string
    subtitle?: string
    items: Game[]
    selectedId: string | null
    onSelect: (game: Game) => void
}) {
    const trackRef = useRef<HTMLDivElement | null>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const updateScrollState = () => {
        const track = trackRef.current
        if (!track) return

        const maxScroll = track.scrollWidth - track.clientWidth
        setCanScrollLeft(track.scrollLeft > 10)
        setCanScrollRight(track.scrollLeft < maxScroll - 10)
    }

    useEffect(() => {
        updateScrollState()

        const track = trackRef.current
        if (!track) return

        const handleScroll = () => updateScrollState()
        track.addEventListener('scroll', handleScroll)

        const observer = new ResizeObserver(updateScrollState)
        observer.observe(track)

        return () => {
            track.removeEventListener('scroll', handleScroll)
            observer.disconnect()
        }
    }, [items])

    const scrollCarousel = (direction: number) => {
        if (!trackRef.current) return

        const cardWidth = trackRef.current.querySelector('.game-card')?.clientWidth ?? 350
        trackRef.current.scrollBy({
            left: direction * (cardWidth + 20),
            behavior: 'smooth'
        })
    }

    return (
        <div className="home-section">
            <div className="home-section-heading">
                <div className="home-section-title">
                    <h2>{title}</h2>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                <span>{items.length} {items.length === 1 ? 'resultado' : 'resultados'}</span>
            </div>

            <div className="home-carousel-wrap">
                <button
                    type="button"
                    className={`carousel-arrow carousel-arrow-left ${canScrollLeft ? 'is-visible' : ''}`}
                    aria-label={`Voltar em ${title}`}
                    onClick={() => scrollCarousel(-1)}
                    disabled={!canScrollLeft}
                >
                    ‹
                </button>

                <div className="home-carousel" ref={trackRef}>
                    {items.map((game) => (
                        <GameCard
                            key={game.id}
                            game={game}
                            isSelected={selectedId === game.id}
                            onSelect={onSelect}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    className={`carousel-arrow carousel-arrow-right ${canScrollRight ? 'is-visible' : ''}`}
                    aria-label={`Avançar em ${title}`}
                    onClick={() => scrollCarousel(1)}
                    disabled={!canScrollRight}
                >
                    ›
                </button>
            </div>
        </div>
    )
}

function HomeSkeleton() {
    return (
        <>
            {[0, 1].map((bloco) => (
                <div className="home-section" key={bloco} aria-hidden="true">
                    <div className="home-section-heading home-skeleton-heading">
                        <span className="home-skeleton-line" />
                        <span className="home-skeleton-line home-skeleton-line-short" />
                    </div>
                    <div className="home-carousel">
                        {[0, 1, 2, 3].map((card) => (
                            <div className="game-card home-skeleton-card" key={card}>
                                <div className="home-skeleton-image" />
                                <div className="game-card-body">
                                    <span className="home-skeleton-line" />
                                    <span className="home-skeleton-line home-skeleton-line-short" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    )
}

function IconeAvancarFiltros() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
        </svg>
    )
}

const formatarPreco = (valor: number) => valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
})

function PainelFiltros({ isOpen, filtros, onAplicar, onCancelar }: {
    isOpen: boolean
    filtros: Filtros
    onAplicar: (filtros: Filtros) => void
    onCancelar: () => void
}) {
    const painelRef = useRef<HTMLElement>(null)
    const fecharRef = useRef<HTMLButtonElement>(null)
    const [rascunho, setRascunho] = useState(filtros)
    const [abertas, setAbertas] = useState<string[]>(['Ação'])
    const categorias = categoriasFiltro.map((categoria) => [categoria, categoriaMap[categoria]] as const)

    useEffect(() => {
        if (!isOpen) return
        setRascunho(filtros)
        setAbertas(['Ação'])
        painelRef.current?.scrollTo({ top: 0 })
    }, [filtros, isOpen])

    useEffect(() => {
        if (!isOpen) return

        const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
        fecharRef.current?.focus()

        const aoTeclar = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancelar()
        }

        window.addEventListener('keydown', aoTeclar)
        return () => {
            window.removeEventListener('keydown', aoTeclar)
            focoAnterior?.focus()
        }
    }, [isOpen, onCancelar])

    const alternarCategoria = (categoria: string) => {
        setRascunho((atual) => ({
            ...atual,
            categorias: atual.categorias.includes(categoria)
                ? atual.categorias.filter((item) => item !== categoria)
                : [...atual.categorias, categoria]
        }))
    }

    const alternarPreco = (preco: Exclude<FiltroPreco, 'todos'>) => {
        setRascunho((atual) => ({ ...atual, preco: atual.preco === preco ? 'todos' : preco }))
    }

    const posicaoMinima = ((rascunho.precoMinimo - precoMinimo) / (precoMaximo - precoMinimo)) * 100
    const posicaoMaxima = ((rascunho.precoMaximo - precoMinimo) / (precoMaximo - precoMinimo)) * 100

    return (
        <>
            <div
                className={`home-filtros-overlay ${isOpen ? 'is-open' : ''}`}
                onClick={onCancelar}
                aria-hidden="true"
            />

            <button
                ref={fecharRef}
                type="button"
                className={`home-filtros-voltar ${isOpen ? 'is-open' : ''}`}
                onClick={onCancelar}
                aria-label="Fechar filtros"
                tabIndex={isOpen ? 0 : -1}
            >
                <IconeAvancarFiltros />
            </button>

            <aside
                ref={painelRef}
                className={`home-filtros ${isOpen ? 'is-open' : ''}`}
                aria-labelledby="home-filtros-titulo"
                aria-hidden={!isOpen}
            >
                <div className="home-filtros-cabecalho">
                    <h2 id="home-filtros-titulo">Filtro</h2>
                </div>

                <section className="home-filtros-secao" aria-labelledby="home-filtros-preco">
                    <h3 id="home-filtros-preco">Preço</h3>
                    <div className="home-filtros-opcoes">
                        <button
                            type="button"
                            className={`home-filtros-chip ${rascunho.preco === 'gratuito' ? 'is-selecionado' : ''}`}
                            aria-pressed={rascunho.preco === 'gratuito'}
                            onClick={() => alternarPreco('gratuito')}
                        >
                            Gratuito
                        </button>
                        <button
                            type="button"
                            className={`home-filtros-chip ${rascunho.preco === 'faixa' ? 'is-selecionado' : ''}`}
                            aria-pressed={rascunho.preco === 'faixa'}
                            onClick={() => alternarPreco('faixa')}
                        >
                            Faixa de preço
                        </button>
                    </div>
                    <div className="home-filtros-faixa">
                        <div className="home-filtros-faixa-trilha" aria-hidden="true">
                            <span style={{ left: `${posicaoMinima}%`, right: `${100 - posicaoMaxima}%` }} />
                        </div>
                        <input
                            type="range"
                            min={precoMinimo}
                            max={precoMaximo}
                            value={rascunho.precoMinimo}
                            aria-label="Preço mínimo"
                            aria-valuetext={formatarPreco(rascunho.precoMinimo)}
                            onChange={(event) => setRascunho((atual) => ({
                                ...atual,
                                preco: 'faixa',
                                precoMinimo: Math.min(Number(event.target.value), atual.precoMaximo)
                            }))}
                        />
                        <input
                            type="range"
                            min={precoMinimo}
                            max={precoMaximo}
                            value={rascunho.precoMaximo}
                            aria-label="Preço máximo"
                            aria-valuetext={formatarPreco(rascunho.precoMaximo)}
                            onChange={(event) => setRascunho((atual) => ({
                                ...atual,
                                preco: 'faixa',
                                precoMaximo: Math.max(Number(event.target.value), atual.precoMinimo)
                            }))}
                        />
                    </div>
                    <div className="home-filtros-faixa-valores">
                        <span>{formatarPreco(rascunho.precoMinimo)}</span>
                        <span>{formatarPreco(rascunho.precoMaximo)}</span>
                    </div>
                </section>

                <section className="home-filtros-secao" aria-labelledby="home-filtros-categorias">
                    <h3 id="home-filtros-categorias">Categorias</h3>
                    <div className="home-filtros-categorias">
                        {categorias.map(([categoria, info]) => {
                            const aberta = abertas.includes(categoria)
                            const opcoes = (info.SubCategorias?.map((item) => item.Titulo) ?? [categoria])
                                .map((item) => item === 'Horror' ? 'Terror' : item)
                            const selecionada = opcoes.some((item) => rascunho.categorias.includes(item))

                            return (
                                <div className="home-filtros-grupo" key={categoria}>
                                    <button
                                        type="button"
                                        className="home-filtros-grupo-titulo"
                                        aria-expanded={aberta}
                                        onClick={() => setAbertas((atual) => aberta ? atual.filter((item) => item !== categoria) : [...atual, categoria])}
                                    >
                                        <span className={`home-filtros-seta ${aberta ? 'is-aberta' : ''}`} aria-hidden="true" />
                                        {categoria === 'Horror' ? 'Terror' : categoria}
                                        {selecionada && <span className="home-filtros-marcador" aria-label="Categoria com filtros selecionados" />}
                                    </button>
                                    {aberta && (
                                        <div className="home-filtros-opcoes">
                                            {opcoes.map((opcao) => (
                                                <button
                                                    type="button"
                                                    key={opcao}
                                                    className={`home-filtros-chip ${rascunho.categorias.includes(opcao) ? 'is-selecionado' : ''}`}
                                                    aria-pressed={rascunho.categorias.includes(opcao)}
                                                    onClick={() => alternarCategoria(opcao)}
                                                >
                                                    {opcao}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>

                <section className="home-filtros-secao" aria-labelledby="home-filtros-ordenar">
                    <h3 id="home-filtros-ordenar">Ordenar por</h3>
                    <div className="home-filtros-opcoes">
                        <select
                            aria-label="Ordenar por data"
                            value={['recentes', 'antigos'].includes(rascunho.ordenacao) ? rascunho.ordenacao : ''}
                            onChange={(event) => setRascunho((atual) => ({ ...atual, ordenacao: (event.target.value || 'padrao') as Ordenacao }))}
                        >
                            <option value="">Data</option>
                            <option value="recentes">Mais recentes</option>
                            <option value="antigos">Mais antigos</option>
                        </select>
                        <select
                            aria-label="Ordenar por preço"
                            value={['menor-preco', 'maior-preco'].includes(rascunho.ordenacao) ? rascunho.ordenacao : ''}
                            onChange={(event) => setRascunho((atual) => ({ ...atual, ordenacao: (event.target.value || 'padrao') as Ordenacao }))}
                        >
                            <option value="">Preço</option>
                            <option value="menor-preco">Menor preço</option>
                            <option value="maior-preco">Maior preço</option>
                        </select>
                        <select
                            aria-label="Ordenar por avaliação"
                            value={['melhor-avaliacao', 'menor-avaliacao'].includes(rascunho.ordenacao) ? rascunho.ordenacao : ''}
                            onChange={(event) => setRascunho((atual) => ({ ...atual, ordenacao: (event.target.value || 'padrao') as Ordenacao }))}
                        >
                            <option value="">Avaliação</option>
                            <option value="melhor-avaliacao">Maior avaliação</option>
                            <option value="menor-avaliacao">Menor avaliação</option>
                        </select>
                    </div>
                </section>

                <div className="home-filtros-acoes">
                    <button type="button" className="home-filtros-cancelar" onClick={onCancelar}>Cancelar</button>
                    <button type="button" className="home-filtros-aplicar" onClick={() => onAplicar(rascunho)}>Aplicar</button>
                    <button type="button" className="home-filtros-limpar" onClick={() => setRascunho(filtrosIniciais)}>Limpar filtros</button>
                </div>
            </aside>
        </>
    )
}

export function Home() {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null)
    const [secoes, setSecoes] = useState<Secao[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [tentativa, setTentativa] = useState(0)
    const [busca, setBusca] = useState('')
    const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais)
    const [filtrosAbertos, setFiltrosAbertos] = useState(false)

    useEffect(() => {
        const controller = new AbortController()

        setCarregando(true)
        setErro(null)

        buscarCarrosseisHome(controller.signal)
            .then((carrosseis) => setSecoes(carrosseis.map(paraSecao)))
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setErro(error instanceof Error ? error.message : 'Não foi possível carregar os destaques.')
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false)
            })

        return () => controller.abort()
    }, [tentativa])

    const closeDetails = useCallback(() => setSelectedGame(null), [])
    const closeFiltros = useCallback(() => setFiltrosAbertos(false), [])
    const recarregar = useCallback(() => setTentativa((valor) => valor + 1), [])
    const filtrosAtivos = filtros.categorias.length > 0 || filtros.preco !== 'todos' || filtros.ordenacao !== 'padrao'

    const secoesFiltradas = useMemo(() => {
        const termo = normalizarCategoria(busca.trim())
        const categorias = filtros.categorias.map(normalizarFiltroCategoria)

        return secoes.map((secao) => {
            const items = secao.items.filter((item) => {
                const correspondeBusca = !termo || [item.title, item.description, item.developer, ...item.tags]
                    .some((campo) => normalizarCategoria(campo).includes(termo))
                const correspondeCategoria = categorias.length === 0 || item.tags
                    .some((tag) => categorias.includes(normalizarFiltroCategoria(tag)))
                const correspondePreco = filtros.preco === 'todos'
                    || (filtros.preco === 'gratuito' && item.preco === 0)
                    || (filtros.preco === 'faixa' && item.preco >= filtros.precoMinimo && item.preco <= filtros.precoMaximo)
                return correspondeBusca && correspondeCategoria && correspondePreco
            })

            if (filtros.ordenacao === 'recentes' || filtros.ordenacao === 'antigos') {
                items.sort((a, b) => {
                    if (!a.dataPublicacao) return b.dataPublicacao ? 1 : 0
                    if (!b.dataPublicacao) return -1
                    const comparacao = a.dataPublicacao.localeCompare(b.dataPublicacao)
                    return filtros.ordenacao === 'recentes' ? -comparacao : comparacao
                })
            } else if (filtros.ordenacao === 'menor-preco') {
                items.sort((a, b) => a.preco - b.preco)
            } else if (filtros.ordenacao === 'maior-preco') {
                items.sort((a, b) => b.preco - a.preco)
            } else if (filtros.ordenacao === 'melhor-avaliacao') {
                items.sort((a, b) => b.score - a.score)
            } else if (filtros.ordenacao === 'menor-avaliacao') {
                items.sort((a, b) => a.score - b.score)
            }

            return { ...secao, items }
        }).filter((secao) => secao.items.length > 0)
    }, [busca, filtros, secoes])

    return (
        <main className="home">

            <Banner />

            <section className="home-catalog" aria-busy={carregando}>

                <div className="home-toolbar">
                    <BarraDePesquisa
                        value={busca}
                        onChange={setBusca}
                        filtroAtivo={filtrosAbertos}
                        onFiltroClick={() => setFiltrosAbertos(true)}
                    />
                </div>

                {filtrosAtivos && (
                    <button type="button" className="home-limpar-filtros" onClick={() => setFiltros(filtrosIniciais)}>
                        Limpar filtros
                    </button>
                )}

                {carregando && <HomeSkeleton />}

                {!carregando && erro && (
                    <div className="home-state home-state-error" role="alert">
                        <p>{erro}</p>
                        <button type="button" onClick={recarregar}>Tentar novamente</button>
                    </div>
                )}

                {!carregando && !erro && secoes.length === 0 && (
                    <div className="home-state">
                        <p>Nenhum conteúdo publicado ainda. Volte em breve.</p>
                    </div>
                )}

                {!carregando && !erro && secoes.length > 0 && secoesFiltradas.length === 0 && (
                    <div className="home-state" role="status">
                        <p>Nenhum resultado encontrado para a busca e os filtros selecionados.</p>
                    </div>
                )}

                {!carregando && !erro && secoesFiltradas.map((secao) => (
                    <CarouselSection
                        key={secao.id}
                        title={secao.title}
                        subtitle={secao.subtitle}
                        items={secao.items}
                        selectedId={selectedGame?.id ?? null}
                        onSelect={setSelectedGame}
                    />
                ))}

            </section>

            <PainelFiltros
                isOpen={filtrosAbertos}
                filtros={filtros}
                onAplicar={(novosFiltros) => {
                    setFiltros(novosFiltros)
                    setFiltrosAbertos(false)
                }}
                onCancelar={closeFiltros}
            />

            <GameDetails
                game={selectedGame}
                isOpen={selectedGame !== null}
                onClose={closeDetails}
            />

        </main>
    )
}
