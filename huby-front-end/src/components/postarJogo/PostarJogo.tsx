import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { linkJogoValido, publicarJogo } from '../../services/home'
import type { ConteudoApi, MidiaJogoApi, PlataformaJogoApi } from '../../services/home'
import { enviarMidiaParaCloudinary } from '../../services/uploads'
import { RecortarMidia } from '../midia/RecortarMidia'
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

type MidiaRascunho = MidiaJogoApi & {
    id: string
    enviando: boolean
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
    const [midias, setMidias] = useState<MidiaRascunho[]>([])
    const [arquivoImagem, setArquivoImagem] = useState<File | null>(null)
    const [indiceCapa, setIndiceCapa] = useState(0)
    const [ordemMidias, setOrdemMidias] = useState<string[]>([])
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const fecharRef = useRef<HTMLButtonElement | null>(null)
    const inputImagemRef = useRef<HTMLInputElement | null>(null)
    const inputVideoRef = useRef<HTMLInputElement | null>(null)
    const revogadasRef = useRef(new Set<string>())

    const revogarUrlLocal = (url: string) => {
        if (!url.startsWith('blob:') || revogadasRef.current.has(url)) return
        revogadasRef.current.add(url)
        URL.revokeObjectURL(url)
    }

    useEffect(() => {
        if (isOpen) return
        setMidias([])
        setArquivoImagem(null)
        setIndiceCapa(0)
        setOrdemMidias([])
    }, [isOpen])

    const capa = midias.find((midia) => (
        midia.id === ordemMidias[indiceCapa] && midia.tipo === 'image' && !midia.enviando
    ))?.url ?? ''
    const enviandoMidia = midias.some((midia) => midia.enviando)
    const midiasOrdenadas = ordemMidias
        .map((id) => midias.find((midia) => midia.id === id))
        .filter((midia): midia is MidiaRascunho => Boolean(midia))
    const bloqueado = enviando || enviandoMidia || Boolean(arquivoImagem)

    const limpar = useCallback(() => {
        setFormulario(novoFormulario(desenvolvedor))
        setMidias((atuais) => {
            atuais.filter((midia) => midia.url.startsWith('blob:')).forEach((midia) => revogarUrlLocal(midia.url))
            return []
        })
        setArquivoImagem(null)
        setIndiceCapa(0)
        setOrdemMidias([])
        setErro(null)
    }, [desenvolvedor])

    const fechar = useCallback(() => {
        if (enviando || enviandoMidia || arquivoImagem) return
        limpar()
        onClose()
    }, [enviando, enviandoMidia, arquivoImagem, limpar, onClose])

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

    const concluirMidia = (id: string, url: string) => {
        setMidias((atuais) => atuais.map((midia) => {
            if (midia.id !== id) return midia
            if (midia.url.startsWith('blob:')) revogarUrlLocal(midia.url)
            return { ...midia, url, enviando: false }
        }))
        setErro(null)
    }

    const falharMidia = (id: string, mensagem: string) => {
        setMidias((atuais) => {
            const falhou = atuais.find((midia) => midia.id === id)
            if (falhou?.url.startsWith('blob:')) revogarUrlLocal(falhou.url)
            return atuais.filter((midia) => midia.id !== id)
        })
        setOrdemMidias((atuais) => atuais.filter((item) => item !== id))
        setIndiceCapa((atual) => Math.max(0, Math.min(atual, midias.length - 2)))
        setErro(mensagem)
    }

    const enviarMidia = async (midia: MidiaRascunho, arquivo: Blob) => {
        try {
            const url = await enviarMidiaParaCloudinary(arquivo, 'huby/jogos/midias', midia.tipo)
            concluirMidia(midia.id, url)
        } catch (error) {
            falharMidia(midia.id, error instanceof Error ? error.message : 'Não foi possível enviar a mídia.')
        }
    }

    const selecionarImagem = async (event: ChangeEvent<HTMLInputElement>) => {
        const arquivo = event.target.files?.[0]
        event.target.value = ''
        if (!arquivo) return
        if (!arquivo.type.startsWith('image/')) {
            setErro('Escolha um arquivo de imagem válido.')
            return
        }

        setArquivoImagem(arquivo)
    }

    const selecionarVideo = (event: ChangeEvent<HTMLInputElement>) => {
        const arquivo = event.target.files?.[0]
        event.target.value = ''
        if (!arquivo) return
        if (!arquivo.type.startsWith('video/')) {
            setErro('Escolha um arquivo de vídeo válido.')
            return
        }

        const midia: MidiaRascunho = {
            id: `video-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            tipo: 'video',
            url: URL.createObjectURL(arquivo),
            enviando: true
        }
        setMidias((atuais) => [...atuais, midia])
        setOrdemMidias((atuais) => [...atuais, midia.id])
        setErro(null)
        void enviarMidia(midia, arquivo)
    }

    const removerMidia = (id: string) => {
        const removida = midias.find((midia) => midia.id === id)
        if (!removida || removida.enviando) return

        const proximaOrdem = ordemMidias.filter((item) => item !== id)
        const proximasMidias = proximaOrdem
            .map((item) => midias.find((midia) => midia.id === item))
            .filter((midia): midia is MidiaRascunho => Boolean(midia))
        const capaAtual = midias.find((midia) => midia.id === ordemMidias[indiceCapa])
        const indiceCapaAtual = midias.findIndex((midia) => midia.id === capaAtual?.id)

        if (capaAtual?.id === id) {
            const proximaCapa = proximasMidias.findIndex((midia) => midia.tipo === 'image')
            setIndiceCapa(proximaCapa)
        } else if (indiceCapaAtual >= 0 && indiceCapaAtual > midias.findIndex((midia) => midia.id === id)) {
            setIndiceCapa((atual) => Math.max(0, atual - 1))
        }

        setMidias((atuais) => atuais.filter((midia) => midia.id !== id))
        if (removida.url.startsWith('blob:')) revogarUrlLocal(removida.url)
        setOrdemMidias(proximaOrdem)
    }

    const escolherCapa = (indice: number) => {
        if (midiasOrdenadas[indice]?.tipo === 'image' && !midiasOrdenadas[indice].enviando) {
            setIndiceCapa(indice)
        }
    }

    const publicar = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (bloqueado) return

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
        if (!capa) {
            setErro('Adicione pelo menos uma imagem para usar como capa do jogo.')
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
                imagem: capa,
                midias: midiasOrdenadas.map(({ tipo, url }) => ({ tipo, url })),
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
                <div className="game-details-capa postar-jogo-capa">
                    {capa ? (
                        <img src={capa} alt="Prévia da capa do jogo" />
                    ) : (
                        <span className="postar-jogo-capa-vazia">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="16" rx="2" />
                                <circle cx="8.5" cy="9" r="1.5" />
                                <path d="M4 17l5-5 4 4 3-3 4 4" />
                            </svg>
                            <strong>Adicionar mídia do jogo</strong>
                            <small>Selecione imagens ou vídeos</small>
                        </span>
                    )}
                </div>

                <div className="game-details-faixa">
                    <h2 id="postar-jogo-titulo">Postar jogo</h2>
                    <p>Compartilhe seu projeto com a comunidade da HUBY.</p>
                </div>

                <form className="game-details-corpo postar-jogo-form" onSubmit={publicar}>
                    <section className="postar-jogo-secao">
                        <h3>Imagens e vídeos</h3>
                        <p className="postar-jogo-dica">
                            Adicione a galeria exibida na sessão do jogo. A primeira imagem será usada como capa.
                        </p>

                        <div className="postar-jogo-galeria" aria-label="Mídias do jogo">
                            {midiasOrdenadas.map((midia, indice) => (
                                <div className={`postar-jogo-midia ${midia.url === capa ? 'is-capa' : ''}`} key={midia.id}>
                                    <button
                                        type="button"
                                        className="postar-jogo-midia-preview"
                                        onClick={() => midia.tipo === 'image' && escolherCapa(indice)}
                                        aria-label={midia.tipo === 'video' ? `Vídeo ${indice + 1}` : `Definir imagem ${indice + 1} como capa`}
                                        disabled={bloqueado || midia.enviando || midia.tipo === 'video'}
                                    >
                                        {midia.tipo === 'video' ? (
                                            <video src={midia.url || undefined} muted playsInline preload="metadata" />
                                        ) : midia.enviando ? (
                                            <span className="postar-jogo-midia-placeholder" aria-hidden="true" />
                                        ) : (
                                            <img src={midia.url} alt={`Imagem ${indice + 1} do jogo`} />
                                        )}
                                        {midia.tipo === 'video' && <span className="postar-jogo-midia-video">Vídeo</span>}
                                        {midia.tipo === 'image' && !midia.enviando && midia.url === capa && <span className="postar-jogo-midia-capa">Capa</span>}
                                    </button>
                                    <button
                                        type="button"
                                        className="postar-jogo-midia-remover"
                                        onClick={() => removerMidia(midia.id)}
                                        aria-label={`Remover ${midia.tipo === 'video' ? 'vídeo' : 'imagem'} ${indice + 1}`}
                                        disabled={bloqueado}
                                    >
                                        ×
                                    </button>
                                    {midia.enviando && <span className="postar-jogo-midia-enviando">Enviando…</span>}
                                </div>
                            ))}

                            <button
                                type="button"
                                className="postar-jogo-adicionar-midia"
                                onClick={() => inputImagemRef.current?.click()}
                                disabled={bloqueado}
                            >
                                <span aria-hidden="true">+</span>
                                Adicionar imagem
                            </button>
                            <button
                                type="button"
                                className="postar-jogo-adicionar-midia"
                                onClick={() => inputVideoRef.current?.click()}
                                disabled={bloqueado}
                            >
                                <span aria-hidden="true">+</span>
                                Adicionar vídeo
                            </button>
                        </div>

                        <input ref={inputImagemRef} className="postar-jogo-input-oculto" type="file" accept="image/*" onChange={selecionarImagem} />
                        <input ref={inputVideoRef} className="postar-jogo-input-oculto" type="file" accept="video/*" onChange={selecionarVideo} />
                    </section>

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
                        <button type="button" onClick={fechar} disabled={bloqueado}>Cancelar</button>
                        <button type="submit" disabled={bloqueado}>
                            {enviando ? 'Publicando…' : 'Publicar jogo'}
                        </button>
                    </div>
                </form>
            </aside>

            {arquivoImagem && (
                <RecortarMidia
                    arquivo={arquivoImagem}
                    onCancelar={() => setArquivoImagem(null)}
                    onConfirmar={async (imagem) => {
                        const midia: MidiaRascunho = {
                            id: `image-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            tipo: 'image',
                            url: 'huby/jogos/midias',
                            enviando: true
                        }
                        const primeiraImagem = !ordemMidias.some((id) => midias.find((midia) => midia.id === id)?.tipo === 'image')
                        setMidias((atuais) => [...atuais, midia])
                        setOrdemMidias((atuais) => {
                            if (primeiraImagem) setIndiceCapa(atuais.length)
                            return [...atuais, midia.id]
                        })
                        setArquivoImagem(null)
                        setErro(null)

                        enviarMidia(midia, imagem)
                    }}
                />
            )}
        </>
    )
}
