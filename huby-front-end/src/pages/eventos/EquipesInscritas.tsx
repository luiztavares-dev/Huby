import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
    buscarEquipes,
    buscarEvento,
    buscarMeusPedidos,
    chavePedidoEquipe,
    enviarEntrega,
    solicitarEntrada,
    type EquipeApi,
    type EventoApi,
    type ModeloEquipeApi
} from '../../services/eventos'
import { buscarUsuarios, type UsuarioResumoApi } from '../../services/usuarios'
import { inscricoesAbertas, podeEnviarEntrega } from '../../utils/fasesEvento'
import { useStatusPedidos } from './useStatusPedidos'
import './EquipesInscritas.css'

const TAMANHO_PADRAO = 4
const INTEGRANTES_MIN = 2

type UsuarioLocal = {
    id: string
    username: string
}

function usuarioLogado(): UsuarioLocal {
    try {
        const dados = localStorage.getItem('huby_user')
        if (!dados) return { id: '', username: '' }

        const usuario = JSON.parse(dados) as { id?: string; username?: string; login?: string }

        return {
            id: usuario.id || '',
            username: (usuario.username || usuario.login || '').replace(/^[@#]+/, '')
        }
    } catch {
        return { id: '', username: '' }
    }
}

function rotuloModelo(modelo?: ModeloEquipeApi | null) {
    if (modelo === 'SURPRESA') return 'Equipe surpresa'
    if (modelo === 'INDIVIDUAL') return 'Individual'
    return 'Equipe comum'
}

function integrantesAtivos(equipe: EquipeApi) {
    return (equipe.integrantes ?? []).filter((integrante) => integrante.status !== 'RECUSADO')
}

function AvatarNeutro({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`equipes-avatar-neutro ${className}`.trim()}
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="16" cy="11.6" r="5.2" fill="currentColor" />
            <path d="M5.6 27.2c0-5.6 4.7-9.2 10.4-9.2s10.4 3.6 10.4 9.2z" fill="currentColor" />
        </svg>
    )
}

function MiniAvatar({ avatar, nome }: { avatar?: string | null; nome: string }) {
    return (
        <span className="equipes-mini" title={`@${nome}`}>
            {avatar
                ? <img src={avatar} alt="" referrerPolicy="no-referrer" />
                : <AvatarNeutro />}
        </span>
    )
}

export function EquipesInscritas() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [evento, setEvento] = useState<EventoApi | null>(null)
    const [equipes, setEquipes] = useState<EquipeApi[]>([])
    const [usuarios, setUsuarios] = useState<UsuarioResumoApi[]>([])
    const [usuario, setUsuario] = useState<UsuarioLocal>(() => usuarioLogado())
    const [carregando, setCarregando] = useState(true)
    const [erroCarga, setErroCarga] = useState<string | null>(null)
    const [tentativa, setTentativa] = useState(0)

    const [expandida, setExpandida] = useState<string | null>(null)
    const [enviando, setEnviando] = useState<string | null>(null)
    const [aviso, setAviso] = useState<string | null>(null)
    const [erroAcao, setErroAcao] = useState<string | null>(null)
    const [entregaEquipeId, setEntregaEquipeId] = useState<string | null>(null)
    const [entregaTitulo, setEntregaTitulo] = useState('')
    const [entregaDescricao, setEntregaDescricao] = useState('')
    const [entregaLink, setEntregaLink] = useState('')
    const [entregaImagem, setEntregaImagem] = useState('')
    const [erroEntrega, setErroEntrega] = useState<string | null>(null)
    const { statusPedidos, carregarPedidos, atualizarStatus } = useStatusPedidos(usuario.id, id)

    useEffect(() => {
        const controller = new AbortController()
        const eu = usuarioLogado()

        setCarregando(true)
        setErroCarga(null)
        setUsuario(eu)

        Promise.all([
            buscarEvento(id ?? '', controller.signal),
            buscarEquipes(id ?? '', controller.signal),
            eu.id
                ? buscarMeusPedidos(eu.id, controller.signal).catch(() => [])
                : Promise.resolve([]),
            buscarUsuarios(controller.signal).catch(() => [] as UsuarioResumoApi[])
        ])
            .then(([eventoApi, equipesApi, pedidosApi, usuariosApi]) => {
                if (controller.signal.aborted) return

                setEvento(eventoApi)
                setEquipes(equipesApi.filter((equipe) => equipe.aguardandoSorteio !== true))
                setUsuarios(usuariosApi)
                carregarPedidos(pedidosApi.filter((pedido) => pedido.eventoId === id))
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar as equipes.')
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false)
            })

        return () => controller.abort()
    }, [id, tentativa, carregarPedidos])

    useEffect(() => {
        if (!aviso) return

        const timer = window.setTimeout(() => setAviso(null), 5000)
        return () => window.clearTimeout(timer)
    }, [aviso])

    useEffect(() => {
        if (!erroAcao) return

        const timer = window.setTimeout(() => setErroAcao(null), 5000)
        return () => window.clearTimeout(timer)
    }, [erroAcao])

    const alternar = useCallback((equipeId: string) => {
        setExpandida((atual) => (atual === equipeId ? null : equipeId))
    }, [])

    const enviarPedido = async (equipe: EquipeApi) => {
        const eu = usuarioLogado()
        setUsuario(eu)

        if (!eu.id) {
            navigate('/login')
            return
        }
        if (!evento || !inscricoesAbertas(evento)) {
            setErroAcao('O prazo para pedir entrada em equipes terminou.')
            return
        }

        setEnviando(equipe.id)
        setErroAcao(null)

        try {
            const pedido = await solicitarEntrada(id ?? '', equipe.id, eu.id)
            atualizarStatus(pedido.equipeId, pedido.destinatarioId, pedido.conviteStatus || 'PENDENTE')
            setAviso(`Pedido enviado para a equipe ${equipe.nome}. Acompanhe a resposta em Mensagens.`)
        } catch (error) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível enviar o pedido.'
            setErroAcao(mensagem)

            if (mensagem.toLowerCase().includes('já enviou')) {
                atualizarStatus(equipe.id, equipe.liderId, 'PENDENTE')
            }
        } finally {
            setEnviando(null)
        }
    }

    const categoria = evento?.tipo === 'GAME_JAM' ? 'Game jam' : 'Evento'
    const modeloEvento = evento?.modeloEquipe ?? 'COMUM'
    const sorteioPendente = modeloEvento === 'SURPRESA' && evento?.sorteioRealizado !== true
    const capacidade = Math.max(INTEGRANTES_MIN, evento?.tamanhoEquipe ?? TAMANHO_PADRAO)

    const idDoUsuario = (username?: string | null) => {
        const alvo = (username ?? '').trim().toLowerCase()
        if (!alvo) return ''
        return usuarios.find((item) => item.username.toLowerCase() === alvo)?.id ?? ''
    }

    const abrirEntrega = (equipe: EquipeApi) => {
        if (!podeEnviarEntregas(equipe)) {
            setErroAcao('O envio de jogos só é permitido durante o período de desenvolvimento.')
            return
        }
        setEntregaEquipeId(equipe.id)
        setEntregaTitulo(equipe.entregaTitulo || '')
        setEntregaDescricao(equipe.entregaDescricao || '')
        setEntregaLink(equipe.entregaLink || '')
        setEntregaImagem(equipe.entregaImagem || equipe.imagem || '')
        setErroEntrega(null)
    }

    const podeEnviarEntregas = (equipe: EquipeApi) => {
        if (!evento || !usuario.id || equipe.aguardandoSorteio) return false
        const participa = integrantesAtivos(equipe).some((item) =>
            item.nomeUsuario.toLowerCase() === usuario.username.toLowerCase())
        if (!participa) return false
        return podeEnviarEntrega(evento)
    }

    const enviarEntregadEquipa = async (event: FormEvent) => {
        event.preventDefault()
        if (!entregaEquipeId || !usuario.id) {
            setErroEntrega('Entre na sua conta para enviar o jogo.')
            return
        }
        const equipe = equipes.find((item) => item.id === entregaEquipeId)
        if (!equipe || !podeEnviarEntregas(equipe)) {
            setErroEntrega('O envio de jogos só é permitido durante o período de desenvolvimento.')
            return
        }
        if (!entregaTitulo.trim() || !entregaLink.trim()) {
            setErroEntrega('Informe o título e o link externo do jogo.')
            return
        }
        setEnviando(entregaEquipeId)
        setErroEntrega(null)
        try {
            const atualizada = await enviarEntrega(id ?? '', entregaEquipeId, {
                usuarioId: usuario.id,
                titulo: entregaTitulo.trim(),
                descricao: entregaDescricao.trim(),
                linkUrl: entregaLink.trim(),
                imagem: entregaImagem.trim() || undefined
            })
            setEquipes((lista) => lista.map((equipe) => equipe.id === atualizada.id ? atualizada : equipe))
            setEntregaEquipeId(null)
            setAviso('Entrega do jogo enviada com sucesso.')
        } catch (error) {
            setErroEntrega(error instanceof Error ? error.message : 'Não foi possível enviar o jogo.')
        } finally {
            setEnviando(null)
        }
    }

    if (carregando) {
        return (
            <main className="equipes-inscritas">
                <div className="equipes-carregando" aria-hidden="true">
                    <div className="equipes-esqueleto-faixa" />
                    <div className="equipes-esqueleto-card" />
                    <div className="equipes-esqueleto-card" />
                </div>
            </main>
        )
    }

    if (erroCarga || !evento) {
        return (
            <main className="equipes-inscritas">
                <div className="equipes-estado" role="alert">
                    <p>{erroCarga ?? 'Evento não encontrado.'}</p>
                    <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>
                        Tentar novamente
                    </button>
                    <button type="button" className="is-secundaria" onClick={() => navigate('/eventos')}>
                        Voltar aos eventos
                    </button>
                </div>
            </main>
        )
    }

    const inscricoesEventoAbertas = inscricoesAbertas(evento)

    return (
        <main className="equipes-inscritas">
            <header className="equipes-topo">
                <button
                    type="button"
                    className="equipes-voltar"
                    onClick={() => navigate('/eventos')}
                    aria-label="Voltar aos eventos"
                >
                    ‹
                </button>
                <span>Equipes Inscritas</span>
            </header>

            <section className="equipes-faixa">
                <h1>{evento.titulo}</h1>

                <div className="equipes-tags">
                    <span>{categoria}</span>
                    <span>{rotuloModelo(modeloEvento)}</span>
                </div>
            </section>

            {aviso && (
                <p className="equipes-aviso" role="status">{aviso}</p>
            )}

            {erroAcao && (
                <p className="equipes-erro-acao" role="alert">{erroAcao}</p>
            )}

            {equipes.length === 0 ? (
                <div className="equipes-estado">
                    <p>
                        {sorteioPendente
                            ? 'As equipes surpresa serão formadas após o sorteio, ao final do período de inscrições.'
                            : 'Nenhuma equipe inscrita neste evento ainda.'}
                    </p>
                    <button
                        type="button"
                        disabled={!inscricoesEventoAbertas}
                        onClick={() => navigate(`/eventos/${evento.id}/inscricao`)}
                    >
                        {inscricoesEventoAbertas ? 'Inscrever equipe' : 'Inscrições encerradas'}
                    </button>
                </div>
            ) : (
                <div className="equipes-lista">
                    {equipes.map((equipe) => {
                        const integrantes = integrantesAtivos(equipe)
                        const total = integrantes.length
                        const modelo = equipe.modelo ?? 'COMUM'

                        const souMembro = !!usuario.username && integrantes.some(
                            (integrante) => integrante.nomeUsuario?.toLowerCase() === usuario.username.toLowerCase()
                        )
                        const souLider = !!usuario.id && equipe.liderId === usuario.id

                        const temEspaco = total < capacidade
                        const procurando = modelo === 'COMUM'
                            && equipe.abertaParaSolicitacoes
                            && temEspaco
                            && inscricoesEventoAbertas
                        const fechada = modelo === 'COMUM'
                            && temEspaco
                            && (!equipe.abertaParaSolicitacoes || !inscricoesEventoAbertas)
                        const statusTexto = procurando
                            ? 'Procurando integrante'
                            : fechada ? 'Inscrições encerradas' : 'Equipe completa'

                        const chavePedido = chavePedidoEquipe(equipe.id, equipe.liderId)
                        const statusPedido = chavePedido ? statusPedidos.get(chavePedido) : undefined
                        const enviado = statusPedido === 'PENDENTE'
                        const aceito = statusPedido === 'ACEITO'
                        const recusado = statusPedido === 'RECUSADO'
                        const podeEnviar = procurando && !souMembro && !souLider
                        const aberta = expandida === equipe.id
                        const minis = integrantes.slice(0, 3)

                        return (
                            <article
                                className={`equipe-card ${aberta ? 'is-expandida' : ''}`}
                                key={equipe.id}
                            >
                                <button
                                    type="button"
                                    className="equipe-card-topo"
                                    onClick={() => alternar(equipe.id)}
                                    aria-expanded={aberta}
                                >
                                    <span className="equipe-card-capa">
                                        {equipe.imagem
                                            ? <img src={equipe.imagem} alt="" />
                                            : <span className="equipe-card-capa-vazia" />}

                                        <span className="equipe-card-avatar">
                                            {equipe.avatar
                                                ? <img src={equipe.avatar} alt="" referrerPolicy="no-referrer" />
                                                : <AvatarNeutro />}
                                        </span>
                                    </span>

                                    <span className="equipe-card-faixa">
                                        <span className="equipe-card-info">
                                            <strong>{equipe.nome}</strong>
                                            <span className={procurando ? 'is-procurando' : ''}>
                                                {statusTexto}
                                            </span>
                                        </span>

                                        <span className="equipe-card-lado">
                                            <span className="equipe-card-minis">
                                                {minis.map((integrante, indice) => (
                                                    <MiniAvatar
                                                        key={`${integrante.nomeUsuario}-${indice}`}
                                                        avatar={integrante.avatar}
                                                        nome={integrante.nomeUsuario}
                                                    />
                                                ))}
                                            </span>

                                            <span className={`equipe-card-seta ${aberta ? 'is-aberta' : ''}`} aria-hidden="true">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </span>
                                        </span>
                                    </span>
                                </button>

                                {aberta && (
                                    <div className="equipe-card-integrantes">
                                        {integrantes.length > 0 ? (
                                            integrantes.map((integrante, indice) => {
                                                const usuarioId = idDoUsuario(integrante.nomeUsuario)

                                                return (
                                                    <button
                                                        type="button"
                                                        className="equipe-integrante"
                                                        key={`${integrante.nomeUsuario}-${indice}`}
                                                        onClick={() => {
                                                            if (usuarioId) navigate(`/perfil/${usuarioId}`)
                                                        }}
                                                        disabled={!usuarioId}
                                                        title={usuarioId ? `Ver perfil de @${integrante.nomeUsuario}` : undefined}
                                                    >
                                                        <span className="equipe-integrante-avatar">
                                                            {integrante.avatar
                                                                ? <img src={integrante.avatar} alt="" referrerPolicy="no-referrer" />
                                                                : <AvatarNeutro />}
                                                        </span>

                                                        <span className="equipe-integrante-id">@{integrante.nomeUsuario}</span>

                                                        <span className="equipe-integrante-funcao">
                                                            {integrante.funcao || ''}
                                                        </span>
                                                    </button>
                                                )
                                            })
                                        ) : (
                                            <p className="equipe-integrantes-vazio">Nenhum integrante confirmado ainda.</p>
                                        )}
                                    </div>
                                )}

                                {(enviado || aceito) && (
                                    <button type="button" className="equipe-card-pedido is-enviado" disabled>
                                        {enviado ? 'Pedido enviado' : 'Pedido aceito'}
                                    </button>
                                )}

                                {!enviado && !aceito && podeEnviar && (
                                    <button
                                        type="button"
                                        className="equipe-card-pedido"
                                        onClick={() => enviarPedido(equipe)}
                                        disabled={enviando === equipe.id}
                                    >
                                        {enviando === equipe.id
                                            ? 'Enviando...'
                                            : recusado ? 'Enviar novamente' : 'Enviar pedido'}
                                    </button>
                                )}

                                {podeEnviarEntregas(equipe) && (
                                    <button
                                        type="button"
                                        className="equipe-card-pedido"
                                        onClick={() => abrirEntrega(equipe)}
                                    >
                                        {equipe.entregaLink ? 'Editar entrega do jogo' : 'Enviar jogo'}
                                    </button>
                                )}
                            </article>
                        )
                    })}
                </div>
            )}

            {entregaEquipeId && (
                <div className="equipe-entrega-fundo" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setEntregaEquipeId(null)
                }}>
                    <form className="equipe-entrega" onSubmit={enviarEntregadEquipa}>
                        <h2>Enviar jogo</h2>
                        <label>
                            Título
                            <input value={entregaTitulo} onChange={(event) => setEntregaTitulo(event.target.value)} />
                        </label>
                        <label>
                            Descrição
                            <textarea value={entregaDescricao} onChange={(event) => setEntregaDescricao(event.target.value)} />
                        </label>
                        <label>
                            Link externo
                            <input
                                type="url"
                                value={entregaLink}
                                onChange={(event) => setEntregaLink(event.target.value)}
                                placeholder="https://itch.io/..."
                            />
                        </label>
                        <label>
                            Imagem ou capa
                            <input
                                type="url"
                                value={entregaImagem}
                                onChange={(event) => setEntregaImagem(event.target.value)}
                                placeholder="https://..."
                            />
                        </label>
                        {erroEntrega && <p className="equipe-entrega-erro" role="alert">{erroEntrega}</p>}
                        <div className="equipe-entrega-acoes">
                            <button type="button" onClick={() => setEntregaEquipeId(null)}>Cancelar</button>
                            <button type="submit" disabled={enviando === entregaEquipeId}>
                                {enviando === entregaEquipeId ? 'Enviando...' : 'Salvar entrega'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </main>
    )
}
