import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Select } from '../../components/select/Select'
import { criarEvento, type NovoEventoApi } from '../../services/eventos'
import { enviarImagemParaCloudinary } from '../../services/uploads'
import './CriarEvento.css'

type TipoPremiacao = 'SEM_PREMIACAO' | 'DINHEIRO' | 'PREMIOS' | 'AMBOS'
type CronoKey = 'inscricaoInicio' | 'inscricaoFim' | 'desenvolvimentoInicio' | 'desenvolvimentoFim' | 'analiseInicio' | 'analiseFim' | 'resultado'
type TagEvento = 'GAME JAM' | 'ARTE' | 'TRILHA SONORA' | 'PUZZLES'

const tagsEvento: Array<{ value: TagEvento; label: string }> = [
    { value: 'GAME JAM', label: 'Game jam' },
    { value: 'ARTE', label: 'Arte' },
    { value: 'TRILHA SONORA', label: 'Trilha sonora' },
    { value: 'PUZZLES', label: 'Puzzles' }
]

const horas = Array.from({ length: 72 }, (_, indice) => `${String(indice % 24).padStart(2, '0')}:00`)

function isoData(valor: string) {
    if (!valor) return ''
    return valor.includes('T') ? valor.slice(0, 10) : valor
}

function isoHora(valor: string) {
    if (!valor || !valor.includes('T')) return ''
    return `${valor.slice(11, 16)}`
}

function formatarData(valor: string) {
    const data = isoData(valor)
    if (!data) return '01/01/26'
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano.slice(-2)}`
}

function formatarDataHora(valor: string) {
    const data = formatarData(valor)
    const hora = isoHora(valor)
    return hora ? `${data} ${hora}` : data
}

function normalizarValorMonetario(valor: string): string | null {
    const texto = valor.trim().replace(',', '.')
    if (!texto) return ''
    if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(texto)) return null
    return texto.startsWith('.') ? `0${texto}` : texto
}

function toIsoComHora(data: Date, hora = '09:00') {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}T${hora}`
}

function adicionarDias(data: Date, dias: number) {
    const copia = new Date(data)
    copia.setDate(copia.getDate() + dias)
    return copia
}

function formatarContagem(restanteMs: number) {
    const totalSegundos = Math.max(0, Math.floor(restanteMs / 1000))
    const dias = Math.floor(totalSegundos / 86400)
    const horas = Math.floor((totalSegundos % 86400) / 3600)
    const minutos = Math.floor((totalSegundos % 3600) / 60)
    const segundos = totalSegundos % 60
    if (dias > 0) return `${dias}d ${horas}h ${minutos}m ${segundos}s`
    return `${horas}h ${minutos}m ${segundos}s`
}

const ALTURA_HORA = 34
const TAMANHO_CICLO_HORAS = 24 * ALTURA_HORA
const ATRASO_IMA = 90

