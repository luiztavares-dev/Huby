import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Select } from '../../components/select/Select'
import {
    buscarEquipes,
    buscarEvento,
    buscarFuncoes,
    buscarMeusPedidos,
    buscarProcurandoEquipe,
    chavePedidoEquipe,
    enviarPedidoParaPerfil,
    removerProcurandoEquipe,
    salvarProcurandoEquipe,
    type EquipeApi,
    type EventoApi,
    type FuncaoApi,
    type PerfilProcurandoEquipeApi
} from '../../services/eventos'
import { usuarioLogado } from '../../services/sessao'
import { useStatusPedidos } from './useStatusPedidos'
import './ProcurandoEquipe.css'

const TAMANHO_PADRAO = 4
const DESCRICAO_MIN = 10
const DESCRICAO_MAX = 600

function dataHoje() {
    const hoje = new Date()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    return `${hoje.getFullYear()}-${mes}-${dia}`
}

function inscricoesAbertas(evento?: EventoApi | null) {
    if (!evento) return false
    const hoje = dataHoje()
    if (evento.inscricoesAte && hoje > evento.inscricoesAte) return false
    if (evento.dataInicio && hoje > evento.dataInicio) return false
    return true
}

function rotuloModelo(modelo?: string | null) {
    if (modelo === 'SURPRESA') return 'Equipe surpresa'
    if (modelo === 'INDIVIDUAL') return 'Individual'
    return 'Equipe comum'
}

function AvatarNeutro() {
    return (
        <svg className="procurando-avatar-neutro" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <circle cx="16" cy="11.6" r="5.2" fill="currentColor" />
            <path d="M5.6 27.2c0-5.6 4.7-9.2 10.4-9.2s10.4 3.6 10.4 9.2z" fill="currentColor" />
        </svg>
    )
}

function IconeEditar() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
        </svg>
    )
}

function IconeLixeira() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    )
}

function IconeEnviar() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    )
}

