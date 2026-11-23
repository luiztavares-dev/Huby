import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import {
    aceitarPedido,
    alterarCargo,
    apagarPublicacao,
    banirMembro,
    buscarComunidades,
    buscarComunidadesDoUsuario,
    cancelarPedido,
    editarPublicacao,
    excluirComunidade,
    publicar,
    recusarPedido,
    sairDaComunidade,
    salvarConfiguracoes,
    solicitarEntrada,
    type CargoApi,
    type ComunidadeApi,
    type IntegranteComunidadeApi,
    type SolicitacaoComunidadeApi
} from '../../services/comunidades'
import { usuarioLogado } from '../../services/sessao'
import { cloudinaryConfigurado, enviarImagemParaCloudinary } from '../../services/uploads'
import type { ComentarioApi } from '../../types/conteudo'
import './Comunidades.css'

const LIMITE_LISTA = 3
const NOME_MIN = 3
const NOME_MAX = 50
const TEXTO_MAX = 800

type Painel = 'busca' | 'dados'
type ConfirmacaoTipo = 'excluir' | 'sair' | 'banir' | 'publicacao'

type Confirmacao = {
    tipo: ConfirmacaoTipo
    alvoId?: string
}

const ROTULO_CARGO: Record<CargoApi, string> = {
    DONO: 'Dono',
    ADMIN: 'Admin',
    MEMBRO: 'Membro'
}

function membroDeHandle(handle: string | undefined, membros: IntegranteComunidadeApi[]) {
    if (!handle) return null

    const alvo = handle.replace(/^@+/, '').toLowerCase()

    return membros.find((membro) => membro.nomeUsuario.toLowerCase() === alvo) ?? null
}

function cargoDeHandle(handle: string | undefined, membros: IntegranteComunidadeApi[]) {
    return membroDeHandle(handle, membros)?.cargo ?? null
}

/** Mesmo critério do backend: o handle da publicação vale pelo nome atual ou pelo nome gravado no membro. */
function autoriaDe(
    handle: string | undefined,
    membros: IntegranteComunidadeApi[],
    euId: string,
    euUsername: string
) {
    const alvo = (handle ?? '').replace(/^@+/, '').toLowerCase()
    if (!alvo) return false

    if (euUsername && alvo === euUsername.toLowerCase()) return true

    const membro = membroDeHandle(handle, membros)

    return Boolean(euId && membro && membro.usuarioId === euId)
}

function dataCurta(iso?: string | null) {
    if (!iso) return ''

    const [ano, mes, dia] = iso.split('-')
    if (!ano || !mes || !dia) return iso

    return `${dia}/${mes}/${ano}`
}

function resumo(texto: string, maximo = 90) {
    return texto.length > maximo ? `${texto.slice(0, maximo)}…` : texto
}

function Avatar({ src, nome, classe }: { src?: string | null; nome: string; classe: string }) {
    return (
        <img
            className={classe}
            src={src || '/icon-perfil.png'}
            alt={nome}
            onError={(event) => {
                event.currentTarget.src = '/icon-perfil.png'
            }}
        />
    )
}

function EtiquetaCargo({ cargo }: { cargo: CargoApi }) {
    if (cargo === 'MEMBRO') return null

    return <span className={`comunidades-cargo comunidades-cargo-${cargo.toLowerCase()}`}>{ROTULO_CARGO[cargo]}</span>
}

function IconeBusca() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M15.5 15.5L21 21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    )
}

function IconeCheck() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function IconeFechar() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function IconeVoltar() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    )
}

function IconeForum() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M3 6h13v8H8l-5 4V6zM8 18h11a2 2 0 0 0 2-2v-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    )
}