function HorasInfinitas({ valor, aoSelecionar }: { valor: string; aoSelecionar: (hora: string) => void }) {
    const listaRef = useRef<HTMLDivElement>(null)
    const arrastoRef = useRef<{ y: number; scrollTop: number; moveu: boolean } | null>(null)
    const ignorarCliqueRef = useRef(false)
    const horaCentralRef = useRef<string | null>(null)
    const tempoImaRef = useRef<number | null>(null)
    const [arrastando, setArrastando] = useState(false)

    const indiceCentral = (lista: HTMLDivElement) =>
        Math.round((lista.scrollTop + (lista.clientHeight - ALTURA_HORA) / 2) / ALTURA_HORA)

    const horaDoIndice = (indice: number) => horas[((indice % 24) + 24) % 24]

    const posicaoCentral = (indice: number, lista: HTMLDivElement) =>
        indice * ALTURA_HORA - (lista.clientHeight - ALTURA_HORA) / 2

    const cancelarIma = () => {
        if (tempoImaRef.current === null) return
        window.clearTimeout(tempoImaRef.current)
        tempoImaRef.current = null
    }

    const manterNoCiclo = (lista: HTMLDivElement) => {
        const topo = lista.scrollTop
        if (topo >= TAMANHO_CICLO_HORAS && topo <= TAMANHO_CICLO_HORAS * 2) return
        const posicao = ((topo - TAMANHO_CICLO_HORAS) % TAMANHO_CICLO_HORAS + TAMANHO_CICLO_HORAS) % TAMANHO_CICLO_HORAS
        lista.scrollTop = TAMANHO_CICLO_HORAS + posicao
    }

    const agendarIma = () => {
        cancelarIma()
        tempoImaRef.current = window.setTimeout(() => {
            tempoImaRef.current = null
            const lista = listaRef.current
            if (!lista || arrastoRef.current) return
            lista.scrollTop = posicaoCentral(indiceCentral(lista), lista)
        }, ATRASO_IMA)
    }

    const atualizarHoraCentral = (lista: HTMLDivElement) => {
        manterNoCiclo(lista)
        const hora = horaDoIndice(indiceCentral(lista))
        if (hora !== horaCentralRef.current) {
            horaCentralRef.current = hora
            aoSelecionar(hora)
        }
        agendarIma()
    }

    const selecionarECentralizar = (hora: string) => {
        const lista = listaRef.current
        const indice = horas.indexOf(hora)
        if (!lista || indice < 0) return
        cancelarIma()
        horaCentralRef.current = hora
        lista.scrollTop = posicaoCentral(TAMANHO_CICLO_HORAS / ALTURA_HORA + indice, lista)
        aoSelecionar(hora)
    }

    useLayoutEffect(() => {
        const lista = listaRef.current
        const hora = isoHora(valor)
        if (!lista || !hora || horaCentralRef.current === hora) return
        horaCentralRef.current = hora
        const indice = horas.indexOf(hora)
        if (indice < 0) return
        lista.scrollTop = posicaoCentral(TAMANHO_CICLO_HORAS / ALTURA_HORA + indice, lista)
    }, [valor])

    useEffect(() => () => cancelarIma(), [])

    const iniciarArrasto = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        cancelarIma()
        ignorarCliqueRef.current = false
        arrastoRef.current = { y: event.clientY, scrollTop: event.currentTarget.scrollTop, moveu: false }
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    const arrastar = (event: ReactPointerEvent<HTMLDivElement>) => {
        const arrasto = arrastoRef.current
        if (!arrasto) return
        const distancia = event.clientY - arrasto.y
        if (Math.abs(distancia) > 3) {
            arrasto.moveu = true
            setArrastando(true)
        }
        event.currentTarget.scrollTop = arrasto.scrollTop - distancia
        atualizarHoraCentral(event.currentTarget)
        event.preventDefault()
    }

    const encerrarArrasto = (event: ReactPointerEvent<HTMLDivElement>) => {
        const arrasto = arrastoRef.current
        if (!arrasto) return
        arrastoRef.current = null
        setArrastando(false)
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        atualizarHoraCentral(event.currentTarget)
        if (arrasto.moveu) {
            ignorarCliqueRef.current = true
            window.setTimeout(() => { ignorarCliqueRef.current = false }, 0)
        }
    }

    return (
        <div
            ref={listaRef}
            className={`criar-jam-horas ${arrastando ? 'is-arrastando' : ''}`}
            aria-label="Selecione o horário"
            onScroll={(event) => atualizarHoraCentral(event.currentTarget)}
            onPointerDown={iniciarArrasto}
            onPointerMove={arrastar}
            onPointerUp={encerrarArrasto}
            onPointerCancel={encerrarArrasto}
            onClickCapture={(event) => {
                if (!ignorarCliqueRef.current) return
                event.preventDefault()
                event.stopPropagation()
                ignorarCliqueRef.current = false
            }}
        >
            {horas.map((hora, indice) => (
                <button
                    type="button"
                    key={`${hora}-${indice}`}
                    className={isoHora(valor) === hora ? 'is-atual' : ''}
                    onClick={() => selecionarECentralizar(hora)}
                >
                    {hora}
                </button>
            ))}
        </div>
    )
}

