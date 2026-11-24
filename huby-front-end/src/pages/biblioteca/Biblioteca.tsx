import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import GameDetails, { type Game } from '../../components/gameDetails/GameDetails'
import BarraDePesquisa from '../../components/searchBar/SearchBar'
import { Select } from '../../components/select/Select'
import { buscarJogos, linkJogoValido, type ConteudoApi } from '../../services/home'
import { buscarBiblioteca, buscarCompras, comprarJogo, removerBiblioteca } from '../../services/usuarios'
import { usuarioLogado } from '../../services/sessao'
import './Biblioteca.css'

type FiltroBiblioteca = 'todos' | 'gratuitos' | 'pagos'
type OrdemBiblioteca = 'recentes' | 'nome' | 'nota'

const plataformasValidas = new Set(['website', 'mobile', 'pc'])
const plataformasLabels: Record<'website' | 'mobile' | 'pc', string> = {
    website: 'Navegador',
    mobile: 'Celular',
    pc: 'PC'
}

const normalizarTexto = (valor: string) => valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const formatarPreco = (valor: number) => valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
})

function paraGame(jogo: ConteudoApi): Game {
    return {
        id: jogo.id,
        tipo: jogo.tipo,
        title: jogo.titulo,
        description: jogo.descricao,
        longDescription: jogo.descricaoLonga,
        developer: jogo.desenvolvedor,
        image: jogo.imagem,
        tags: jogo.tags ?? [],
        score: jogo.nota ?? 0,
        reviews: jogo.avaliacoes ?? 0,
        preco: jogo.preco ?? 0,
        platforms: (jogo.plataformas ?? []).filter(
            (plataforma): plataforma is 'website' | 'mobile' | 'pc' => plataformasValidas.has(plataforma)
        ),
        linkUrl: linkJogoValido(jogo.linkUrl),
        comentarios: jogo.comentarios ?? [],
        dataInicio: jogo.dataInicio,
        dataFim: jogo.dataFim,
        participantes: jogo.participantes,
        local: jogo.local
    }
}