function IconeLixeira() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function Publicacao({
    post,
    respondendo,
    membros,
    respondendoAId,
    ocupado,
    euId,
    euUsername,
    podeGerir,
    onResponder,
    onEditar,
    onApagar
}: {
    post: ComentarioApi
    respondendo?: string
    membros: IntegranteComunidadeApi[]
    respondendoAId: string | null
    ocupado: boolean
    euId: string
    euUsername: string
    podeGerir: boolean
    onResponder: (post: ComentarioApi) => void
    onEditar: (post: ComentarioApi, texto: string) => Promise<boolean>
    onApagar: (post: ComentarioApi) => void
}) {
    const cargo = cargoDeHandle(post.handle, membros)
    const mostrandoResponder = respondendoAId === post.id
    const ehAutor = autoriaDe(post.handle, membros, euId, euUsername)

    const campoRef = useRef<HTMLTextAreaElement>(null)
    const [rascunho, setRascunho] = useState<string | null>(null)
    const emEdicao = rascunho !== null

    useEffect(() => {
        if (emEdicao) campoRef.current?.focus()
    }, [emEdicao])

    const salvar = async () => {
        const texto = (rascunho ?? '').trim()
        if (!texto) return

        if (await onEditar(post, texto)) setRascunho(null)
    }

    const acoesExtras = (
        <>
            {ehAutor && !emEdicao && (
                <button type="button" onClick={() => setRascunho(post.texto)} disabled={ocupado}>
                    Editar
                </button>
            )}
            {(ehAutor || podeGerir) && !emEdicao && (
                <button
                    type="button"
                    className="is-perigo"
                    onClick={() => onApagar(post)}
                    disabled={ocupado}
                >
                    Apagar
                </button>
            )}
        </>
    )

    return (
        <article className={`comunidades-post${respondendo ? ' comunidades-post-resposta' : ''}`}>
            <Avatar classe="comunidades-post-avatar" src={post.avatar} nome={post.autor} />

            <div className="comunidades-post-corpo">
                <div className="comunidades-post-topo">
                    <h3>{post.autor}</h3>
                    {cargo && <EtiquetaCargo cargo={cargo} />}
                    <span className="comunidades-post-data">{dataCurta(post.criadoEm)}</span>
                </div>

                {respondendo && (
                    <p className="comunidades-post-respondendo">
                        <span>Respondendo: </span>
                        {respondendo}
                    </p>
                )}

                {emEdicao ? (
                    <div className="comunidades-post-edicao">
                        <textarea
                            ref={campoRef}
                            className="comunidades-post-edicao-campo"
                            rows={3}
                            value={rascunho}
                            maxLength={TEXTO_MAX}
                            disabled={ocupado}
                            aria-label={`Editar publicação de ${post.autor}`}
                            onChange={(event) => setRascunho(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') setRascunho(null)
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault()
                                    void salvar()
                                }
                            }}
                        />
                        <div className="comunidades-post-edicao-acoes">
                            <button type="button" onClick={() => setRascunho(null)} disabled={ocupado}>
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="is-primario"
                                onClick={() => void salvar()}
                                disabled={ocupado || !rascunho.trim()}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="comunidades-post-texto">{post.texto}</p>
                )}

                <div className="comunidades-post-acoes">
                    <button
                        type="button"
                        className={`comunidades-post-responder${mostrandoResponder ? ' is-ativo' : ''}`}
                        onClick={() => onResponder(post)}
                        disabled={ocupado}
                    >
                        Responder
                    </button>
                    {acoesExtras}
                </div>
            </div>

            {(post.respostas ?? []).length > 0 && (
                <div className="comunidades-post-respostas">
                    {(post.respostas ?? []).map((resposta) => (
                        <Publicacao
                            key={resposta.id}
                            post={resposta}
                            respondendo={post.texto}
                            membros={membros}
                            respondendoAId={respondendoAId}
                            ocupado={ocupado}
                            euId={euId}
                            euUsername={euUsername}
                            podeGerir={podeGerir}
                            onResponder={onResponder}
                            onEditar={onEditar}
                            onApagar={onApagar}
                        />
                    ))}
                </div>
            )}
        </article>
    )
}

function LinhaComunidade({
    comunidade,
    ativa,
    participante,
    onSelecionar
}: {
    comunidade: ComunidadeApi
    ativa: boolean
    participante: boolean
    onSelecionar: (id: string) => void
}) {
    return (
        <button
            type="button"
            className={`comunidades-linha${ativa ? ' is-ativa' : ''}`}
            onClick={() => onSelecionar(comunidade.id)}
            aria-pressed={ativa}
        >
            <Avatar classe="comunidades-linha-avatar" src={comunidade.imagem} nome={comunidade.titulo} />
            <span className="comunidades-linha-nome">
                {comunidade.titulo}
                {participante && <em className="comunidades-linha-ponto" aria-label="Você participa" />}
            </span>
        </button>
    )
}

