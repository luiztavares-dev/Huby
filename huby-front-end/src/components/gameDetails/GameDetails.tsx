import { useEffect, useRef, useState } from 'react'
import './GameDetails.css'

export type Game = {
    id: number
    title: string
    description: string
    longDescription: string
    developer: string
    image: string
    tags: string[]
    score: number
    reviews: number
    platforms: ('website' | 'mobile' | 'pc')[]
}

type DownloadPlatform = 'windows' | 'linux' | 'macos' | 'android'
type DownloadState = 'idle' | 'downloading' | 'done'
type PlayState = 'idle' | 'launching' | 'running'

const downloadLabels: Record<DownloadPlatform, string> = {
    windows: 'Windows',
    linux: 'Linux',
    macos: 'MacOS',
    android: 'Android'
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
    const timers = useRef<number[]>([])
    const closeRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
        if (game) {
            setLastGame(game)
            setDownloads({})
            setLastDownload(null)
            setPlayState('idle')
            timers.current.forEach(clearTimeout)
            timers.current = []
        }
    }, [game])

    useEffect(() => {
        return () => timers.current.forEach(clearTimeout)
    }, [])

    useEffect(() => {
        if (!isOpen) return

        closeRef.current?.focus()

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    const current = game ?? lastGame
    if (!current) return null

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

    return (
        <>
            <div
                className={`game-details-overlay ${isOpen ? 'is-open' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />

            <aside className={`game-details ${isOpen ? 'is-open' : ''}`} aria-label={`Detalhes de ${current.title}`}>
                <div className="game-details-cover">
                    <img src={current.image} alt={current.title} />
                    <button
                        ref={closeRef}
                        type="button"
                        className="game-details-close"
                        onClick={onClose}
                        aria-label="Fechar detalhes"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                <div className="game-details-header">
                    <h2 className="game-details-title">{current.title}</h2>
                    <div className="game-details-tags">
                        {current.tags.map((tag) => (
                            <span key={tag} className="game-details-tag">{tag}</span>
                        ))}
                    </div>
                </div>

                <div className="game-details-body">
                    <div className="game-details-developer">
                        <img src="/icon-perfil.png" alt="" className="game-details-developer-avatar" />
                        <span className="game-details-developer-name">{current.developer}</span>
                    </div>

                    <section className="game-details-section">
                        <h3>Descrição</h3>
                        <p className="game-details-description">{current.longDescription}</p>
                    </section>

                    <section className="game-details-section">
                        <h3>Downloads</h3>
                        <div className="game-details-downloads">
                            {(Object.keys(downloadLabels) as DownloadPlatform[]).map((platform) => {
                                const state = downloads[platform] ?? 'idle'
                                const available = isAvailable(platform)

                                return (
                                    <button
                                        key={platform}
                                        type="button"
                                        className={`game-details-download-btn ${state === 'done' ? 'is-done' : ''}`}
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

                    <section className="game-details-section">
                        <h3>Jogar no Browser</h3>
                        <button
                            type="button"
                            className={`game-details-play-btn ${playState === 'running' ? 'is-running' : ''}`}
                            disabled={!current.platforms.includes('website')}
                            onClick={togglePlay}
                        >
                            {playState === 'launching' ? (
                                <span className="game-details-spinner game-details-spinner-light" aria-hidden="true" />
                            ) : playState === 'running' ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M7 7h10v10H7z" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M8 5.5v13l11-6.5z" />
                                </svg>
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
                </div>
            </aside>
        </>
    )
}