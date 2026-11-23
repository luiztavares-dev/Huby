import './Home.css'

import { useCallback, useEffect, useRef, useState } from 'react'

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

type Secao = {
    id: string
    title: string
    subtitle?: string
    items: Game[]
}

const plataformasValidas = new Set(['website', 'mobile', 'pc'])

function paraGame(item: ConteudoApi): Game {
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
        platforms: (item.plataformas ?? []).filter(
            (plataforma): plataforma is 'website' | 'mobile' | 'pc' => plataformasValidas.has(plataforma)
        ),
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

export function Home() {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null)
    const [secoes, setSecoes] = useState<Secao[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [tentativa, setTentativa] = useState(0)

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
    const recarregar = useCallback(() => setTentativa((valor) => valor + 1), [])

    return (
        <main className="home">

            <Banner />

            <section className="home-catalog" aria-busy={carregando}>

                <div className="home-toolbar">
                    <BarraDePesquisa />
                </div>

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

                {!carregando && !erro && secoes.map((secao) => (
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

            <GameDetails
                game={selectedGame}
                isOpen={selectedGame !== null}
                onClose={closeDetails}
            />

        </main>
    )
}
