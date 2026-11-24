import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Select } from '../../components/select/Select'
import {
    buscarEvento,
    buscarFuncoes,
    inscreverEquipe,
    type EquipeApi,
    type EventoApi,
    type FuncaoApi,
    type ModeloEquipeApi
} from '../../services/eventos'
import { buscarUsuarios, type UsuarioResumoApi } from '../../services/usuarios'
import { enviarImagemParaCloudinary } from '../../services/uploads'
import './Inscricao.css'

type Experiencia = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'
type Midia = 'banner' | 'avatar'

type IntegranteForm = {
    nomeUsuario: string
    funcao: string
    avatar: string
}

const EXPERIENCIAS: Array<{ valor: Experiencia; rotulo: string }> = [
    { valor: 'INICIANTE', rotulo: 'Iniciante' },
    { valor: 'INTERMEDIARIO', rotulo: 'Intermediário' },
    { valor: 'AVANCADO', rotulo: 'Avançado' }
]

const MODELOS: Array<{ valor: ModeloEquipeApi; titulo: string; descricao: string }> = [
    {
        valor: 'COMUM',
        titulo: 'Equipe Comum',
        descricao: 'Crie sua própria equipe e convide seus amigos para participarem juntos. Você poderá definir o nome da equipe e organizar como cada integrante contribuirá para o desenvolvimento do jogo.'
    },
    {
        valor: 'SURPRESA',
        titulo: 'Equipe Surpresa',
        descricao: 'Entre na Game Jam sozinho e deixe a Huby cuidar do resto! Você será colocado aleatoriamente em uma equipe com outros participantes, criando uma oportunidade para conhecer novas pessoas e desenvolver um jogo em conjunto.'
    },
    {
        valor: 'INDIVIDUAL',
        titulo: 'Individual',
        descricao: 'Prefere trabalhar por conta própria? Participe sozinho e tenha total liberdade para desenvolver seu próprio jogo, controlando o processo criativo e enfrentando o desafio da Game Jam no seu próprio ritmo.'
    }
]

const TAMANHO_PADRAO = 4
const NOME_MAX = 50
const NOME_MIN = 3
const INTEGRANTES_MIN = 2

