import './Home.css'

import { useCallback, useEffect, useRef, useState } from 'react'

import Banner from '../../components/banner/Banner'
import BarraDePesquisa from '../../components/searchBar/SearchBar'
import GameDetails, { type Game } from '../../components/gameDetails/GameDetails'
import categoriesData from '../../data/DadosCategories.json'

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
        .replace(/[̀-ͯ]/g, '')
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

const games: Game[] = [
    {
        id: 1,
        title: 'Hollow Knight Silksong',
        description: 'Jogo de ação e aventura no estilo Metroidvania.',
        longDescription: 'Hollow Knight: Silksong é um jogo de ação e aventura no estilo Metroidvania desenvolvido pela Team Cherry. No controle de Hornet, uma ágil guerreira, o jogador explora um reino desconhecido cheio de perigos, enfrenta criaturas desafiadoras, descobre novas habilidades e desbloqueia caminhos antes inacessíveis em uma jornada até o pico do mundo.',
        developer: 'Dev.Lukario',
        image: '/Silksong.png',
        tags: ['AVENTURA', 'METROIDVANIA'],
        score: 4.0,
        reviews: 582,
        platforms: ['pc', 'website', 'mobile']
    },
    {
        id: 2,
        title: 'Polvo Jam',
        description: 'Uma game jam para experimentar novas ideias.',
        longDescription: 'Polvo Jam é uma game jam colaborativa criada para experimentar novas ideias sem pressão. Participantes formam equipes, escolhem um tema surpresa e têm um fim de semana para prototipar, testar e publicar jogos autorais cheios de personalidade.',
        developer: 'Estúdio Polvo',
        image: '/imagem-polvojam.jpg',
        tags: ['AVENTURA', 'INDIE'],
        score: 4.0,
        reviews: 124,
        platforms: ['website', 'pc']
    },
    {
        id: 3,
        title: 'Global Game Jam',
        description: 'Crie, compartilhe e participe de projetos.',
        longDescription: 'A Global Game Jam é o maior evento presencial de criação de jogos do mundo. Milhares de desenvolvedores, artistas e músicos se reúnem em sedes espalhadas pelo planeta para criar jogos do zero em 48 horas, compartilhando conhecimento e celebrando a criatividade.',
        developer: 'GGJ Foundation',
        image: '/imagem-ggj.png',
        tags: ['GAME JAM', 'COMUNIDADE'],
        score: 4.5,
        reviews: 318,
        platforms: ['website']
    },
    {
        id: 4,
        title: 'Brasil Game Jam',
        description: 'Evento para desenvolvedores e artistas.',
        longDescription: 'A Brasil Game Jam reúne desenvolvedores e artistas brasileiros em uma maratona de criação de jogos. O evento oferece mentoria, palestras e espaço para networking, com premiações para os projetos mais criativos produzidos durante a competição.',
        developer: 'BJam Org',
        image: '/imagem-bgj.jpg',
        tags: ['GAME JAM', 'ONLINE'],
        score: 4.0,
        reviews: 96,
        platforms: ['website', 'pc']
    },
    {
        id: 5,
        title: 'Insperarte',
        description: 'Experimente projetos criativos da comunidade.',
        longDescription: 'Insperarte é uma mostra de projetos criativos que mistura jogos, arte digital e experiências interativas. Experimente instalações, protótipos e experimentos produzidos pela comunidade acadêmica e por convidados independentes.',
        developer: 'Coletivo Insper',
        image: '/imagem-insperarte.jpg',
        tags: ['AVENTURA', 'INDIE'],
        score: 4.2,
        reviews: 207,
        platforms: ['website', 'mobile']
    },
    {
        id: 6,
        title: 'Jundu Jam',
        description: 'Uma experiência colaborativa para criar jogos.',
        longDescription: 'Jundu Jam é uma experiência colaborativa para criar jogos em equipe com foco em pixel art. Os participantes recebem um tema, ferramentas e mentorias para transformar ideias em protótipos jogáveis em poucos dias.',
        developer: 'Jundu Studios',
        image: '/imagem-polvojam.jpg',
        tags: ['GAME JAM', 'PIXEL ART'],
        score: 3.9,
        reviews: 73,
        platforms: ['website']
    },
    {
        id: 7,
        title: 'Game Jam 2026',
        description: 'Desafios rápidos para testar suas ideias.',
        longDescription: 'Game Jam 2026 traz desafios rápidos para testar suas ideias em sessões curtas de criação. A cada rodada, um novo tema é revelado e os participantes têm tempo limitado para prototipar, votar e evoluir seus projetos.',
        developer: 'Huby Community',
        image: '/imagem-ggj.png',
        tags: ['GAME JAM', 'RÁPIDO'],
        score: 4.4,
        reviews: 181,
        platforms: ['website', 'pc']
    },
    {
        id: 8,
        title: 'BGJ 2026',
        description: 'Conheça jogos produzidos pela comunidade.',
        longDescription: 'A BGJ 2026 é a edição anual da Brasil Game Jam, com trilhas para iniciantes e veteranos. Conheça jogos produzidos pela comunidade, participe de workshops e acompanhe as premiações ao vivo.',
        developer: 'BJam Org',
        image: '/imagem-bgj.jpg',
        tags: ['INDIE', 'ONLINE'],
        score: 4.1,
        reviews: 55,
        platforms: ['website']
    },
    {
        id: 9,
        title: 'GMTK Game Jam',
        description: 'Projetos criativos feitos em tempo limitado.',
        longDescription: "A GMTK Game Jam é uma das maiores jams online do mundo, criada pelo canal Game Maker's Toolkit. Em 48 horas, milhares de participantes criam jogos a partir de um tema surpresa focado em design criativo e mecânicas inovadoras.",
        developer: 'GMTK Team',
        image: '/imagem-insperarte.jpg',
        tags: ['GAME JAM', 'CRIATIVO'],
        score: 4.6,
        reviews: 402,
        platforms: ['website', 'pc']
    },
    {
        id: 10,
        title: 'Polvo Jam II',
        description: 'Novos projetos e desafios para a comunidade.',
        longDescription: 'Polvo Jam II traz novos projetos e desafios para a comunidade, com temas mais ousados e mentorias ao vivo. Equipes novas e veteranas se encontram para criar, compartilhar e publicar experiências independentes.',
        developer: 'Estúdio Polvo',
        image: '/imagem-polvojam.jpg',
        tags: ['AVENTURA', 'INDIE'],
        score: 4.0,
        reviews: 81,
        platforms: ['website', 'mobile']
    },
    {
        id: 11,
        title: 'GGJ Brasil',
        description: 'Projetos independentes feitos por equipes.',
        longDescription: 'GGJ Brasil coordena as sedes brasileiras da Global Game Jam, conectando universidades, coletivos e estúdios independentes. Projetos feitos por equipes de todo o país são publicados e celebrados em uma vitrine nacional.',
        developer: 'GGJ Brasil',
        image: '/imagem-ggj.png',
        tags: ['COMUNIDADE', 'GAME JAM'],
        score: 4.3,
        reviews: 142,
        platforms: ['website']
    },
    {
        id: 12,
        title: 'Brasil Game Jam',
        description: 'Encontre novos jogos e desenvolvedores.',
        longDescription: 'Encontre novos jogos e desenvolvedores na Brasil Game Jam, uma comunidade aberta para quem quer criar, testar e publicar. Participe das edições, acompanhe devlogs e descubra talentos da cena independente brasileira.',
        developer: 'BJam Org',
        image: '/imagem-bgj.jpg',
        tags: ['INDIE', 'GAME JAM'],
        score: 3.8,
        reviews: 64,
        platforms: ['website', 'pc']
    }
]