function MembroLinha({
    membro,
    euId,
    podePromover,
    podeBanir,
    ocupado,
    onPromover,
    onBanir
}: {
    membro: IntegranteComunidadeApi
    euId: string
    podePromover: boolean
    podeBanir: boolean
    ocupado: boolean
    onPromover: (membro: IntegranteComunidadeApi) => void
    onBanir: (membro: IntegranteComunidadeApi) => void
}) {
    const ehEu = membro.usuarioId === euId

    return (
        <li className="comunidades-membro">
            <Avatar classe="comunidades-membro-avatar" src={membro.avatar} nome={membro.nomeUsuario} />

            <div className="comunidades-membro-corpo">
                <span className="comunidades-membro-nome">@{membro.nomeUsuario}</span>
                <EtiquetaCargo cargo={membro.cargo} />
                {ehEu && <span className="comunidades-membro-voce">você</span>}
            </div>

            <div className="comunidades-membro-acoes">
                {podePromover && (
                    <button type="button" onClick={() => onPromover(membro)} disabled={ocupado}>
                        {membro.cargo === 'ADMIN' ? 'Remover admin' : 'Promover'}
                    </button>
                )}
                {podeBanir && (
                    <button
                        type="button"
                        className="is-perigo"
                        onClick={() => onBanir(membro)}
                        disabled={ocupado}
                        aria-label={`Remover @${membro.nomeUsuario} da comunidade`}
                    >
                        <IconeLixeira />
                    </button>
                )}
            </div>
        </li>
    )
}

function PedidoLinha({
    pedido,
    ocupado,
    onAceitar,
    onRecusar
}: {
    pedido: SolicitacaoComunidadeApi
    ocupado: boolean
    onAceitar: (pedido: SolicitacaoComunidadeApi) => void
    onRecusar: (pedido: SolicitacaoComunidadeApi) => void
}) {
    return (
        <li className="comunidades-pedido">
            <Avatar classe="comunidades-pedido-avatar" src={pedido.avatar} nome={pedido.nomeUsuario} />

            <div className="comunidades-pedido-corpo">
                <span className="comunidades-pedido-nome">@{pedido.nomeUsuario}</span>
                {pedido.mensagem && <p>{pedido.mensagem}</p>}
                <span className="comunidades-pedido-data">{dataCurta(pedido.criadoEm)}</span>
            </div>

            <div className="comunidades-pedido-acoes">
                <button type="button" className="is-aceitar" onClick={() => onAceitar(pedido)} disabled={ocupado}>
                    <IconeCheck />
                    <span>Aceitar</span>
                </button>
                <button
                    type="button"
                    className="is-recusar"
                    onClick={() => onRecusar(pedido)}
                    disabled={ocupado}
                    aria-label={`Recusar pedido de @${pedido.nomeUsuario}`}
                >
                    <IconeFechar />
                </button>
            </div>
        </li>
    )
}