export function ProcurandoEquipe() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [evento, setEvento] = useState<EventoApi | null>(null)
    const [perfis, setPerfis] = useState<PerfilProcurandoEquipeApi[]>([])
    const [funcoes, setFuncoes] = useState<FuncaoApi[]>([])
    const [equipes, setEquipes] = useState<EquipeApi[]>([])
    const [usuario, setUsuario] = useState(() => usuarioLogado())
    const [carregando, setCarregando] = useState(true)
    const [erroCarga, setErroCarga] = useState<string | null>(null)
    const [tentativa, setTentativa] = useState(0)

    const [formAberto, setFormAberto] = useState(false)
    const [funcao, setFuncao] = useState('')
    const [descricao, setDescricao] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erroForm, setErroForm] = useState<string | null>(null)
    const [confirmarRemocao, setConfirmarRemocao] = useState(false)
    const [removendo, setRemovendo] = useState(false)

    const [enviandoId, setEnviandoId] = useState<string | null>(null)
    const [aviso, setAviso] = useState<string | null>(null)
    const [erroAcao, setErroAcao] = useState<string | null>(null)
    const { statusPedidos, carregarPedidos, atualizarStatus } = useStatusPedidos(usuario.id, id)

    useEffect(() => {
        if (!id) return

        const controller = new AbortController()
        const eu = usuarioLogado()

        setCarregando(true)
        setErroCarga(null)
        setUsuario(eu)
        setFormAberto(false)
        setConfirmarRemocao(false)

        Promise.all([
            buscarEvento(id, controller.signal),
            buscarFuncoes(controller.signal),
            buscarEquipes(id, controller.signal),
            eu.id
                ? buscarMeusPedidos(eu.id, controller.signal).catch(() => [])
                : Promise.resolve([])
        ])
            .then(async ([eventoApi, funcoesApi, equipesApi, pedidosApi]) => {
                if (controller.signal.aborted) return

                const modelo = eventoApi.modeloEquipe ?? 'COMUM'
                const perfisApi = modelo === 'COMUM'
                    ? await buscarProcurandoEquipe(id, controller.signal)
                    : []

                if (controller.signal.aborted) return

                setEvento(eventoApi)
                setFuncoes(funcoesApi)
                setEquipes(equipesApi)
                setPerfis(perfisApi)
                carregarPedidos(pedidosApi.filter((pedido) => (
                    pedido.eventoId === id && pedido.origem === 'PERFIL_BUSCA'
                )))
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar a procura por equipe.')
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

    useEffect(() => {
        if (!formAberto && !confirmarRemocao) return

        const overflowAnterior = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const aoTeclar = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || salvando || removendo) return
            setFormAberto(false)
            setConfirmarRemocao(false)
        }

        window.addEventListener('keydown', aoTeclar)
        return () => {
            document.body.style.overflow = overflowAnterior
            window.removeEventListener('keydown', aoTeclar)
        }
    }, [formAberto, confirmarRemocao, salvando, removendo])

    const modelo = evento?.modeloEquipe ?? 'COMUM'
    const comum = modelo === 'COMUM'
    const capacidade = Math.max(2, evento?.tamanhoEquipe ?? TAMANHO_PADRAO)
    const periodoAberto = inscricoesAbertas(evento)
    const meuPerfil = useMemo(
        () => perfis.find((perfil) => perfil.usuarioId === usuario.id) ?? null,
        [perfis, usuario.id]
    )

    const integrantesAtivos = (equipe: EquipeApi) => (equipe.integrantes ?? []).filter(
        (integrante) => integrante.status !== 'RECUSADO'
    )

    const jaInscrito = useMemo(() => {
        if (!usuario.id || !usuario.username) return false
        return equipes.some((equipe) => (
            equipe.liderId === usuario.id
            || integrantesAtivos(equipe).some((integrante) => (
                integrante.nomeUsuario.toLowerCase() === usuario.username.toLowerCase()
            ))
        ))
    }, [equipes, usuario.id, usuario.username])

    const equipeElegivel = useMemo(() => equipes.find((equipe) => (
        equipe.liderId === usuario.id
        && (equipe.modelo ?? 'COMUM') === 'COMUM'
        && equipe.abertaParaSolicitacoes
        && integrantesAtivos(equipe).length < capacidade
    )), [equipes, usuario.id, capacidade])

    const abrirFormulario = () => {
        if (!usuario.id) {
            navigate('/login')
            return
        }
        if (!periodoAberto) {
            setErroAcao('O prazo para se cadastrar procurando equipe terminou.')
            return
        }
        if (jaInscrito) {
            setErroAcao('Você já está inscrito em uma equipe desta game jam.')
            return
        }

        setFuncao(meuPerfil?.funcao ?? '')
        setDescricao(meuPerfil?.descricao ?? '')
        setErroForm(null)
        setFormAberto(true)
    }

    const salvarPerfil = async (event: FormEvent) => {
        event.preventDefault()
        if (!id || !usuario.id) return

        const texto = descricao.trim()
        if (!funcao) {
            setErroForm('Escolha a função que você quer exercer.')
            return
        }
        if (texto.length < DESCRICAO_MIN || texto.length > DESCRICAO_MAX) {
            setErroForm(`Conte sobre você em uma descrição de ${DESCRICAO_MIN} a ${DESCRICAO_MAX} caracteres.`)
            return
        }

        setSalvando(true)
        setErroForm(null)

        try {
            const salvo = await salvarProcurandoEquipe(id, {
                usuarioId: usuario.id,
                funcao,
                descricao: texto
            })
            setPerfis((atuais) => {
                const semMeuPerfil = atuais.filter((perfil) => perfil.usuarioId !== usuario.id)
                return [salvo, ...semMeuPerfil]
            })
            setFormAberto(false)
            setAviso(meuPerfil ? 'Seu perfil de procura foi atualizado.' : 'Seu perfil está disponível para as equipes desta game jam.')
        } catch (error) {
            setErroForm(error instanceof Error ? error.message : 'Não foi possível salvar seu perfil.')
        } finally {
            setSalvando(false)
        }
    }

    const removerPerfil = async () => {
        if (!id || !usuario.id) return

        setRemovendo(true)
        setErroAcao(null)

        try {
            await removerProcurandoEquipe(id, usuario.id)
            setPerfis((atuais) => atuais.filter((perfil) => perfil.usuarioId !== usuario.id))
            setConfirmarRemocao(false)
            setFormAberto(false)
            setAviso('Seu perfil foi removido da lista de procura por equipe.')
        } catch (error) {
            setErroAcao(error instanceof Error ? error.message : 'Não foi possível remover seu perfil.')
            setConfirmarRemocao(false)
        } finally {
            setRemovendo(false)
        }
    }

    const enviarPedido = async (perfil: PerfilProcurandoEquipeApi) => {
        if (!usuario.id) {
            navigate('/login')
            return
        }
        if (!id || !equipeElegivel) {
            setErroAcao('Crie uma equipe e ative "Encontrar integrantes" para enviar pedidos.')
            return
        }

        setEnviandoId(perfil.usuarioId)
        setErroAcao(null)

        try {
            const pedido = await enviarPedidoParaPerfil(id, perfil.id, usuario.id, equipeElegivel.id)
            atualizarStatus(pedido.equipeId, pedido.destinatarioId, pedido.conviteStatus || 'PENDENTE')
            setAviso(`Pedido enviado para @${perfil.username}. Acompanhe a resposta em Mensagens.`)
        } catch (error) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível enviar o pedido.'
            setErroAcao(mensagem)
            if (mensagem.toLowerCase().includes('já enviou')) {
                atualizarStatus(equipeElegivel.id, perfil.usuarioId, 'PENDENTE')
            }
        } finally {
            setEnviandoId(null)
        }
    }

    if (carregando) {
        return (
            <main className="procurando-equipe">
                <div className="procurando-carregando" aria-hidden="true">
                    <div className="procurando-esqueleto-faixa" />
                    <div className="procurando-esqueleto-card" />
                    <div className="procurando-esqueleto-card" />
                </div>
            </main>
        )
    }

    if (erroCarga || !evento) {
        return (
            <main className="procurando-equipe">
                <div className="procurando-estado" role="alert">
                    <p>{erroCarga ?? 'Evento não encontrado.'}</p>
                    <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button>
                    <button type="button" className="is-secundaria" onClick={() => navigate('/eventos')}>Voltar aos eventos</button>
                </div>
            </main>
        )
    }

    return (
        <main className="procurando-equipe">
            <header className="procurando-topo">
                <button type="button" className="procurando-voltar" onClick={() => navigate('/eventos')} aria-label="Voltar aos eventos">
                    ‹
                </button>
                <span>Procurando equipe</span>
            </header>

            <section className="procurando-faixa">
                <h1>{evento.titulo}</h1>
                <div className="procurando-tags">
                    <span>{evento.tipo === 'GAME_JAM' ? 'Game jam' : 'Evento'}</span>
                    <span>{rotuloModelo(modelo)}</span>
                </div>
            </section>

            {!comum ? (
                <div className="procurando-estado">
                    <p>Esta game jam utiliza {rotuloModelo(modelo).toLowerCase()}, por isso não possui lista de procura por equipe.</p>
                    <button type="button" onClick={() => navigate(`/eventos/${evento.id}/inscricao`)}>Inscrever no evento</button>
                </div>
            ) : (
                <>
                    <section className="procurando-intro">
                        <button
                            type="button"
                            className={`procurando-quero ${meuPerfil ? 'is-ativo' : ''}`}
                            aria-pressed={!!meuPerfil}
                            onClick={abrirFormulario}
                            disabled={!!usuario.id && (!periodoAberto || jaInscrito)}
                        >
                            {meuPerfil ? 'Editar meu perfil' : 'Quero entrar em uma equipe'}
                        </button>
                        <p>Conte um pouco sobre você e deixe seu perfil disponível para equipes que procuram integrantes.</p>

                        {meuPerfil && (
                            <p className="procurando-intro-ativo" role="status">
                                Seu perfil está visível nesta lista para quem procura integrantes.
                            </p>
                        )}
                        {!!usuario.id && jaInscrito && (
                            <p className="procurando-intro-nota">Você já está inscrito em uma equipe desta game jam.</p>
                        )}
                        {!!usuario.id && !periodoAberto && (
                            <p className="procurando-intro-nota">O prazo de inscrição desta game jam terminou.</p>
                        )}
                        {!!usuario.id && !jaInscrito && periodoAberto && !equipeElegivel && (
                            <div className="procurando-orientacao">
                                <p>Para enviar pedidos, você precisa liderar uma equipe aberta para encontrar integrantes.</p>
                                <button type="button" onClick={() => navigate(`/eventos/${evento.id}/inscricao`)}>
                                    Inscrever equipe
                                </button>
                            </div>
                        )}
                    </section>

                    {aviso && <p className="procurando-aviso" role="status">{aviso}</p>}
                    {erroAcao && <p className="procurando-erro-acao" role="alert">{erroAcao}</p>}

                    {perfis.length === 0 ? (
                        <div className="procurando-estado">
                            <p>Ninguém está procurando equipe nesta game jam ainda.</p>
                            <button type="button" onClick={abrirFormulario}>Quero entrar em uma equipe</button>
                        </div>
                    ) : (
                        <div className="procurando-lista">
                            {perfis.map((perfil) => {
                                const proprio = perfil.usuarioId === usuario.id
                                const chavePedido = chavePedidoEquipe(equipeElegivel?.id, perfil.usuarioId)
                                const statusPedido = chavePedido ? statusPedidos.get(chavePedido) : undefined
                                const pedidoBloqueado = statusPedido === 'PENDENTE' || statusPedido === 'ACEITO'
                                const desabilitado = !!usuario.id && (
                                    pedidoBloqueado || !equipeElegivel || !periodoAberto || enviandoId === perfil.usuarioId
                                )
                                const textoBotao = statusPedido === 'PENDENTE'
                                    ? 'Pedido enviado'
                                    : statusPedido === 'ACEITO'
                                        ? 'Pedido aceito'
                                        : statusPedido === 'RECUSADO'
                                            ? 'Enviar novamente'
                                            : enviandoId === perfil.usuarioId
                                                ? 'Enviando...'
                                                : !usuario.id
                                                    ? 'Entrar para enviar pedido'
                                                    : 'Enviar pedido'

                                return (
                                    <article className={`procurando-card ${proprio ? 'is-proprio' : ''}`} key={perfil.id}>
                                        <div className="procurando-card-capa">
                                            {perfil.bannerUrl
                                                ? <img src={perfil.bannerUrl} alt="" referrerPolicy="no-referrer" />
                                                : <span className="procurando-capa-vazia" aria-hidden="true" />}
                                            <span className="procurando-card-avatar">
                                                {perfil.avatarUrl
                                                    ? <img src={perfil.avatarUrl} alt="" referrerPolicy="no-referrer" />
                                                    : <AvatarNeutro />}
                                            </span>
                                        </div>

                                        <div className="procurando-card-corpo">
                                            <div className="procurando-card-cabecalho">
                                                <button
                                                    type="button"
                                                    className="procurando-card-perfil"
                                                    onClick={() => navigate(`/perfil/${perfil.usuarioId}`)}
                                                    title={`Ver perfil de @${perfil.username}`}
                                                >
                                                    <strong>@{perfil.username}</strong>
                                                    <span>{perfil.nomeExibicao}</span>
                                                </button>

                                                <span className="procurando-card-funcao">{perfil.funcao}</span>

                                            </div>

                                            <p className="procurando-card-descricao">{perfil.descricao}</p>

                                            {proprio && (
                                                <div className="procurando-card-ferramentas">
                                                    <div className="procurando-card-controles">
                                                        <button type="button" onClick={abrirFormulario} aria-label="Editar meu perfil" title="Editar perfil">
                                                            <IconeEditar />
                                                        </button>
                                                        <button type="button" onClick={() => setConfirmarRemocao(true)} aria-label="Remover meu perfil" title="Remover perfil">
                                                            <IconeLixeira />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {!proprio && (
                                            <button
                                                type="button"
                                                className={`procurando-card-pedido ${pedidoBloqueado ? 'is-enviado' : ''}`}
                                                onClick={() => enviarPedido(perfil)}
                                                disabled={desabilitado}
                                                title={!equipeElegivel && usuario.id
                                                    ? 'Lidere uma equipe aberta para encontrar integrantes.'
                                                    : undefined}
                                            >
                                                <span>{textoBotao}</span>
                                                <span className="procurando-card-pedido-icone"><IconeEnviar /></span>
                                            </button>
                                        )}
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </>
            )}

            {formAberto && (
                <div className="procurando-modal-fundo" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !salvando) setFormAberto(false)
                }}>
                    <form className="procurando-form" onSubmit={salvarPerfil} role="dialog" aria-modal="true" aria-labelledby="procurando-form-titulo">
                        <h2 id="procurando-form-titulo">{meuPerfil ? 'Editar meu perfil' : 'Quero entrar em uma equipe'}</h2>
                        <p>Escolha sua função e conte um pouco sobre sua experiência para as equipes.</p>

                        <label>
                            Função
                            <Select
                                className="procurando-select"
                                ariaLabel="Função desejada"
                                placeholder="Escolha sua função"
                                value={funcao}
                                onChange={setFuncao}
                                options={funcoes.map((item) => ({ value: item.nome, label: item.nome }))}
                            />
                        </label>

                        <label>
                            Descrição
                            <textarea
                                value={descricao}
                                onChange={(event) => setDescricao(event.target.value)}
                                maxLength={DESCRICAO_MAX}
                                placeholder="Fale sobre suas habilidades, experiências e o que você gosta de criar."
                                rows={5}
                            />
                            <span className="procurando-form-contador">{descricao.length}/{DESCRICAO_MAX}</span>
                        </label>

                        {erroForm && <p className="procurando-form-erro" role="alert">{erroForm}</p>}

                        <div className="procurando-form-acoes">
                            <button type="button" onClick={() => setFormAberto(false)} disabled={salvando}>Cancelar</button>
                            <button type="submit" disabled={salvando}>
                                {salvando ? 'Salvando...' : meuPerfil ? 'Salvar alterações' : 'Publicar perfil'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {confirmarRemocao && (
                <div className="procurando-modal-fundo" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !removendo) setConfirmarRemocao(false)
                }}>
                    <div className="procurando-confirmacao" role="alertdialog" aria-modal="true" aria-labelledby="procurando-remover-titulo">
                        <h2 id="procurando-remover-titulo">Remover meu perfil?</h2>
                        <p>Você não aparecerá mais na lista de pessoas procurando equipe desta game jam.</p>
                        <div className="procurando-form-acoes">
                            <button type="button" onClick={() => setConfirmarRemocao(false)} disabled={removendo}>Cancelar</button>
                            <button type="button" className="is-perigo" onClick={removerPerfil} disabled={removendo}>
                                {removendo ? 'Removendo...' : 'Remover perfil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
