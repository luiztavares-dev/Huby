import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { linkJogoValido, publicarJogo } from '../../services/home'
import type { ConteudoApi, PlataformaJogoApi } from '../../services/home'
import { enviarImagemParaCloudinary } from '../../services/uploads'
import './PostarJogo.css'

type PostarJogoProps = {
    isOpen: boolean
    onClose: () => void
    usuarioId: string
    desenvolvedor: string
    onPublished: (jogo: ConteudoApi) => void
}

type Formulario = {
    titulo: string
    desenvolvedor: string
    descricao: string
    descricaoLonga: string
    linkUrl: string
    tags: string
    preco: string
    plataformas: PlataformaJogoApi[]
}

const opcoesPlataforma: Array<{ valor: PlataformaJogoApi; titulo: string; descricao: string }> = [
    { valor: 'pc', titulo: 'PC', descricao: 'Computador' },
    { valor: 'website', titulo: 'Navegador', descricao: 'Jogar na web' },
    { valor: 'mobile', titulo: 'Celular', descricao: 'Android ou iOS' }
]

const novoFormulario = (desenvolvedor: string): Formulario => ({
    titulo: '',
    desenvolvedor,
    descricao: '',
    descricaoLonga: '',
    linkUrl: '',
    tags: '',
    preco: '0',
    plataformas: []
})

