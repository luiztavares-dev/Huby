import './Home.css'

import { useEffect, useRef, useState } from 'react'

import Banner from '../../components/banner/Banner'
import BarraDePesquisa from '../../components/searchBar/SearchBar'
import categoriasData from '../../data/DadosCategorias.json'

type Game = {
    id: number
    title: string
    description: string
    image: string
    tags: string[]
    rating: string
    reviews: string
    plataforms?: ('website' | 'mobile' | 'pc')[]
}

type CategoriaMap = Record<string, {
    Descricao: string
    SubCategorias?: Array<{ Titulo: string; Descricao: string }>
}>

const categoriaMap = categoriasData as CategoriaMap

const normalizarCategoria = (valor: string) => {
    return valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
}

const getCategoriaInfo = (tag: string) => {
    const tagNormalizada = normalizarCategoria(tag)

    const categoriaEncontrada = Object.entries(categoriaMap).find(([categoria]) => {
        return normalizarCategoria(categoria) === tagNormalizada
    })

    if (!categoriaEncontrada) {
        return { Descricao: 'Categoria do jogo.' }
    }

    return categoriaEncontrada[1]
}

const games: Game[] = [
    {
        id: 1,
        title: 'Hollow Knight Silksong',
        description: 'Jogo de ação e aventura no estilo Metroidvania.',
        image: '/Silksong.png',
        tags: ['AVENTURA', 'METROIDVANIA'],
        rating: '★ ★ ★ ★ ★',
        reviews: '4,0 [582]',
        plataforms: ['pc']
    },
    {
        id: 2,
        title: 'Polvo Jam',
        description: 'Uma game jam para experimentar novas ideias.',
        image: '/imagem-polvojam.jpg',
        tags: ['AVENTURA', 'INDIE'],
        rating: '★ ★ ★ ★ ☆',
        reviews: '4,0 [124]'
    },
    {
        id: 3,
        title: 'Global Game Jam',
        description: 'Crie, compartilhe e participe de projetos.',
        image: '/imagem-ggj.png',
        tags: ['GAME JAM', 'COMUNIDADE'],
        rating: '★ ★ ★ ★ ★',
        reviews: '4,5 [318]'
    },
    {
        id: 4,
        title: 'Brasil Game Jam',
        description: 'Evento para desenvolvedores e artistas.',
        image: '/imagem-bgj.jpg',
        tags: ['GAME JAM', 'ONLINE'],
        rating: '★ ★ ★ ★ ☆',
        reviews: '4,0 [96]'
    },
    {
        id: 5,
        title: 'Insperarte',
        description: 'Experimente projetos criativos da comunidade.',
        image: '/imagem-insperarte.jpg',
        tags: ['AVENTURA', 'INDIE'],
        rating: '★ ★ ★ ★ ★',
        reviews: '4,2 [207]'
    },
    {
        id: 6,
        title: 'Jundu Jam',
        description: 'Uma experiência colaborativa para criar jogos.',
        image: '/imagem-polvojam.jpg',
        tags: ['GAME JAM', 'PIXEL ART'],
        rating: '★ ★ ★ ★ ☆',
        reviews: '3,9 [73]'
    },
    {
        id: 7,
        title: 'Game Jam 2026',
        description: 'Desafios rápidos para testar suas ideias.',
        image: '/imagem-ggj.png',
        tags: ['GAME JAM', 'RÁPIDO'],
        rating: '★ ★ ★ ★ ★',
        reviews: '4,4 [181]'
    },
    {
        id: 8,
        title: 'BGJ 2026',
        description: 'Conheça jogos produzidos pela comunidade.',
        image: '/imagem-bgj.jpg',
        tags: ['INDIE', 'ONLINE'],
        rating: '★ ★ ★ ★ ☆',
        reviews: '4,1 [55]'
    },
    {
        id: 9,
        title: 'GMTK Game Jam',
        description: 'Projetos criativos feitos em tempo limitado.',
        image: '/imagem-insperarte.jpg',
        tags: ['GAME JAM', 'CRIATIVO'],
        rating: '★ ★ ★ ★ ★',
        reviews: '4,6 [402]'
    },
    {
        id: 10,
        title: 'Polvo Jam II',
        description: 'Novos projetos e desafios para a comunidade.',
        image: '/imagem-polvojam.jpg',
        tags: ['AVENTURA', 'INDIE'],
        rating: '★ ★ ★ ★ ☆',
        reviews: '4,0 [81]'
    },
    {
        id: 11,
        title: 'GGJ Brasil',
        description: 'Projetos independentes feitos por equipes.',
        image: '/imagem-ggj.png',
        tags: ['COMUNIDADE', 'GAME JAM'],
        rating: '★ ★ ★ ★ ★',
        reviews: '4,3 [142]'
    },
    {
        id: 12,
        title: 'Brasil Game Jam',
        description: 'Encontre novos jogos e desenvolvedores.',
        image: '/imagem-bgj.jpg',
        tags: ['INDIE', 'GAME JAM'],
        rating: '★ ★ ★ ★ ☆',
        reviews: '3,8 [64]'
    }
]

const sections = [
    { title: 'GAME JAM 2026.03', items: games.slice(0, 6) },
    { title: 'JOGOS RELEVANTES', items: games.slice(2, 8) },
    { title: 'EM DESTAQUE', items: games.slice(1, 7) },
    { title: 'COMUNIDADES E EVENTOS', items: games.slice(4, 10) }
]

function CarouselSection({ title, items }: { title: string; items: Game[] }) {
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
        const handleResize = () => updateScrollState()

        track.addEventListener('scroll', handleScroll)
        window.addEventListener('resize', handleResize)

        return () => {
            track.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', handleResize)
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
                        <article className="game-card" key={game.id}>
                            <div className="game-card-image">
                                <img src={game.image} alt={game.title} />
                                <button
                                    type="button"
                                    className="game-card-more"
                                    aria-label={`Mais opções para ${game.title}`}
                                >
                                    •••
                                </button>
                            </div>

                            <div className="game-card-body">
                                <h3>{game.title}</h3>
                                <p>{game.description}</p>

                                <div className="game-card-rating">
                                    <span>{game.rating}</span>
                                    <small>{game.reviews}</small>
                                </div>

                                <div className="game-card-tags">
                                    {game.tags.map((tag) => {
                                        const categoria = getCategoriaInfo(tag)

                                        return (
                                            <span
                                                key={`${game.id}-${tag}`}
                                                className="game-card-tag"
                                                title={categoria.Descricao}
                                                data-tooltip={categoria.Descricao}
                                            >
                                                {tag}
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        </article>
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
    return (
        <main className="home">

            <Banner />

            <section className="home-catalog">

                <BarraDePesquisa />

                {sections.map((section) => (
                    <CarouselSection
                        key={section.title}
                        title={section.title}
                        items={section.items}
                    />
                ))}

            </section>

        </main>
    )
}