export function Biblioteca() {
    const [usuario] = useState(() => usuarioLogado())
    const [jogos, setJogos] = useState<ConteudoApi[]>([])
    const [comprasIds, setComprasIds] = useState<Set<string>>(() => new Set())
    const [carregando, setCarregando] = useState(() => Boolean(usuario.id))
    const [erro, setErro] = useState<string | null>(null)
    const [tentativa, setTentativa] = useState(0)
    const [busca, setBusca] = useState('')
    const [filtro, setFiltro] = useState<FiltroBiblioteca>('todos')
    const [ordem, setOrdem] = useState<OrdemBiblioteca>('recentes')
    const [filtrosAbertos, setFiltrosAbertos] = useState(true)
    const [removendoId, setRemovendoId] = useState<string | null>(null)
    const [comprandoId, setComprandoId] = useState<string | null>(null)
    const [aviso, setAviso] = useState<string | null>(null)
    const [jogoSelecionado, setJogoSelecionado] = useState<ConteudoApi | null>(null)
    const [detalheAberto, setDetalheAberto] = useState(false)

    useEffect(() => {
        const controller = new AbortController()

        if (!usuario.id) return

        Promise.all([
            buscarBiblioteca(usuario.id, controller.signal),
            buscarCompras(usuario.id, controller.signal),
            buscarJogos(controller.signal)
        ]).then(([ids, compras, lista]) => {
            const porId = new Map(lista.map((jogo) => [jogo.id, jogo]))
            const idsUnicos = [...new Set([...ids, ...compras])]
            setComprasIds(new Set(compras))
            setJogos(idsUnicos
                .map((id) => porId.get(id))
                .filter((jogo): jogo is ConteudoApi => Boolean(jogo)))
        })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                    setErro(error instanceof Error ? error.message : 'Não foi possível carregar sua biblioteca.')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false)
            })

        return () => controller.abort()
    }, [usuario.id, tentativa])

    const gratuitos = useMemo(
        () => jogos.filter((jogo) => (jogo.preco ?? 0) === 0),
        [jogos]
    )
    const pagos = useMemo(
        () => jogos.filter((jogo) => (jogo.preco ?? 0) > 0),
        [jogos]
    )

    const jogosVisiveis = useMemo(() => {
        const termo = normalizarTexto(busca)
        const filtrados = jogos.filter((jogo) => {
            const preco = jogo.preco ?? 0
            const correspondePreco = filtro === 'todos'
                || (filtro === 'gratuitos' && preco === 0)
                || (filtro === 'pagos' && preco > 0)
            const texto = normalizarTexto([
                jogo.titulo,
                jogo.desenvolvedor,
                jogo.descricao,
                ...(jogo.tags ?? [])
            ].join(' '))

            return correspondePreco && (!termo || texto.includes(termo))
        })

        return [...filtrados].sort((a, b) => {
            if (ordem === 'nome') return a.titulo.localeCompare(b.titulo, 'pt-BR')
            if (ordem === 'nota') return (b.nota ?? 0) - (a.nota ?? 0)

            return (b.dataPublicacao ?? '').localeCompare(a.dataPublicacao ?? '')
        })
    }, [jogos, busca, filtro, ordem])

    const limparFiltros = () => {
        setBusca('')
        setFiltro('todos')
        setOrdem('recentes')
    }

    const remover = async (jogoId: string) => {
        if (!usuario.id || removendoId || comprandoId || comprasIds.has(jogoId)) return

        setRemovendoId(jogoId)
        setAviso(null)

        try {
            await removerBiblioteca(usuario.id, jogoId)
            setJogos((lista) => lista.filter((jogo) => jogo.id !== jogoId))
            setAviso('Jogo removido da biblioteca.')
        } catch (error) {
            setAviso(error instanceof Error ? error.message : 'Não foi possível remover o jogo da biblioteca.')
        } finally {
            setRemovendoId(null)
        }
    }

    const comprar = async (jogo: Game) => {
        if (!usuario.id || comprandoId || removendoId || (jogo.preco ?? 0) <= 0 || comprasIds.has(jogo.id)) return

        setComprandoId(jogo.id)
        setAviso(null)

        try {
            await comprarJogo(usuario.id, jogo.id)
            setComprasIds((atual) => new Set(atual).add(jogo.id))
            setAviso('Compra concluída. O jogo já está disponível na sua biblioteca.')
        } catch (error) {
            setAviso(error instanceof Error ? error.message : 'Não foi possível concluir a compra do jogo.')
        } finally {
            setComprandoId(null)
        }
    }

    const abrirDetalhes = (jogo: ConteudoApi) => {
        setJogoSelecionado(jogo)
        setDetalheAberto(true)
    }

    const tituloSecao = filtro === 'gratuitos'
        ? 'Jogos gratuitos'
        : filtro === 'pagos' ? 'Jogos pagos' : 'Todos os jogos'

    return (
        <main className="biblioteca">
            <header className="biblioteca-cabecalho">
                <div>
                    <span className="biblioteca-eyebrow">
                        {usuario.username ? `Olá, ${usuario.username}` : 'Sua coleção'}
                    </span>
                    <h1>Biblioteca</h1>
                    <p>Seus jogos salvos e adquiridos, prontos para rever ou continuar.</p>
                </div>

                <div className="biblioteca-resumo" aria-label="Resumo da biblioteca">
                    <div>
                        <strong>{carregando ? '—' : jogos.length}</strong>
                        <span>na biblioteca</span>
                    </div>
                    <div>
                        <strong>{carregando ? '—' : gratuitos.length}</strong>
                        <span>gratuitos</span>
                    </div>
                    <div>
                        <strong>{carregando ? '—' : pagos.length}</strong>
                        <span>pagos</span>
                    </div>
                </div>
            </header>

            {aviso && <p className="biblioteca-aviso" role="status">{aviso}</p>}

            <div className="biblioteca-toolbar">
                <BarraDePesquisa
                    value={busca}
                    onChange={setBusca}
                    placeholder="Buscar na sua biblioteca"
                    onFiltroClick={() => setFiltrosAbertos((aberto) => !aberto)}
                    filtroAtivo={filtrosAbertos}
                />

                {filtrosAbertos && (
                    <div className="biblioteca-filtros">
                        <div className="biblioteca-filtros-opcoes" aria-label="Filtrar por preço">
                            <button
                                type="button"
                                className={filtro === 'todos' ? 'is-selecionado' : ''}
                                aria-pressed={filtro === 'todos'}
                                onClick={() => setFiltro('todos')}
                            >
                                Todos <span>{jogos.length}</span>
                            </button>
                            <button
                                type="button"
                                className={filtro === 'gratuitos' ? 'is-selecionado' : ''}
                                aria-pressed={filtro === 'gratuitos'}
                                onClick={() => setFiltro('gratuitos')}
                            >
                                Gratuitos <span>{gratuitos.length}</span>
                            </button>
                            <button
                                type="button"
                                className={filtro === 'pagos' ? 'is-selecionado' : ''}
                                aria-pressed={filtro === 'pagos'}
                                onClick={() => setFiltro('pagos')}
                            >
                                Pagos <span>{pagos.length}</span>
                            </button>
                        </div>

                        <div className="biblioteca-ordenar">
                            <span>Ordenar por</span>
                            <Select
                                ariaLabel="Ordenar por"
                                value={ordem}
                                onChange={(valor) => setOrdem(valor as OrdemBiblioteca)}
                                options={[
                                    { value: 'recentes', label: 'Mais recentes' },
                                    { value: 'nome', label: 'Nome A–Z' },
                                    { value: 'nota', label: 'Melhor avaliação' }
                                ]}
                            />
                        </div>
                    </div>
                )}
            </div>

            {carregando ? (
                <section className="biblioteca-catalogo" aria-label="Carregando biblioteca">
                    <div className="biblioteca-lista-cabecalho">
                        <h2>Carregando seus jogos</h2>
                    </div>
                    <div className="biblioteca-lista" aria-hidden="true">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div className="biblioteca-card biblioteca-card-skeleton" key={index}>
                                <div className="biblioteca-skeleton-capa" />
                                <div className="biblioteca-card-corpo">
                                    <span className="biblioteca-skeleton-linha" />
                                    <span className="biblioteca-skeleton-linha is-curta" />
                                    <span className="biblioteca-skeleton-linha" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : !usuario.id ? (
                <section className="biblioteca-estado">
                    <img src="/icon-biblioteca.svg" alt="" />
                    <h2>Entre para ver sua biblioteca</h2>
                    <p>Faça login para acessar os jogos que você salvou ou adquiriu.</p>
                    <Link to="/login">Entrar na conta</Link>
                </section>
            ) : erro ? (
                <section className="biblioteca-estado is-erro" role="alert">
                    <img src="/icon-biblioteca.svg" alt="" />
                    <h2>Não foi possível carregar</h2>
                    <p>{erro}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setCarregando(true)
                            setErro(null)
                            setTentativa((atual) => atual + 1)
                        }}
                    >
                        Tentar novamente
                    </button>
                </section>
            ) : (
                <section className="biblioteca-catalogo" aria-labelledby="biblioteca-titulo-lista">
                    <div className="biblioteca-lista-cabecalho">
                        <div>
                            <h2 id="biblioteca-titulo-lista">{tituloSecao}</h2>
                            {busca && <p>Resultados para “{busca}”</p>}
                        </div>
                        <span>{jogosVisiveis.length} {jogosVisiveis.length === 1 ? 'jogo' : 'jogos'}</span>
                    </div>

                    {jogos.length === 0 ? (
                        <div className="biblioteca-estado">
                            <img src="/icon-biblioteca.svg" alt="" />
                            <h2>Sua biblioteca está vazia</h2>
                            <p>Explore a Home e salve os jogos que você quer ter por perto.</p>
                            <Link to="/">Explorar jogos</Link>
                        </div>
                    ) : jogosVisiveis.length === 0 ? (
                        <div className="biblioteca-estado">
                            <img src="/icon-pesquisa.svg" alt="" />
                            <h2>Nenhum jogo encontrado</h2>
                            <p>Tente outro termo ou remova os filtros selecionados.</p>
                            <button type="button" onClick={limparFiltros}>Limpar filtros</button>
                        </div>
                    ) : (
                        <div className="biblioteca-lista">
                            {jogosVisiveis.map((jogo) => {
                                const preco = jogo.preco ?? 0
                                const link = linkJogoValido(jogo.linkUrl)
                                const comprado = comprasIds.has(jogo.id)
                                const removendo = removendoId === jogo.id

                                return (
                                    <article
                                        className={`biblioteca-card ${detalheAberto && jogoSelecionado?.id === jogo.id ? 'is-selecionado' : ''}`}
                                        key={jogo.id}
                                    >
                                        <button
                                            type="button"
                                            className="biblioteca-card-capa"
                                            onClick={() => abrirDetalhes(jogo)}
                                            aria-label={`Ver detalhes de ${jogo.titulo}`}
                                        >
                                            <img src={jogo.imagem || '/imagem-polvojam.jpg'} alt={jogo.titulo} />
                                            <span className={`biblioteca-card-status ${comprado ? 'is-comprado' : ''}`}>
                                                {comprado ? 'Comprado' : 'Salvo'}
                                            </span>
                                        </button>

                                        <div className="biblioteca-card-corpo">
                                            <div className="biblioteca-card-topo">
                                                <div>
                                                    <h3>{jogo.titulo}</h3>
                                                    <span className="biblioteca-card-dev">{jogo.desenvolvedor}</span>
                                                </div>
                                                <strong className={`biblioteca-card-preco ${preco === 0 ? 'is-gratuito' : ''}`}>
                                                    {preco === 0 ? 'Gratuito' : formatarPreco(preco)}
                                                </strong>
                                            </div>

                                            <p className="biblioteca-card-descricao">{jogo.descricao}</p>

                                            <div className="biblioteca-card-meta">
                                                <span className="biblioteca-card-nota">
                                                    <span aria-hidden="true">★</span>
                                                    {(jogo.nota ?? 0).toFixed(1)}
                                                    <small>({jogo.avaliacoes ?? 0})</small>
                                                </span>
                                                <span className="biblioteca-card-plataformas">
                                                    {(jogo.plataformas ?? [])
                                                        .filter((plataforma) => plataformasValidas.has(plataforma))
                                                        .map((plataforma) => plataformasLabels[plataforma as 'website' | 'mobile' | 'pc'])
                                                        .join(' · ')}
                                                </span>
                                            </div>

                                            <div className="biblioteca-card-tags">
                                                {(jogo.tags ?? []).slice(0, 3).map((tag) => (
                                                    <span key={tag}>{tag}</span>
                                                ))}
                                            </div>

                                            <div className="biblioteca-card-acoes">
                                                <button type="button" onClick={() => abrirDetalhes(jogo)}>Ver detalhes</button>
                                                {link && (
                                                    <a href={link} target="_blank" rel="noreferrer">Abrir jogo</a>
                                                )}
                                                {!comprado && (
                                                    <button
                                                        type="button"
                                                        className="is-remover"
                                                        disabled={removendo}
                                                        onClick={() => remover(jogo.id)}
                                                    >
                                                        {removendo ? 'Removendo...' : 'Remover'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>
            )}

            <GameDetails
                game={detalheAberto && jogoSelecionado ? paraGame(jogoSelecionado) : null}
                isOpen={detalheAberto}
                onClose={() => setDetalheAberto(false)}
                isSaved
                isPurchased={jogoSelecionado ? comprasIds.has(jogoSelecionado.id) : false}
                actionPending={jogoSelecionado && comprandoId === jogoSelecionado.id ? 'comprar' : null}
                notice={aviso}
                onBuy={comprar}
            />
        </main>
    )
}