export function CriarEvento() {
    const navigate = useNavigate()
    const capaRef = useRef<HTMLInputElement | null>(null)

    const perfil = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('huby_user') || '{}') as {
                id?: string
                nomeExibicao?: string
                username?: string
            }
        } catch {
            return {}
        }
    }, [])

    const [nome, setNome] = useState('')
    const [tagEvento, setTagEvento] = useState<TagEvento>('GAME JAM')
    const [tema, setTema] = useState('')
    const [descricao, setDescricao] = useState('')
    const [capa, setCapa] = useState('')
    const [enviandoImagem, setEnviandoImagem] = useState<'capa' | null>(null)
    const [tipoPremiacao, setTipoPremiacao] = useState<TipoPremiacao>('SEM_PREMIACAO')
    const [premiosDinheiro, setPremiosDinheiro] = useState([''])
    const [premiosItens, setPremiosItens] = useState([''])
    const [crono, setCrono] = useState<Record<CronoKey, string>>(() => {
        const hoje = new Date()
        return {
            inscricaoInicio: toIsoComHora(hoje),
            inscricaoFim: toIsoComHora(adicionarDias(hoje, 7)),
            desenvolvimentoInicio: toIsoComHora(adicionarDias(hoje, 7)),
            desenvolvimentoFim: toIsoComHora(adicionarDias(hoje, 14)),
            analiseInicio: toIsoComHora(adicionarDias(hoje, 14)),
            analiseFim: toIsoComHora(adicionarDias(hoje, 21)),
            resultado: toIsoComHora(adicionarDias(hoje, 21))
        }
    })
    const [agora, setAgora] = useState(() => Date.now())
    const [picker, setPicker] = useState<CronoKey | null>('inscricaoInicio')
    const [mesPicker, setMesPicker] = useState(() => new Date(2026, 3, 1))
    const [regras, setRegras] = useState('')
    const [modelo, setModelo] = useState<'COMUM' | 'SURPRESA' | 'INDIVIDUAL'>('COMUM')
    const [tamanhoEquipe, setTamanhoEquipe] = useState(4)
    const [contatos, setContatos] = useState([''])
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    useEffect(() => {
        const intervalo = window.setInterval(() => setAgora(Date.now()), 1000)
        return () => window.clearInterval(intervalo)
    }, [])

    const diasCalendario = useMemo(() => {
        const ano = mesPicker.getFullYear()
        const mes = mesPicker.getMonth()
        const inicio = new Date(ano, mes, 1)
        const inicioSemana = inicio.getDay()
        const diasNoMes = new Date(ano, mes + 1, 0).getDate()
        const diasMesAnterior = new Date(ano, mes, 0).getDate()
        const dias: Array<{ data: string; fora: boolean }> = []

        for (let indice = inicioSemana - 1; indice >= 0; indice -= 1) {
            const dia = diasMesAnterior - indice
            const anterior = new Date(ano, mes - 1, dia)
            dias.push({ data: anterior.toISOString().slice(0, 10), fora: true })
        }
        for (let dia = 1; dia <= diasNoMes; dia += 1) {
            const data = new Date(ano, mes, dia)
            dias.push({ data: data.toISOString().slice(0, 10), fora: false })
        }
        let diaSeguinte = 1
        while (dias.length < 42) {
            const data = new Date(ano, mes + 1, diaSeguinte++)
            dias.push({ data: data.toISOString().slice(0, 10), fora: true })
        }
        return dias
    }, [mesPicker])

    const enviarImagem = async (tipo: 'capa', event: ChangeEvent<HTMLInputElement>) => {
        const arquivo = event.target.files?.[0]
        event.target.value = ''
        if (!arquivo) return
        if (!arquivo.type.startsWith('image/')) {
            setErro('Escolha uma imagem válida.')
            return
        }
        setEnviandoImagem(tipo)
        setErro(null)
        try {
            const url = await enviarImagemParaCloudinary(arquivo, 'huby/eventos/capas')
            setCapa(url)
        } catch (error) {
            setErro(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.')
        } finally {
            setEnviandoImagem(null)
        }
    }

    const selecionarDataHora = (chave: CronoKey, data: string) => {
        setCrono((anterior) => ({
            ...anterior,
            [chave]: `${data}T${isoHora(anterior[chave]) || '09:00'}`
        }))
    }

    const selecionarHora = (chave: CronoKey, hora: string) => {
        setCrono((anterior) => ({
            ...anterior,
            [chave]: `${isoData(anterior[chave])}T${hora}`
        }))
    }

    const nomeMes = mesPicker.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

    const statusPeriodo = (inicioValor: string, fimValor: string) => {
        const inicio = new Date(inicioValor).getTime()
        const fim = new Date(fimValor).getTime()
        if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return '-'
        if (agora < inicio) return '-'
        if (agora > fim) return 'Encerrado'
        return formatarContagem(fim - agora)
    }

    const statusResultado = (dataValor: string) => {
        const resultado = new Date(dataValor).getTime()
        if (!Number.isFinite(resultado)) return '-'
        return agora > resultado ? 'Encerrado' : '-'
    }

    const enviar = async (event: FormEvent) => {
        event.preventDefault()
        if (!perfil.id) {
            setErro('Entre na sua conta antes de criar uma jam.')
            return
        }
        if (!nome.trim()) {
            setErro('Informe o nome da jam.')
            return
        }
        if (!Number.isInteger(tamanhoEquipe) || tamanhoEquipe < 2 || tamanhoEquipe > 12) {
            setErro('O tamanho da equipe deve ser um número inteiro entre 2 e 12.')
            return
        }

        const periodos = [
            { nome: 'inscrições', inicio: crono.inscricaoInicio, fim: crono.inscricaoFim },
            { nome: 'desenvolvimento', inicio: crono.desenvolvimentoInicio, fim: crono.desenvolvimentoFim },
            { nome: 'análise', inicio: crono.analiseInicio, fim: crono.analiseFim }
        ]
        for (const periodo of periodos) {
            const inicioMs = new Date(periodo.inicio).getTime()
            const fimMs = new Date(periodo.fim).getTime()
            if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || inicioMs > fimMs) {
                setErro(`O período de ${periodo.nome} precisa ter uma data e horário válidos, com início antes do fim.`)
                return
            }
        }
        for (let indice = 1; indice < periodos.length; indice += 1) {
            if (new Date(periodos[indice - 1].fim).getTime() > new Date(periodos[indice].inicio).getTime()) {
                setErro(`O período de ${periodos[indice].nome} não pode começar antes do fim do período anterior.`)
                return
            }
        }
        const resultadoMs = new Date(crono.resultado).getTime()
        if (!Number.isFinite(resultadoMs) || resultadoMs < new Date(crono.analiseFim).getTime()) {
            setErro('A data e o horário do resultado devem ser posteriores ao fim da análise.')
            return
        }

        const usaPremioEmDinheiro = tipoPremiacao === 'DINHEIRO' || tipoPremiacao === 'AMBOS'
        const valoresDinheiro = usaPremioEmDinheiro ? premiosDinheiro.map(normalizarValorMonetario) : []
        if (valoresDinheiro.some((valor) => valor === null)) {
            setErro('Informe os prêmios em dinheiro com valores decimais válidos, como 100 ou 100,50.')
            return
        }

        const premios: Array<{ posicao: number; valor: string; descricao: string }> = []
        if (usaPremioEmDinheiro) {
            valoresDinheiro.forEach((valor, indice) => {
                if (valor) {
                    premios.push({ posicao: indice + 1, valor, descricao: '' })
                }
            })
        }
        if (tipoPremiacao === 'PREMIOS' || tipoPremiacao === 'AMBOS') {
            premiosItens.forEach((descricao, indice) => {
                if (descricao.trim()) {
                    premios.push({ posicao: indice + 1, valor: '', descricao: descricao.trim() })
                }
            })
        }

        const payload: NovoEventoApi = {
            criadorId: perfil.id,
            tipo: 'GAME_JAM',
            titulo: nome.trim(),
            descricao: descricao.trim(),
            imagem: capa || undefined,
            organizador: perfil.nomeExibicao || perfil.username || '',
            tema: tema.trim(),
            local: '',
            dataInicio: isoData(crono.desenvolvimentoInicio),
            dataFim: isoData(crono.desenvolvimentoFim),
            inscricoesAte: isoData(crono.inscricaoFim),
            inscricoesInicio: crono.inscricaoInicio,
            inscricoesFim: crono.inscricaoFim,
            desenvolvimentoInicio: crono.desenvolvimentoInicio,
            desenvolvimentoFim: crono.desenvolvimentoFim,
            analiseInicio: crono.analiseInicio,
            analiseFim: crono.analiseFim,
            dataPremiacao: crono.resultado,
            tamanhoEquipe,
            modeloEquipe: modelo,
            tags: [tagEvento],
            regras: regras.split('\n').map((item) => item.trim()).filter(Boolean),
            premios,
            tipoPremiacao,
            contatos: contatos.map((item) => item.trim()).filter(Boolean),
            cronograma: [
                { titulo: 'Período de inscrição', periodo: `${crono.inscricaoInicio} - ${crono.inscricaoFim}` },
                { titulo: 'Período de desenvolvimento', periodo: `${crono.desenvolvimentoInicio} - ${crono.desenvolvimentoFim}` },
                { titulo: 'Período de análise', periodo: `${crono.analiseInicio} - ${crono.analiseFim}` },
                { titulo: 'Data do resultado', periodo: crono.resultado }
            ]
        }

        setEnviando(true)
        setErro(null)
        try {
            await criarEvento(payload)
            navigate('/eventos')
        } catch (error) {
            setErro(error instanceof Error ? error.message : 'Não foi possível criar a jam.')
        } finally {
            setEnviando(false)
        }
    }

    const renderPicker = (chave: CronoKey) => {
        return (
            <div className="criar-jam-datepicker">
                <div className="criar-jam-calendario">
                    <div className="criar-jam-calendario-topo">
                        <button type="button" aria-label="Mês anterior" onClick={() => setMesPicker((mes) => new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>‹</button>
                        <strong>{nomeMes}</strong>
                        <button type="button" aria-label="Próximo mês" onClick={() => setMesPicker((mes) => new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>›</button>
                    </div>
                    <div className="criar-jam-semana">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, indice) => <span key={`${dia}-${indice}`}>{dia}</span>)}
                    </div>
                    <div className="criar-jam-dias">
                        {diasCalendario.map((dia) => {
                            const atual = isoData(crono[chave]) === dia.data
                            return (
                                <button
                                    type="button"
                                    key={dia.data}
                                    className={`${dia.fora ? 'is-fora' : ''} ${atual ? 'is-atual' : ''}`}
                                    onClick={() => {
                                        selecionarDataHora(chave, dia.data)
                                    }}
                                >
                                    {Number(dia.data.slice(-2))}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <HorasInfinitas
                    key={chave}
                    valor={crono[chave]}
                    aoSelecionar={(hora) => selecionarHora(chave, hora)}
                />
            </div>
        )
    }

    const campoCrono = (chave: CronoKey) => (
        <div className="criar-jam-crono-campo-wrap">
            <button
                type="button"
                className="criar-jam-crono-campo"
                onClick={() => {
                    const dataAtual = isoData(crono[chave])
                    if (dataAtual) {
                        const [ano, mes] = dataAtual.split('-')
                        setMesPicker(new Date(Number(ano), Number(mes) - 1, 1))
                    }
                    setPicker(picker === chave ? null : chave)
                }}
            >
                {formatarDataHora(crono[chave])}
            </button>
        </div>
    )

    return (
        <main className="criar-jam">
            <header className="criar-jam-topo">
                <button type="button" onClick={() => navigate('/eventos')} aria-label="Voltar">‹</button>
                <span>Criar game jam</span>
            </header>

            <form className="criar-jam-form" onSubmit={enviar}>
                <div className="criar-jam-midias">
                    <input ref={capaRef} type="file" accept="image/*" onChange={(event) => enviarImagem('capa', event)} />
                    <button
                        type="button"
                        className="criar-jam-capa"
                        onClick={() => capaRef.current?.click()}
                        disabled={enviandoImagem === 'capa'}
                    >
                        {capa ? <img src={capa} alt="" /> : <span>{enviandoImagem === 'capa' ? '...' : '+'}</span>}
                    </button>
                </div>

                <div className="criar-jam-nome-linha">
                    <input
                        className="criar-jam-nome"
                        value={nome}
                        onChange={(event) => setNome(event.target.value)}
                        placeholder="Coloque o nome aqui"
                    />

                    <Select
                        className="criar-jam-tag"
                        ariaLabel="Tag do evento"
                        value={tagEvento}
                        onChange={(valor) => setTagEvento(valor as TagEvento)}
                        options={tagsEvento}
                    />
                </div>

                <section className="criar-jam-organizador">
                    <strong>{perfil.nomeExibicao || 'Organizador'}</strong>
                    <span>@{perfil.username || 'organizador'}</span>
                </section>

                <label className="criar-jam-field">
                    <span>Tema</span>
                    <input value={tema} onChange={(event) => setTema(event.target.value)} placeholder="Coloque o tema aqui" />
                </label>

                <label className="criar-jam-field">
                    <span>Descrição</span>
                    <textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Coloque a descrição aqui" />
                </label>

                <section className="criar-jam-bloco criar-jam-premios">
                    <h2>Premiação</h2>
                    <div className="criar-jam-premio-opcoes">
                        {([
                            ['SEM_PREMIACAO', 'Sem premiação'],
                            ['DINHEIRO', 'Dinheiro'],
                            ['PREMIOS', 'Prêmios'],
                            ['AMBOS', 'Ambos']
                        ] as Array<[TipoPremiacao, string]>).map(([valor, texto]) => (
                            <button
                                type="button"
                                key={valor}
                                className={tipoPremiacao === valor ? 'is-active' : ''}
                                onClick={() => setTipoPremiacao(valor)}
                            >
                                {texto}
                            </button>
                        ))}
                    </div>

                    {(tipoPremiacao === 'DINHEIRO' || tipoPremiacao === 'AMBOS') &&
                        premiosDinheiro.map((valor, indice) => (
                            <div className={`criar-jam-premio-linha ${tipoPremiacao === 'AMBOS' ? 'is-ambos' : 'is-dinheiro'}`} key={`dinheiro-${indice}`}>
                                <strong>{indice + 1}</strong>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={valor}
                                    onChange={(event) => setPremiosDinheiro((lista) => lista.map((item, posicao) =>
                                        posicao === indice ? event.target.value : item))}
                                    placeholder="R$ 0,00"
                                />
                                {tipoPremiacao === 'AMBOS' && (
                                    <input
                                        value={premiosItens[indice] || ''}
                                        onChange={(event) => setPremiosItens((lista) => {
                                            const copia = [...lista]
                                            copia[indice] = event.target.value
                                            return copia
                                        })}
                                        placeholder="Primeira premiação aqui"
                                    />
                                )}
                            </div>
                        ))}

                    {(tipoPremiacao === 'PREMIOS') &&
                        premiosItens.map((valor, indice) => (
                            <div className="criar-jam-premio-linha is-premios" key={`premio-${indice}`}>
                                <strong>{indice + 1}</strong>
                                <input
                                    value={valor}
                                    onChange={(event) => setPremiosItens((lista) => lista.map((item, posicao) =>
                                        posicao === indice ? event.target.value : item))}
                                    placeholder="Primeira premiação aqui"
                                />
                            </div>
                        ))}

                    {tipoPremiacao !== 'SEM_PREMIACAO' && (
                        <button
                            type="button"
                            className="criar-jam-add"
                            onClick={() => {
                                setPremiosDinheiro((lista) => [...lista, ''])
                                setPremiosItens((lista) => [...lista, ''])
                            }}
                        >
                            +
                        </button>
                    )}
                </section>

                <section className="criar-jam-bloco criar-jam-cronograma">
                    <h2>Cronograma</h2>
                    <div className="criar-jam-crono-linha">
                        <div>
                            <strong>Tempo restante:</strong>
                            <span className={statusPeriodo(crono.inscricaoInicio, crono.inscricaoFim) === 'Encerrado' ? 'is-encerrado' : ''}>
                                {statusPeriodo(crono.inscricaoInicio, crono.inscricaoFim)}
                            </span>
                        </div>
                        <div>
                            <strong>Período de inscrição:</strong>
                            <div className="criar-jam-crono-campos">
                                {campoCrono('inscricaoInicio')}
                                {campoCrono('inscricaoFim')}
                            </div>
                        </div>
                    </div>
                    <div className="criar-jam-crono-linha">
                        <div>
                            <strong>Tempo restante:</strong>
                            <span className={statusPeriodo(crono.desenvolvimentoInicio, crono.desenvolvimentoFim) === 'Encerrado' ? 'is-encerrado' : ''}>
                                {statusPeriodo(crono.desenvolvimentoInicio, crono.desenvolvimentoFim)}
                            </span>
                        </div>
                        <div>
                            <strong>Período de desenvolvimento:</strong>
                            <div className="criar-jam-crono-campos">
                                {campoCrono('desenvolvimentoInicio')}
                                {campoCrono('desenvolvimentoFim')}
                            </div>
                        </div>
                    </div>
                    <div className="criar-jam-crono-linha">
                        <div>
                            <strong>Tempo restante:</strong>
                            <span className={statusPeriodo(crono.analiseInicio, crono.analiseFim) === 'Encerrado' ? 'is-encerrado' : ''}>
                                {statusPeriodo(crono.analiseInicio, crono.analiseFim)}
                            </span>
                        </div>
                        <div>
                            <strong>Período de análise:</strong>
                            <div className="criar-jam-crono-campos">
                                {campoCrono('analiseInicio')}
                                {campoCrono('analiseFim')}
                            </div>
                        </div>
                    </div>
                    <div className="criar-jam-crono-linha criar-jam-crono-resultado">
                        <div>
                            <strong>Tempo restante:</strong>
                            <span className={statusResultado(crono.resultado) === 'Encerrado' ? 'is-encerrado' : ''}>
                                {statusResultado(crono.resultado)}
                            </span>
                        </div>
                        <div>
                            <strong>Data e horário do resultado:</strong>
                            {campoCrono('resultado')}
                        </div>
                    </div>
                    {renderPicker(picker ?? 'inscricaoInicio')}
                </section>

                <label className="criar-jam-field">
                    <span>Regras</span>
                    <textarea value={regras} onChange={(event) => setRegras(event.target.value)} placeholder="Colocar regras aqui..." />
                </label>

                <div className="criar-jam-field">
                    <span>Modo de participação</span>
                    <Select
                        ariaLabel="Modo de participação"
                        value={modelo}
                        onChange={(valor) => setModelo(valor as 'COMUM' | 'SURPRESA' | 'INDIVIDUAL')}
                        options={[
                            { value: 'COMUM', label: 'Equipe comum' },
                            { value: 'SURPRESA', label: 'Equipe surpresa' },
                            { value: 'INDIVIDUAL', label: 'Individual' }
                        ]}
                    />
                </div>

                <label className="criar-jam-field">
                    <span>Tamanho da equipe</span>
                    <input
                        type="number"
                        min="2"
                        max="12"
                        step="1"
                        value={tamanhoEquipe}
                        onChange={(event) => setTamanhoEquipe(Number(event.target.value))}
                    />
                </label>

                <section className="criar-jam-bloco criar-jam-contatos">
                    <h2>Contatos</h2>
                    {contatos.map((contato, indice) => (
                        <input
                            key={indice}
                            value={contato}
                            onChange={(event) => setContatos((lista) => lista.map((item, posicao) =>
                                posicao === indice ? event.target.value : item))}
                            placeholder={indice === 0 ? 'Ex: Instagram' : 'Digite outro contato'}
                        />
                    ))}
                    <button type="button" className="criar-jam-add" onClick={() => setContatos((lista) => [...lista, ''])}>+</button>
                </section>

                {erro && <p className="criar-jam-erro" role="alert">{erro}</p>}

                <div className="criar-jam-acoes">
                    <button type="button" onClick={() => navigate('/eventos')}>Cancelar</button>
                    <button type="submit" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar'}</button>
                </div>
            </form>
        </main>
    )
}