export function PostarJogo({ isOpen, onClose, usuarioId, desenvolvedor, onPublished }: PostarJogoProps) {
    const [formulario, setFormulario] = useState<Formulario>(() => novoFormulario(desenvolvedor))
    const [capa, setCapa] = useState('')
    const [enviandoImagem, setEnviandoImagem] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const fecharRef = useRef<HTMLButtonElement | null>(null)

    const limpar = useCallback(() => {
        setFormulario(novoFormulario(desenvolvedor))
        setCapa('')
        setErro(null)
    }, [desenvolvedor])

    const fechar = useCallback(() => {
        if (enviando || enviandoImagem) return
        limpar()
        onClose()
    }, [enviando, enviandoImagem, limpar, onClose])

    useEffect(() => {
        if (!isOpen) return

        fecharRef.current?.focus()
        const aoTeclar = (event: KeyboardEvent) => {
            if (event.key === 'Escape') fechar()
        }

        window.addEventListener('keydown', aoTeclar)
        return () => window.removeEventListener('keydown', aoTeclar)
    }, [fechar, isOpen])

    const atualizarCampo = (campo: keyof Omit<Formulario, 'plataformas'>, valor: string) => {
        setFormulario((atual) => ({ ...atual, [campo]: valor }))
    }

    const alternarPlataforma = (plataforma: PlataformaJogoApi) => {
        setFormulario((atual) => ({
            ...atual,
            plataformas: atual.plataformas.includes(plataforma)
                ? atual.plataformas.filter((item) => item !== plataforma)
                : [...atual.plataformas, plataforma]
        }))
    }

    const selecionarCapa = async (event: ChangeEvent<HTMLInputElement>) => {
        const arquivo = event.target.files?.[0]
        event.target.value = ''
        if (!arquivo) return
        if (!arquivo.type.startsWith('image/')) {
            setErro('Escolha um arquivo de imagem válido.')
            return
        }

        setEnviandoImagem(true)
        setErro(null)
        try {
            const url = await enviarImagemParaCloudinary(arquivo, 'huby/jogos/capas')
            setCapa(url)
        } catch (error) {
            setErro(error instanceof Error ? error.message : 'Não foi possível enviar a capa.')
        } finally {
            setEnviandoImagem(false)
        }
    }

    const publicar = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (enviando || enviandoImagem) return

        const titulo = formulario.titulo.trim()
        const descricao = formulario.descricao.trim()
        const linkUrl = linkJogoValido(formulario.linkUrl)
        const preco = Number(formulario.preco)

        if (titulo.length < 3) {
            setErro('Informe um nome com pelo menos 3 caracteres.')
            return
        }
        if (descricao.length < 10) {
            setErro('A descrição deve ter pelo menos 10 caracteres.')
            return
        }
        if (!linkUrl) {
            setErro('Informe um link HTTP ou HTTPS válido.')
            return
        }
        if (formulario.plataformas.length === 0) {
            setErro('Selecione pelo menos uma plataforma.')
            return
        }
        if (!Number.isFinite(preco) || preco < 0) {
            setErro('Informe um preço válido.')
            return
        }

        setEnviando(true)
        setErro(null)
        try {
            const jogo = await publicarJogo({
                criadorId: usuarioId,
                titulo,
                descricao,
                descricaoLonga: formulario.descricaoLonga.trim() || descricao,
                desenvolvedor: formulario.desenvolvedor.trim(),
                imagem: capa || undefined,
                linkUrl,
                tags: formulario.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
                plataformas: formulario.plataformas,
                preco
            })
            limpar()
            onPublished(jogo)
            onClose()
        } catch (error) {
            setErro(error instanceof Error ? error.message : 'Não foi possível publicar o jogo.')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <>
            <button
                type="button"
                className={`game-details-overlay postar-jogo-overlay ${isOpen ? 'is-open' : ''}`}
                onClick={fechar}
                aria-label="Fechar postagem de jogo"
                aria-hidden={!isOpen}
                tabIndex={isOpen ? 0 : -1}
            />

            <button
                ref={fecharRef}
                type="button"
                className={`game-details-voltar ${isOpen ? 'is-open' : ''}`}
                onClick={fechar}
                aria-label="Voltar para a Home"
                tabIndex={isOpen ? 0 : -1}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" />
                </svg>
            </button>

            <aside
                className={`game-details postar-jogo ${isOpen ? 'is-open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-hidden={!isOpen}
                aria-labelledby="postar-jogo-titulo"
            >
                <label className={`game-details-capa postar-jogo-capa ${enviandoImagem ? 'is-enviando' : ''}`}>
                    <input type="file" accept="image/*" onChange={selecionarCapa} disabled={enviando || enviandoImagem} />
                    {capa ? (
                        <img src={capa} alt="Prévia da capa do jogo" />
                    ) : (
                        <span className="postar-jogo-capa-vazia">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="16" rx="2" />
                                <circle cx="8.5" cy="9" r="1.5" />
                                <path d="M4 17l5-5 4 4 3-3 4 4" />
                            </svg>
                            <strong>{enviandoImagem ? 'Enviando capa…' : 'Adicionar capa'}</strong>
                            <small>Selecione uma imagem do seu jogo</small>
                        </span>
                    )}
                    {capa && !enviandoImagem && <span className="postar-jogo-trocar-capa">Trocar capa</span>}
                </label>

                <div className="game-details-faixa">
                    <h2 id="postar-jogo-titulo">Postar jogo</h2>
                    <p>Compartilhe seu projeto com a comunidade da HUBY.</p>
                </div>

                <form className="game-details-corpo postar-jogo-form" onSubmit={publicar}>
                    <section className="postar-jogo-secao">
                        <h3>Informações principais</h3>
                        <label htmlFor="postar-jogo-nome">Nome do jogo</label>
                        <input
                            id="postar-jogo-nome"
                            value={formulario.titulo}
                            onChange={(event) => atualizarCampo('titulo', event.target.value)}
                            placeholder="Como seu jogo se chama?"
                            maxLength={100}
                            required
                            disabled={enviando}
                        />

                        <label htmlFor="postar-jogo-desenvolvedor">Desenvolvedor ou estúdio</label>
                        <input
                            id="postar-jogo-desenvolvedor"
                            value={formulario.desenvolvedor}
                            onChange={(event) => atualizarCampo('desenvolvedor', event.target.value)}
                            placeholder="Seu nome ou estúdio"
                            maxLength={100}
                            disabled={enviando}
                        />

                        <label htmlFor="postar-jogo-descricao">Descrição curta</label>
                        <textarea
                            id="postar-jogo-descricao"
                            value={formulario.descricao}
                            onChange={(event) => atualizarCampo('descricao', event.target.value)}
                            placeholder="Resuma a experiência em poucas palavras."
                            maxLength={240}
                            required
                            disabled={enviando}
                        />

                        <label htmlFor="postar-jogo-descricao-longa">Sobre o jogo <span>(opcional)</span></label>
                        <textarea
                            id="postar-jogo-descricao-longa"
                            value={formulario.descricaoLonga}
                            onChange={(event) => atualizarCampo('descricaoLonga', event.target.value)}
                            placeholder="Conte a história, a mecânica e o que torna seu jogo especial."
                            maxLength={2000}
                            disabled={enviando}
                        />
                    </section>

                    <section className="postar-jogo-secao">
                        <h3>Onde jogar</h3>
                        <label htmlFor="postar-jogo-link">Link para jogar ou baixar</label>
                        <input
                            id="postar-jogo-link"
                            type="url"
                            value={formulario.linkUrl}
                            onChange={(event) => atualizarCampo('linkUrl', event.target.value)}
                            placeholder="https://"
                            required
                            disabled={enviando}
                        />

                        <span className="postar-jogo-label">Plataformas</span>
                        <div className="postar-jogo-plataformas">
                            {opcoesPlataforma.map((plataforma) => (
                                <button
                                    key={plataforma.valor}
                                    type="button"
                                    className={formulario.plataformas.includes(plataforma.valor) ? 'is-selecionada' : ''}
                                    aria-pressed={formulario.plataformas.includes(plataforma.valor)}
                                    onClick={() => alternarPlataforma(plataforma.valor)}
                                    disabled={enviando}
                                >
                                    <strong>{plataforma.titulo}</strong>
                                    <small>{plataforma.descricao}</small>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="postar-jogo-secao">
                        <h3>Preço e categorias</h3>
                        <label htmlFor="postar-jogo-preco">Preço em reais</label>
                        <div className="postar-jogo-preco">
                            <span>R$</span>
                            <input
                                id="postar-jogo-preco"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formulario.preco}
                                onChange={(event) => atualizarCampo('preco', event.target.value)}
                                required
                                disabled={enviando}
                            />
                        </div>
                        <small className="postar-jogo-dica">Use 0 para publicar um jogo gratuito.</small>

                        <label htmlFor="postar-jogo-tags">Categorias</label>
                        <input
                            id="postar-jogo-tags"
                            value={formulario.tags}
                            onChange={(event) => atualizarCampo('tags', event.target.value)}
                            placeholder="Ação, Puzzle, Indie"
                            disabled={enviando}
                        />
                        <small className="postar-jogo-dica">Separe as categorias por vírgula. Até 8 itens.</small>
                    </section>

                    {erro && <p className="postar-jogo-erro" role="alert">{erro}</p>}

                    <div className="postar-jogo-acoes">
                        <button type="button" onClick={fechar} disabled={enviando || enviandoImagem}>Cancelar</button>
                        <button type="submit" disabled={enviando || enviandoImagem}>
                            {enviando ? 'Publicando…' : 'Publicar jogo'}
                        </button>
                    </div>
                </form>
            </aside>
        </>
    )
}