export function Comunidades() {
    const eu = useMemo(() => usuarioLogado(), [])
    const entradaRef = useRef<HTMLInputElement>(null)

    const [comunidades, setComunidades] = useState<ComunidadeApi[]>([])
    const [participa, setParticipa] = useState<ComunidadeApi[]>([])
    const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
    const [painel, setPainel] = useState<Painel>('busca')
    const [busca, setBusca] = useState('')
    const [expandido, setExpandido] = useState({ minhas: false, populares: false })
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [aviso, setAviso] = useState<string | null>(null)
    const [ocupado, setOcupado] = useState(false)
    const [enviandoImagem, setEnviandoImagem] = useState(false)
    const [rascunho, setRascunho] = useState('')
    const [respondendoA, setRespondendoA] = useState<string | null>(null)
    const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null)
    const [config, setConfig] = useState({ titulo: '', imagem: '', aberta: true })
    const [tentativa, setTentativa] = useState(0)

    useEffect(() => {
        const controller = new AbortController()

        setCarregando(true)
        setErro(null)

        Promise.all([
            buscarComunidades(controller.signal),
            eu.id ? buscarComunidadesDoUsuario(eu.id, controller.signal) : Promise.resolve([] as ComunidadeApi[])
        ])
            .then(([todas, minhas]) => {
                setComunidades(todas)
                setParticipa(minhas)
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setErro(error instanceof Error ? error.message : 'Não foi possível carregar as comunidades.')
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false)
            })

        return () => controller.abort()
    }, [eu.id, tentativa])

    const selecionada = useMemo(
        () => comunidades.find((item) => item.id === selecionadaId) ?? null,
        [comunidades, selecionadaId]
    )

    useEffect(() => {
        if (selecionadaId && comunidades.some((item) => item.id === selecionadaId)) return

        const padrao = participa[0] ?? comunidades[0] ?? null
        setSelecionadaId(padrao?.id ?? null)
    }, [comunidades, participa, selecionadaId])

    const membros = selecionada?.membros ?? []
    const pedidos = selecionada?.solicitacoes ?? []
    const meuMembro = membros.find((item) => item.usuarioId === eu.id) ?? null
    const meuCargo = meuMembro?.cargo ?? null
    const podeGerir = meuCargo === 'DONO' || meuCargo === 'ADMIN'
    const meuPedido = pedidos.find((item) => item.usuarioId === eu.id) ?? null

    useEffect(() => {
        const atual = comunidades.find((item) => item.id === selecionadaId)
        if (!atual) return

        setConfig({
            titulo: atual.titulo,
            imagem: atual.imagem,
            aberta: atual.abertaParaSolicitacoes !== false
        })
        setRespondendoA(null)
        setRascunho('')
        setConfirmacao(null)
        setAviso(null)
        // o formulário segue a comunidade selecionada; mutações mantém o que o usuário digitou
    }, [selecionadaId])  // eslint-disable-line react-hooks/exhaustive-deps

    const recarregar = useCallback(async () => {
        const [todas, minhas] = await Promise.all([
            buscarComunidades(),
            eu.id ? buscarComunidadesDoUsuario(eu.id) : Promise.resolve([] as ComunidadeApi[])
        ])

        setComunidades(todas)
        setParticipa(minhas)
    }, [eu.id])

    const executar = useCallback(
        async (acao: () => Promise<unknown>) => {
            if (!eu.id) {
                setAviso('Entre na sua conta para gerenciar a comunidade.')
                return
            }

            setOcupado(true)
            setAviso(null)

            try {
                await acao()
                await recarregar()
            } catch (error: unknown) {
                setAviso(error instanceof Error ? error.message : 'Não foi possível concluir a operação.')
            } finally {
                setOcupado(false)
            }
        },
        [eu.id, recarregar]
    )

    const comunidadesFiltradas = useMemo(() => {
        const termo = busca.trim().toLowerCase()
        if (!termo) return []

        return comunidades.filter((item) => {
            const campos = [item.titulo, item.descricao, item.desenvolvedor, ...(item.tags ?? [])]

            return campos.some((campo) => (campo ?? '').toLowerCase().includes(termo))
        })
    }, [busca, comunidades])

    const publicacoes = useMemo(() => {
        return [...(selecionada?.comentarios ?? [])].sort((a, b) =>
            (b.criadoEm ?? '').localeCompare(a.criadoEm ?? '')
        )
    }, [selecionada])

    const responder = (post: ComentarioApi) => {
        if (!meuMembro) {
            setAviso('Participe da comunidade para responder.')
            return
        }

        setRespondendoA(post.id)
        document.getElementById('comunidades-compositor')?.focus()
    }

    const publicarTexto = async () => {
        if (!selecionada || !rascunho.trim()) return

        const texto = rascunho.trim()
        const eraResposta = Boolean(respondendoA)

        await executar(async () => {
            await publicar(selecionada.id, eu.id, texto, respondendoA)
            setRascunho('')
            setRespondendoA(null)

            if (!eraResposta) {
                document.querySelector('.comunidades-feed-lista')?.scrollTo({ top: 0, behavior: 'smooth' })
            }
        })
    }

    const salvarEdicao = async (post: ComentarioApi, texto: string) => {
        if (!selecionada || !eu.id) return false

        setOcupado(true)
        setAviso(null)

        try {
            await editarPublicacao(selecionada.id, post.id, eu.id, texto)
            await recarregar()
            return true
        } catch (error: unknown) {
            setAviso(error instanceof Error ? error.message : 'Não foi possível editar a publicação.')
            return false
        } finally {
            setOcupado(false)
        }
    }

    const pedirApagar = (post: ComentarioApi) => setConfirmacao({ tipo: 'publicacao', alvoId: post.id })

    const enviarArquivo = async (event: ChangeEvent<HTMLInputElement>) => {
        const arquivo = event.target.files?.[0]
        event.target.value = ''

        if (!arquivo) return

        if (!arquivo.type.startsWith('image/')) {
            setAviso('Escolha um arquivo de imagem (JPG, PNG ou WebP).')
            return
        }

        setEnviandoImagem(true)

        try {
            const url = await enviarImagemParaCloudinary(arquivo, 'huby/comunidades')
            setConfig((atual) => ({ ...atual, imagem: url }))
            setAviso('Imagem carregada. Salve as configurações para aplicar.')
        } catch (error: unknown) {
            setAviso(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.')
        } finally {
            setEnviandoImagem(false)
        }
    }

    const confirmarAcao = async () => {
        if (!selecionada || !confirmacao) return

        const comunidade = selecionada
        const tipo = confirmacao.tipo
        const alvoId = confirmacao.alvoId

        setConfirmacao(null)

        if (tipo === 'excluir') {
            await executar(() => excluirComunidade(comunidade.id, eu.id))
            setSelecionadaId(null)
            setPainel('busca')
            return
        }

        if (tipo === 'sair') {
            await executar(() => sairDaComunidade(comunidade.id, eu.id))
            setPainel('busca')
            return
        }

        if (tipo === 'publicacao') {
            await executar(() => apagarPublicacao(comunidade.id, alvoId ?? '', eu.id))
            return
        }

        await executar(() => banirMembro(comunidade.id, eu.id, alvoId ?? ''))
    }

    const participantesRotulo = (comunidade: ComunidadeApi) => {
        const total = comunidade.membros?.length ?? 0

        return `${total.toLocaleString('pt-BR')} membro${total === 1 ? '' : 's'}`
    }

    if (carregando) {
        return (
            <main className="comunidades">
                <div className="comunidades-estado" role="status">
                    Carregando as comunidades...
                </div>
            </main>
        )
    }

    if (erro) {
        return (
            <main className="comunidades">
                <div className="comunidades-estado comunidades-estado-erro" role="alert">
                    <p>{erro}</p>
                    <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button>
                </div>
            </main>
        )
    }

    if (!selecionada) {
        return (
            <main className="comunidades">
                <div className="comunidades-estado">
                    <p>Nenhuma comunidade publicada ainda.</p>
                </div>
            </main>
        )
    }

    const minhasVisiveis = expandido.minhas ? participa : participa.slice(0, LIMITE_LISTA)
    const popularesVisiveis = expandido.populares
        ? comunidades
        : comunidades.slice(0, LIMITE_LISTA)
    const resultadosVisiveis = comunidadesFiltradas

    const alvoPublicacao = publicacoes
        .flatMap((post) => [post, ...(post.respostas ?? [])])
        .find((post) => post.id === confirmacao?.alvoId) ?? null

    const nomeInvalido = config.titulo.trim().length < NOME_MIN || config.titulo.trim().length > NOME_MAX

    return (
        <main className="comunidades">
            <section className="comunidades-feed" aria-label={`Publicações de ${selecionada.titulo}`}>
                <header className="comunidades-feed-cabeca">
                    <Avatar classe="comunidades-feed-avatar" src={selecionada.imagem} nome={selecionada.titulo} />

                    <div className="comunidades-feed-titulo">
                        <h1>{selecionada.titulo}</h1>
                        <p>
                            {selecionada.descricao}
                            <span> · {participantesRotulo(selecionada)}</span>
                        </p>
                    </div>

                    <div className="comunidades-feed-acoes">
                        {meuCargo ? (
                            <>
                                <span className="comunidades-feed-tag">
                                    Você é {ROTULO_CARGO[meuCargo].toLowerCase()}
                                </span>
                                <button type="button" onClick={() => setConfirmacao({ tipo: 'sair' })} disabled={ocupado}>
                                    Sair
                                </button>
                            </>
                        ) : meuPedido ? (
                            <button
                                type="button"
                                className="is-enviado"
                                onClick={() => executar(() => cancelarPedido(selecionada.id, meuPedido.id, eu.id))}
                                disabled={ocupado}
                            >
                                Pedido enviado · cancelar
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="is-primario"
                                onClick={() => executar(() => solicitarEntrada(selecionada.id, eu.id))}
                                disabled={ocupado || selecionada.abertaParaSolicitacoes === false}
                            >
                                {selecionada.abertaParaSolicitacoes === false ? 'Pedidos fechados' : 'Pedir entrada'}
                            </button>
                        )}
                    </div>
                </header>

                <div className="comunidades-feed-lista">
                    {publicacoes.length === 0 && (
                        <p className="comunidades-vazio">
                            Nenhuma publicação nesta comunidade ainda.
                        </p>
                    )}

                    {publicacoes.map((post) => (
                        <Publicacao
                            key={post.id}
                            post={post}
                            membros={membros}
                            respondendoAId={respondendoA}
                            ocupado={ocupado}
                            euId={eu.id}
                            euUsername={eu.username}
                            podeGerir={podeGerir}
                            onResponder={responder}
                            onEditar={salvarEdicao}
                            onApagar={pedirApagar}
                        />
                    ))}
                </div>

                <footer className="comunidades-feed-rodape">
                    {respondendoA && (
                        <div className="comunidades-compositor-alvo">
                            <span>
                                Respondendo {
                                    publicacoes
                                        .flatMap((post) => [post, ...(post.respostas ?? [])])
                                        .find((post) => post.id === respondendoA)?.handle ?? ''
                                }
                            </span>
                            <button type="button" onClick={() => setRespondendoA(null)} aria-label="Cancelar resposta">
                                <IconeFechar />
                            </button>
                        </div>
                    )}

                    <div className="comunidades-compositor">
                        <input
                            id="comunidades-compositor"
                            type="text"
                            value={rascunho}
                            placeholder={
                                meuMembro
                                    ? 'Escreva uma publicação...'
                                    : 'Participe da comunidade para publicar'
                            }
                            disabled={!meuMembro || ocupado}
                            onChange={(event) => setRascunho(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && rascunho.trim()) void publicarTexto()
                            }}
                        />
                        <button
                            type="button"
                            className="is-primario"
                            onClick={() => void publicarTexto()}
                            disabled={!meuMembro || ocupado || !rascunho.trim()}
                        >
                            Publicar
                        </button>
                    </div>
                </footer>
            </section>

            <aside className="comunidades-dash">
                <div className="comunidades-dash-canal">
                    <IconeForum />
                    <span>{selecionada.titulo.toUpperCase()}</span>
                    <button
                        type="button"
                        className={painel === 'dados' ? 'is-ativo' : ''}
                        onClick={() => setPainel(painel === 'dados' ? 'busca' : 'dados')}
                        aria-pressed={painel === 'dados'}
                    >
                        {painel === 'dados' ? 'Voltar à pesquisa' : 'Ver dados'}
                    </button>
                </div>

                {aviso && (
                    <p className="comunidades-dash-aviso" role="status">
                        {aviso}
                    </p>
                )}

                {painel === 'busca' ? (
                    <div className="comunidades-dash-busca">
                        <label className="comunidades-campo-busca">
                            <input
                                type="search"
                                value={busca}
                                placeholder="Encontre novas comunidades"
                                onChange={(event) => setBusca(event.target.value)}
                            />
                            <IconeBusca />
                        </label>

                        {busca.trim() ? (
                            <section className="comunidades-dash-bloco">
                                <h2>Resultados da busca</h2>
                                {comunidadesFiltradas.length === 0 && (
                                    <p className="comunidades-vazio">Nenhuma comunidade encontrada.</p>
                                )}
                                <ul className="comunidades-lista">
                                    {resultadosVisiveis.map((item) => (
                                        <li key={item.id}>
                                            <LinhaComunidade
                                                comunidade={item}
                                                ativa={item.id === selecionada.id}
                                                participante={item.membros?.some((m) => m.usuarioId === eu.id) ?? false}
                                                onSelecionar={setSelecionadaId}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : (
                            <>
                                <section className="comunidades-dash-bloco">
                                    <h2>Comunidades que você participa</h2>
                                    {participa.length === 0 && (
                                        <p className="comunidades-vazio">
                                            Você ainda não participa de nenhuma comunidade.
                                        </p>
                                    )}
                                    <ul className="comunidades-lista">
                                        {minhasVisiveis.map((item) => (
                                            <li key={item.id}>
                                                <LinhaComunidade
                                                    comunidade={item}
                                                    ativa={item.id === selecionada.id}
                                                    participante
                                                    onSelecionar={setSelecionadaId}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                    {participa.length > LIMITE_LISTA && (
                                        <button
                                            type="button"
                                            className="comunidades-ver-mais"
                                            onClick={() => setExpandido((atual) => ({ ...atual, minhas: !atual.minhas }))}
                                        >
                                            {expandido.minhas ? 'Ver menos' : 'Ver mais'}
                                        </button>
                                    )}
                                </section>

                                <section className="comunidades-dash-bloco comunidades-dash-bloco-dividido">
                                    <h2>Comunidades populares</h2>
                                    <ul className="comunidades-lista">
                                        {popularesVisiveis.map((item) => (
                                            <li key={item.id}>
                                                <LinhaComunidade
                                                    comunidade={item}
                                                    ativa={item.id === selecionada.id}
                                                    participante={item.membros?.some((m) => m.usuarioId === eu.id) ?? false}
                                                    onSelecionar={setSelecionadaId}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                    {comunidades.length > LIMITE_LISTA && (
                                        <button
                                            type="button"
                                            className="comunidades-ver-mais"
                                            onClick={() => setExpandido((atual) => ({ ...atual, populares: !atual.populares }))}
                                        >
                                            {expandido.populares ? 'Ver menos' : 'Ver mais'}
                                        </button>
                                    )}
                                </section>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="comunidades-dash-dados">
                        <header className="comunidades-dash-dados-cabeca">
                            <button type="button" onClick={() => setPainel('busca')}>
                                <IconeVoltar />
                                <span>Pesquisa de comunidades</span>
                            </button>
                            <h2>Dados da comunidade</h2>
                            <p>
                                {participantesRotulo(selecionada)}
                                {meuCargo ? ` · você é ${ROTULO_CARGO[meuCargo].toLowerCase()}` : ' · você não participa'}
                            </p>
                        </header>

                        <section className="comunidades-dash-bloco">
                            <h2>Membros</h2>
                            <ul className="comunidades-lista comunidades-lista-membros">
                                {membros.map((membro) => (
                                    <MembroLinha
                                        key={membro.usuarioId}
                                        membro={membro}
                                        euId={eu.id}
                                        podePromover={
                                            meuCargo === 'DONO' &&
                                            membro.cargo !== 'DONO' &&
                                            membro.usuarioId !== eu.id
                                        }
                                        podeBanir={
                                            podeGerir &&
                                            membro.cargo !== 'DONO' &&
                                            membro.usuarioId !== eu.id &&
                                            (meuCargo === 'DONO' || membro.cargo === 'MEMBRO')
                                        }
                                        ocupado={ocupado}
                                        onPromover={(alvo) =>
                                            void executar(() =>
                                                alterarCargo(selecionada.id, eu.id, alvo.usuarioId, alvo.cargo === 'ADMIN' ? 'MEMBRO' : 'ADMIN')
                                            )
                                        }
                                        onBanir={(alvo) => setConfirmacao({ tipo: 'banir', alvoId: alvo.usuarioId })}
                                    />
                                ))}
                            </ul>
                            {membros.length === 0 && (
                                <p className="comunidades-vazio">Nenhum membro listado.</p>
                            )}
                        </section>

                        {podeGerir && (
                            <section className="comunidades-dash-bloco comunidades-dash-bloco-dividido">
                                <h2>
                                    Pedidos para entrar
                                    {pedidos.length > 0 && <span className="comunidades-contagem">{pedidos.length}</span>}
                                </h2>
                                {pedidos.length === 0 ? (
                                    <p className="comunidades-vazio">Nenhum pedido pendente.</p>
                                ) : (
                                    <ul className="comunidades-lista comunidades-lista-pedidos">
                                        {pedidos.map((pedido) => (
                                            <PedidoLinha
                                                key={pedido.id}
                                                pedido={pedido}
                                                ocupado={ocupado}
                                                onAceitar={(alvo) =>
                                                    void executar(() => aceitarPedido(selecionada.id, alvo.id, eu.id))
                                                }
                                                onRecusar={(alvo) =>
                                                    void executar(() => recusarPedido(selecionada.id, alvo.id, eu.id))
                                                }
                                            />
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {podeGerir && (
                            <section className="comunidades-dash-bloco comunidades-dash-bloco-dividido">
                                <h2>Configurações</h2>

                                <label className="comunidades-config-campo">
                                    <span>Nome da comunidade</span>
                                    <input
                                        type="text"
                                        value={config.titulo}
                                        maxLength={NOME_MAX}
                                        onChange={(event) => setConfig((atual) => ({ ...atual, titulo: event.target.value }))}
                                    />
                                    {nomeInvalido && (
                                        <em>O nome deve ter entre {NOME_MIN} e {NOME_MAX} caracteres.</em>
                                    )}
                                </label>

                                <div className="comunidades-config-campo">
                                    <span>Imagem da comunidade</span>
                                    <div className="comunidades-config-imagem">
                                        <Avatar classe="comunidades-config-avatar" src={config.imagem} nome={config.titulo} />
                                        <div className="comunidades-config-url">
                                            <input
                                                type="text"
                                                value={config.imagem}
                                                placeholder="https://res.cloudinary.com/..."
                                                onChange={(event) => setConfig((atual) => ({ ...atual, imagem: event.target.value }))}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => entradaRef.current?.click()}
                                                disabled={enviandoImagem || !cloudinaryConfigurado()}
                                            >
                                                {enviandoImagem ? 'Enviando...' : 'Carregar'}
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        ref={entradaRef}
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(event) => void enviarArquivo(event)}
                                    />
                                </div>

                                <label className="comunidades-config-toggle">
                                    <input
                                        type="checkbox"
                                        checked={config.aberta}
                                        onChange={(event) => setConfig((atual) => ({ ...atual, aberta: event.target.checked }))}
                                    />
                                    <span>Aceitar pedidos de entrada</span>
                                </label>

                                <button
                                    type="button"
                                    className="is-primario"
                                    disabled={ocupado || nomeInvalido}
                                    onClick={() =>
                                        void executar(() =>
                                            salvarConfiguracoes(selecionada.id, {
                                                usuarioId: eu.id,
                                                titulo: config.titulo.trim(),
                                                imagem: config.imagem.trim(),
                                                abertaParaSolicitacoes: config.aberta
                                            })
                                        )
                                    }
                                >
                                    Salvar configurações
                                </button>
                            </section>
                        )}

                        <section className="comunidades-dash-bloco comunidades-dash-perigos">
                            {meuCargo && (
                                <button type="button" onClick={() => setConfirmacao({ tipo: 'sair' })} disabled={ocupado}>
                                    Sair da comunidade
                                </button>
                            )}
                            {meuCargo === 'DONO' && (
                                <button
                                    type="button"
                                    className="is-perigo"
                                    onClick={() => setConfirmacao({ tipo: 'excluir' })}
                                    disabled={ocupado}
                                >
                                    Excluir comunidade
                                </button>
                            )}
                        </section>
                    </div>
                )}
            </aside>

            {confirmacao && (
                <div className="comunidades-confirmacao-fundo" onClick={() => setConfirmacao(null)}>
                    <div
                        className="comunidades-confirmacao"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Confirmar ação"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {confirmacao.tipo === 'excluir' && (
                            <>
                                <h3>Excluir {selecionada.titulo}?</h3>
                                <p>
                                    A comunidade, os {membros.length} membros listados e todas as publicações do fórum
                                    serão apagados. Essa ação não pode ser desfeita.
                                </p>
                            </>
                        )}

                        {confirmacao.tipo === 'sair' && (
                            <>
                                <h3>Sair de {selecionada.titulo}?</h3>
                                <p>
                                    {meuCargo === 'DONO'
                                        ? 'Como você é o dono, a posse passa para o primeiro administrador; se não houver, o primeiro membro assume.'
                                        : 'Você pode pedir entrada de novo quando quiser.'}
                                </p>
                            </>
                        )}

                        {confirmacao.tipo === 'banir' && (
                            <>
                                <h3>Remover integrante?</h3>
                                <p>
                                    @{membros.find((item) => item.usuarioId === confirmacao.alvoId)?.nomeUsuario ?? ''}
                                    {' '}vai perder o acesso à comunidade e poderá enviar um novo pedido depois.
                                </p>
                            </>
                        )}

                        {confirmacao.tipo === 'publicacao' && (
                            <>
                                <h3>Apagar publicação?</h3>
                                <p>
                                    {alvoPublicacao
                                        ? `A publicação de ${alvoPublicacao.autor} — "${resumo(alvoPublicacao.texto)}" — sai do fórum junto com as respostas dela. Essa ação não pode ser desfeita.`
                                        : 'Esta publicação não existe mais.'}
                                </p>
                            </>
                        )}

                        <div className="comunidades-confirmacao-acoes">
                            <button type="button" onClick={() => setConfirmacao(null)}>Cancelar</button>
                            <button type="button" className="is-perigo" onClick={() => void confirmarAcao()} disabled={ocupado}>
                                {confirmacao.tipo === 'banir'
                                    ? 'Remover'
                                    : confirmacao.tipo === 'publicacao'
                                        ? 'Apagar'
                                        : confirmacao.tipo === 'sair'
                                        ? 'Sair'
                                        : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