function usuarioLogado(): { id: string; username: string; avatar: string } {
    try {
        const dados = localStorage.getItem('huby_user')
        if (!dados) return { id: '', username: '', avatar: '' }

        const usuario = JSON.parse(dados) as { id?: string; username?: string; login?: string; avatarUrl?: string }
        const username = (usuario.username || usuario.login || '').replace(/^[@#]+/, '')

        return { id: usuario.id || '', username, avatar: usuario.avatarUrl || '' }
    } catch {
        return { id: '', username: '', avatar: '' }
    }
}

function limparUsuario(valor: string) {
    return valor.trim().replace(/^[@#]+/, '')
}

function novoIntegrante(nomeUsuario = '', avatar = ''): IntegranteForm {
    return { nomeUsuario, funcao: '', avatar }
}

function linhasIniciais(maximo: number) {
    return Math.min(INTEGRANTES_MIN, Math.max(1, maximo))
}

function AvatarNeutro({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`inscricao-avatar-neutro ${className}`.trim()}
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="16" cy="11.6" r="5.2" fill="currentColor" />
            <path d="M5.6 27.2c0-5.6 4.7-9.2 10.4-9.2s10.4 3.6 10.4 9.2z" fill="currentColor" />
        </svg>
    )
}

export function InscricaoEvento() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [evento, setEvento] = useState<EventoApi | null>(null)
    const [funcoes, setFuncoes] = useState<FuncaoApi[]>([])
    const [usuarios, setUsuarios] = useState<UsuarioResumoApi[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erroCarga, setErroCarga] = useState<string | null>(null)
    const [tentativa, setTentativa] = useState(0)

    const [nomeEquipe, setNomeEquipe] = useState('')
    const [criadorId, setCriadorId] = useState('')
    const [experiencia, setExperiencia] = useState<Experiencia | ''>('')
    const [abertaParaSolicitacoes, setAbertaParaSolicitacoes] = useState(false)
    const [integrantes, setIntegrantes] = useState<IntegranteForm[]>([])
    const [campoFocado, setCampoFocado] = useState<number | null>(null)

    const [bannerEquipe, setBannerEquipe] = useState('')
    const [avatarEquipe, setAvatarEquipe] = useState('')
    const [enviandoMidia, setEnviandoMidia] = useState<Midia | null>(null)
    const [erroImagem, setErroImagem] = useState<string | null>(null)
    const bannerRef = useRef<HTMLInputElement | null>(null)
    const avatarRef = useRef<HTMLInputElement | null>(null)

    const [enviando, setEnviando] = useState(false)
    const [erroForm, setErroForm] = useState<string | null>(null)
    const [equipeCriada, setEquipeCriada] = useState<EquipeApi | null>(null)

    useEffect(() => {
        if (!id) return

        const controller = new AbortController()

        setCarregando(true)
        setErroCarga(null)

        Promise.all([
            buscarEvento(id, controller.signal),
            buscarFuncoes(controller.signal),
            buscarUsuarios(controller.signal).catch(() => [] as UsuarioResumoApi[])
        ])
            .then(([eventoApi, funcoesApi, usuariosApi]) => {
                if (controller.signal.aborted) return

                setEvento(eventoApi)
                setFuncoes(funcoesApi)
                setUsuarios(usuariosApi)

                const eu = usuarioLogado()
                const euCadastrado = usuariosApi.find((usuario) => (
                    usuario.username.toLowerCase() === eu.username.toLowerCase()
                ))
                const avatarEu = euCadastrado?.avatarUrl || eu.avatar

                setCriadorId(eu.id || euCadastrado?.id || '')

                const modeloEvento = eventoApi.modeloEquipe ?? 'COMUM'
                const quantidade = modeloEvento === 'COMUM'
                    ? linhasIniciais(Math.max(INTEGRANTES_MIN, eventoApi.tamanhoEquipe ?? TAMANHO_PADRAO))
                    : 1

                setIntegrantes(Array.from({ length: quantidade }, (_, indice) => (
                    novoIntegrante(indice === 0 ? eu.username : '', indice === 0 ? avatarEu : '')
                )))
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar a inscrição.')
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false)
            })

        return () => controller.abort()
    }, [id, tentativa])

    const maximoIntegrantes = Math.max(INTEGRANTES_MIN, evento?.tamanhoEquipe ?? TAMANHO_PADRAO)
    const modeloAtual = MODELOS.find((item) => item.valor === (evento?.modeloEquipe ?? 'COMUM')) ?? MODELOS[0]
    const modelo = modeloAtual.valor
    const minimoIntegrantes = modelo === 'COMUM' ? INTEGRANTES_MIN : 1

    const avatarDoGrupo = avatarEquipe

    const alterarIntegrante = (indice: number, parcial: Partial<IntegranteForm>) => {
        setIntegrantes((lista) => lista.map((integrante, posicao) => (
            posicao === indice ? { ...integrante, ...parcial } : integrante
        )))
    }

    const alterarUsuario = (indice: number, valor: string) => {
        const usuario = limparUsuario(valor)
        const cadastrado = usuarios.find((item) => item.username.toLowerCase() === usuario.toLowerCase())

        alterarIntegrante(indice, { nomeUsuario: usuario, avatar: cadastrado?.avatarUrl ?? '' })
    }

    const selecionarSugestao = (indice: number, usuario: UsuarioResumoApi) => {
        alterarIntegrante(indice, { nomeUsuario: usuario.username, avatar: usuario.avatarUrl })
        setCampoFocado(null)
    }

    const sugestoesPara = (indice: number): UsuarioResumoApi[] => {
        const termo = limparUsuario(integrantes[indice]?.nomeUsuario ?? '').toLowerCase()
        if (!termo) return []

        const ocupados = new Set(integrantes
            .filter((_, posicao) => posicao !== indice)
            .map((integrante) => limparUsuario(integrante.nomeUsuario).toLowerCase())
            .filter(Boolean))

        return usuarios
            .filter((usuario) => {
                const username = usuario.username.toLowerCase()
                if (!username || ocupados.has(username)) return false
                return username.includes(termo) || usuario.nomeExibicao.toLowerCase().includes(termo)
            })
            .sort((a, b) => {
                const aComeca = a.username.toLowerCase().startsWith(termo) ? 0 : 1
                const bComeca = b.username.toLowerCase().startsWith(termo) ? 0 : 1
                return aComeca - bComeca || a.username.localeCompare(b.username)
            })
            .slice(0, 5)
    }

    const adicionarIntegrante = () => {
        setIntegrantes((lista) => (lista.length >= maximoIntegrantes ? lista : [...lista, novoIntegrante()]))
    }

    const removerIntegrante = (indice: number) => {
        setIntegrantes((lista) => (lista.length <= minimoIntegrantes
            ? lista
            : lista.filter((_, posicao) => posicao !== indice)))
    }

    const abrirBanner = () => {
        if (!enviandoMidia) bannerRef.current?.click()
    }

    const abrirAvatar = () => {
        if (!enviandoMidia) avatarRef.current?.click()
    }

    const enviarArquivo = async (tipo: Midia, event: ChangeEvent<HTMLInputElement>) => {
        const arquivo = event.target.files?.[0]
        event.target.value = ''
        if (!arquivo) return

        if (!arquivo.type.startsWith('image/')) {
            setErroImagem('Escolha um arquivo de imagem (JPG, PNG ou WebP).')
            return
        }

        setEnviandoMidia(tipo)
        setErroImagem(null)

        try {
            const url = await enviarImagemParaCloudinary(
                arquivo,
                tipo === 'banner' ? 'huby/equipes/banners' : 'huby/equipes/avatares'
            )

            if (tipo === 'banner') setBannerEquipe(url)
            else setAvatarEquipe(url)
        } catch (error) {
            setErroImagem(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.')
        } finally {
            setEnviandoMidia(null)
        }
    }

    const validar = (): string | null => {
        if (modelo === 'COMUM') {
            const nome = nomeEquipe.trim()
            if (nome.length < NOME_MIN || nome.length > NOME_MAX) {
                return `O nome da equipe deve ter entre ${NOME_MIN} e ${NOME_MAX} caracteres.`
            }
        }

        if (integrantes.length < minimoIntegrantes) {
            return `A equipe precisa de pelo menos ${minimoIntegrantes} integrante${minimoIntegrantes > 1 ? 's' : ''}.`
        }

        const vistos = new Set<string>()

        for (let indice = 0; indice < integrantes.length; indice += 1) {
            const integrante = integrantes[indice]
            const usuario = limparUsuario(integrante.nomeUsuario)

            if (usuario.length < 2) {
                return `Informe o @ do integrante ${indice + 1}.`
            }
            if (usuarios.length > 0 && !usuarios.some((item) => item.username.toLowerCase() === usuario.toLowerCase())) {
                return `O usuário @${usuario} não foi encontrado na Huby.`
            }
            if (!integrante.funcao) {
                return `Escolha a função do integrante ${indice + 1}.`
            }
            if (vistos.has(usuario.toLowerCase())) {
                return 'Cada integrante precisa ter um usuário diferente.'
            }

            vistos.add(usuario.toLowerCase())
        }

        if (!experiencia) {
            return 'Escolha a experiência da equipe.'
        }

        return null
    }

    const enviar = async (event: FormEvent) => {
        event.preventDefault()
        if (!id || !evento) return

        const erroValidacao = validar()
        if (erroValidacao) {
            setErroForm(erroValidacao)
            return
        }

        setEnviando(true)
        setErroForm(null)

        try {
            const criada = await inscreverEquipe(id, {
                nome: modelo === 'COMUM' ? nomeEquipe.trim() : '',
                experiencia: experiencia as Experiencia,
                imagem: bannerEquipe || undefined,
                avatar: avatarEquipe || undefined,
                criadorId: criadorId || undefined,
                abertaParaSolicitacoes: modelo === 'SURPRESA' ? true : modelo === 'COMUM' ? abertaParaSolicitacoes : false,
                integrantes: integrantes.map((integrante) => ({
                    nomeUsuario: limparUsuario(integrante.nomeUsuario),
                    funcao: integrante.funcao
                }))
            })

            setEquipeCriada(criada)
        } catch (error) {
            setErroForm(error instanceof Error ? error.message : 'Não foi possível inscrever a equipe.')
        } finally {
            setEnviando(false)
        }
    }

    if (carregando) {
        return (
            <main className="inscricao">
                <div className="inscricao-carregando" aria-hidden="true">
                    <div className="inscricao-esqueleto-faixa" />
                    <div className="inscricao-esqueleto-painel" />
                </div>
            </main>
        )
    }

    if (erroCarga || !evento) {
        return (
            <main className="inscricao">
                <div className="inscricao-estado" role="alert">
                    <p>{erroCarga ?? 'Evento não encontrado.'}</p>
                    <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button>
                    <button type="button" className="is-secundaria" onClick={() => navigate('/eventos')}>Voltar aos eventos</button>
                </div>
            </main>
        )
    }

    if (equipeCriada) {
        const modeloCriado = MODELOS.find((item) => item.valor === (equipeCriada.modelo ?? modelo))
        const avatarSucesso = equipeCriada.avatar || ''

        return (
            <main className="inscricao">
                <header className="inscricao-topo">
                    <button type="button" className="inscricao-voltar" onClick={() => navigate('/eventos')} aria-label="Voltar">‹</button>
                    <span>Inscrição Evento</span>
                </header>

                <section className="inscricao-sucesso">
                    {(equipeCriada.imagem || avatarSucesso) && (
                        <div className="inscricao-sucesso-midia">
                            <div className="inscricao-sucesso-imagem">
                                {equipeCriada.imagem && (
                                    <img src={equipeCriada.imagem} alt={`Banner de ${equipeCriada.nome}`} />
                                )}
                            </div>

                            <span className="inscricao-sucesso-avatar">
                                {avatarSucesso
                                    ? <img src={avatarSucesso} alt={`Foto de perfil de ${equipeCriada.nome}`} />
                                    : <AvatarNeutro />}
                            </span>
                        </div>
                    )}

                    <h1>Equipe inscrita!</h1>
                    <p>
                        <strong>{equipeCriada.nome}</strong> está confirmada em {evento.titulo}.
                    </p>
                    {modeloCriado && <p className="inscricao-sucesso-modelo">Modelo: {modeloCriado.titulo}</p>}

                    <ul>
                        {equipeCriada.integrantes.map((integrante) => (
                            <li key={integrante.nomeUsuario}>
                                <span className="inscricao-sucesso-integrante">
                                    {integrante.avatar
                                        ? <img src={integrante.avatar} alt="" />
                                        : <span className="inscricao-sucesso-integrante-neutro"><AvatarNeutro /></span>}
                                    <span>@{integrante.nomeUsuario}</span>
                                </span>
                                <small>
                                    {integrante.funcao}
                                    {integrante.status === 'PENDENTE' && ' · convite enviado'}
                                    {integrante.status === 'RECUSADO' && ' · recusou'}
                                </small>
                            </li>
                        ))}
                    </ul>

                    {equipeCriada.integrantes.some((integrante) => integrante.status === 'PENDENTE') && (
                        <p className="inscricao-sucesso-convites">
                            Enviamos um convite no chat dos integrantes convidados. Eles entram na equipe somente
                            depois de aceitar.
                        </p>
                    )}

                    {equipeCriada.abertaParaSolicitacoes && (
                        <p className="inscricao-sucesso-aberta">
                            Sua equipe está aberta para receber solicitações de novos integrantes.
                        </p>
                    )}

                    <button type="button" onClick={() => navigate('/eventos')}>Voltar para eventos</button>
                </section>
            </main>
        )
    }

    const podeAdicionar = modelo === 'COMUM' && integrantes.length < maximoIntegrantes
    const podeRemover = integrantes.length > minimoIntegrantes

    return (
        <main className="inscricao">
            <header className="inscricao-topo">
                <button type="button" className="inscricao-voltar" onClick={() => navigate(-1)} aria-label="Voltar">‹</button>
                <span>Inscrição Evento</span>
            </header>

            <div className="inscricao-faixa">
                <h1>{evento.titulo}</h1>
                <div className="inscricao-tags">
                    <span>{evento.tipo === 'GAME_JAM' ? 'Game Jam' : 'Evento'}</span>
                    <span>{modeloAtual.titulo}</span>
                </div>
            </div>

            <form className="inscricao-painel" onSubmit={enviar}>
                <div className="inscricao-modelo">
                    <strong>Modelo: {modeloAtual.titulo}</strong>
                    <p>{modeloAtual.descricao}</p>
                </div>

                {modelo === 'COMUM' && (
                    <>
                        <button
                            type="button"
                            className={`inscricao-encontrar ${abertaParaSolicitacoes ? 'is-ativo' : ''}`}
                            aria-pressed={abertaParaSolicitacoes}
                            onClick={() => setAbertaParaSolicitacoes((valor) => !valor)}
                        >
                            {abertaParaSolicitacoes ? 'Equipe aberta para solicitações' : 'Encontrar Integrantes'}
                        </button>

                        <p className="inscricao-nota">
                            O botão "Encontrar Integrantes" permite que pessoas interessadas em participar da sua
                            equipe enviem uma solicitação para entrar nela.
                        </p>
                    </>
                )}

                {modelo === 'SURPRESA' && (
                    <p className="inscricao-nota">
                        Na equipe surpresa a Huby sorteia os integrantes por você. Basta confirmar sua inscrição
                        com o seu perfil e a função que deseja exercer.
                    </p>
                )}

                {modelo === 'INDIVIDUAL' && (
                    <p className="inscricao-nota">
                        Na inscrição individual você desenvolve o projeto sozinho. Confirme seu perfil e a função
                        para garantir sua vaga na jam.
                    </p>
                )}

                <div className="inscricao-midia">
                    <input
                        ref={bannerRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => enviarArquivo('banner', event)}
                    />
                    <input
                        ref={avatarRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => enviarArquivo('avatar', event)}
                    />

                    <button
                        type="button"
                        className="inscricao-midia-area"
                        onClick={abrirBanner}
                        aria-label={bannerEquipe ? 'Alterar banner da equipe' : 'Adicionar banner da equipe'}
                        aria-busy={enviandoMidia === 'banner'}
                    >
                        {bannerEquipe
                            ? <img src={bannerEquipe} alt={`Banner de ${nomeEquipe.trim() || 'sua equipe'}`} />
                            : <span className="inscricao-midia-mais" aria-hidden="true">+</span>}

                        {enviandoMidia === 'banner' && <span className="inscricao-midia-status">Enviando banner...</span>}
                    </button>

                    <button
                        type="button"
                        className={`inscricao-midia-botao ${avatarDoGrupo ? 'tem-foto' : 'sem-foto'}`}
                        onClick={abrirAvatar}
                        aria-label={avatarDoGrupo ? 'Alterar foto de perfil da equipe' : 'Adicionar foto de perfil da equipe'}
                        aria-busy={enviandoMidia === 'avatar'}
                        disabled={Boolean(enviandoMidia)}
                    >
                        {enviandoMidia === 'avatar'
                            ? <span className="inscricao-midia-girando" aria-hidden="true" />
                            : avatarDoGrupo
                                ? <img src={avatarDoGrupo} alt="" />
                                : <AvatarNeutro />}

                        {enviandoMidia !== 'avatar' && (
                            <span className="inscricao-midia-botao-mais" aria-hidden="true">+</span>
                        )}
                    </button>
                </div>

                {erroImagem && <p className="inscricao-erro-imagem" role="alert">{erroImagem}</p>}

                {modelo === 'COMUM' && (
                    <label className="inscricao-bloco-nome">
                        <span>Nome da Equipe</span>
                        <span className="inscricao-input">
                            <input
                                type="text"
                                value={nomeEquipe}
                                maxLength={NOME_MAX}
                                onChange={(event) => setNomeEquipe(event.target.value)}
                                placeholder="Nome da equipe..."
                            />
                            <small>{nomeEquipe.length}/{NOME_MAX}</small>
                        </span>
                    </label>
                )}

                <div className="inscricao-integrantes">
                    <span className="inscricao-subtitulo">
                        {modelo === 'COMUM'
                            ? `Integrantes (de ${minimoIntegrantes} a ${maximoIntegrantes})`
                            : 'Seu perfil'}
                    </span>

                    {integrantes.map((integrante, indice) => {
                        const sugestoes = campoFocado === indice ? sugestoesPara(indice) : []

                        return (
                            <div className={`inscricao-integrante ${podeRemover ? 'tem-remover' : ''}`} key={indice}>
                                {integrante.avatar
                                    ? <img className="inscricao-avatar" src={integrante.avatar} alt="" />
                                    : <span className="inscricao-avatar is-neutro" aria-hidden="true" />}

                                <div className="inscricao-campo-bloco">
                                    <span className={`inscricao-campo ${integrante.nomeUsuario ? 'is-preenchido' : ''}`}>
                                        <input
                                            type="text"
                                            value={integrante.nomeUsuario}
                                            maxLength={30}
                                            aria-label={`Usuário do integrante ${indice + 1}`}
                                            placeholder="Nome de usuário."
                                            role="combobox"
                                            aria-autocomplete="list"
                                            aria-expanded={sugestoes.length > 0}
                                            onChange={(event) => alterarUsuario(indice, event.target.value)}
                                            onFocus={() => setCampoFocado(indice)}
                                            onBlur={() => window.setTimeout(() => setCampoFocado(null), 120)}
                                        />
                                    </span>

                                    {sugestoes.length > 0 && (
                                        <ul className="inscricao-sugestoes" role="listbox" aria-label={`Usuários encontrados para o integrante ${indice + 1}`}>
                                            {sugestoes.map((usuario) => (
                                                <li key={usuario.id}>
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        aria-selected={false}
                                                        onMouseDown={(event) => event.preventDefault()}
                                                        onClick={() => selecionarSugestao(indice, usuario)}
                                                    >
                                                        {usuario.avatarUrl
                                                            ? <img className="inscricao-sugestao-avatar" src={usuario.avatarUrl} alt="" />
                                                            : <span className="inscricao-sugestao-avatar is-neutro"><AvatarNeutro /></span>}

                                                        <span className="inscricao-sugestao-id">@{usuario.username}</span>
                                                        {usuario.nomeExibicao && (
                                                            <small className="inscricao-sugestao-nome">{usuario.nomeExibicao}</small>
                                                        )}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <Select
                                    className="inscricao-select"
                                    ariaLabel={`Função do integrante ${indice + 1}`}
                                    placeholder="Função"
                                    value={integrante.funcao}
                                    onChange={(funcao) => alterarIntegrante(indice, { funcao })}
                                    options={funcoes.map((funcao) => ({ value: funcao.nome, label: funcao.nome }))}
                                />

                                {podeRemover && (
                                    <button
                                        type="button"
                                        className="inscricao-remover"
                                        onClick={() => removerIntegrante(indice)}
                                        aria-label={`Remover integrante ${indice + 1}`}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        )
                    })}

                    {podeAdicionar && (
                        <button
                            type="button"
                            className="inscricao-adicionar"
                            onClick={adicionarIntegrante}
                            aria-label="Adicionar integrante"
                        >
                            +
                        </button>
                    )}
                </div>

                <div className="inscricao-experiencia">
                    <span className="inscricao-subtitulo">Experiência da Equipe</span>

                    <div className="inscricao-experiencia-opcoes">
                        {EXPERIENCIAS.map((opcao) => (
                            <button
                                key={opcao.valor}
                                type="button"
                                className={experiencia === opcao.valor ? 'is-ativo' : ''}
                                aria-pressed={experiencia === opcao.valor}
                                onClick={() => setExperiencia(opcao.valor)}
                            >
                                {opcao.rotulo}
                            </button>
                        ))}
                    </div>
                </div>

                {erroForm && <p className="inscricao-erro" role="alert">{erroForm}</p>}

                <button type="submit" className="inscricao-enviar" disabled={enviando}>
                    {enviando ? 'Inscrevendo...' : 'Confirmar Inscrição'}
                </button>
            </form>

            <section className="inscricao-modelos" aria-label="Modelos de inscrição">
                <p className="inscricao-modelos-nota">
                    O modelo de equipe é definido pela organização da game jam. Você segue o modelo já escolhido.
                </p>

                {MODELOS.map((opcao) => (
                    <div
                        key={opcao.valor}
                        className={`inscricao-modelo-card ${modelo === opcao.valor ? 'is-ativo' : ''}`}
                        aria-current={modelo === opcao.valor ? 'true' : undefined}
                    >
                        {modelo === opcao.valor && <span className="inscricao-modelo-selo">Modelo desta jam</span>}
                        <strong>Modelo: {opcao.titulo}</strong>
                        <p>{opcao.descricao}</p>
                    </div>
                ))}
            </section>
        </main>
    )
}