const sections = [
    { title: 'GAME JAM 2026.03', items: games.slice(0, 6) },
    { title: 'JOGOS RELEVANTES', items: games.slice(2, 8) },
    { title: 'EM DESTAQUE', items: games.slice(1, 7) },
    { title: 'COMUNIDADES E EVENTOS', items: games.slice(4, 10) }
]

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

                <div className="game-card-rating">
                    <Stars score={game.score} />
                    <small>{game.score.toFixed(1)} ({game.reviews})</small>
                </div>

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

                    <span className="game-card-platforms">
                        {game.platforms.map((platform) => (
                            <span key={platform} title={platformLabels[platform]} aria-label={platformLabels[platform]}>
                                <PlatformIcon type={platform} />
                            </span>
                        ))}
                    </span>
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

function CarouselSection({ title, items, selectedId, onSelect }: {
    title: string
    items: Game[]
    selectedId: number | null
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
                <h2>{title}</h2>
                <span>{items.length} resultados</span>
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

export function Home() {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null)

    const closeDetails = useCallback(() => setSelectedGame(null), [])

    return (
        <main className={`home ${selectedGame ? 'has-details' : ''}`}>

            <Banner />

            <section className="home-catalog">

                <div className="home-toolbar">
                    <BarraDePesquisa />
                </div>

                {sections.map((section) => (
                    <CarouselSection
                        key={section.title}
                        title={section.title}
                        items={section.items}
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