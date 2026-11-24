import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import './Select.css'

export type SelectOption = {
    value: string
    label: string
}

export type SelectProps = {
    value: string
    options: SelectOption[]
    onChange: (value: string) => void
    ariaLabel: string
    className?: string
    disabled?: boolean
    name?: string
    placeholder?: string
}

export function Select({
    value,
    options,
    onChange,
    ariaLabel,
    className = '',
    disabled = false,
    name,
    placeholder
}: SelectProps) {
    const id = useId()
    const raizRef = useRef<HTMLDivElement>(null)
    const gatilhoRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [aberto, setAberto] = useState(false)
    const [indiceAtivo, setIndiceAtivo] = useState(0)
    const [abrirParaCima, setAbrirParaCima] = useState(false)

    const indiceSelecionado = options.findIndex((opcao) => opcao.value === value)
    const opcaoSelecionada = indiceSelecionado >= 0 ? options[indiceSelecionado] : undefined
    const textoSelecionado = opcaoSelecionada?.label ?? placeholder ?? value

    useEffect(() => {
        if (!aberto) return

        const aoClicarFora = (event: MouseEvent) => {
            if (!raizRef.current?.contains(event.target as Node)) setAberto(false)
        }

        document.addEventListener('mousedown', aoClicarFora)
        return () => document.removeEventListener('mousedown', aoClicarFora)
    }, [aberto])

    useLayoutEffect(() => {
        if (!aberto) return
        const gatilho = gatilhoRef.current
        const menu = menuRef.current
        if (!gatilho || !menu) return

        const areaGatilho = gatilho.getBoundingClientRect()
        const alturaMenu = Math.min(menu.scrollHeight, 240)
        const espacoBaixo = window.innerHeight - areaGatilho.bottom
        const espacoCima = areaGatilho.top
        setAbrirParaCima(espacoBaixo < alturaMenu + 8 && espacoCima > espacoBaixo)

        const opcaoAtiva = menu.querySelector<HTMLElement>(`[data-indice="${indiceAtivo}"]`)
        if (!opcaoAtiva) return
        const topo = opcaoAtiva.offsetTop
        const base = topo + opcaoAtiva.offsetHeight
        if (topo < menu.scrollTop) menu.scrollTop = topo
        if (base > menu.scrollTop + menu.clientHeight) menu.scrollTop = base - menu.clientHeight
    }, [aberto, indiceAtivo, options.length])

    const abrir = () => {
        if (disabled || options.length === 0) return
        setIndiceAtivo(indiceSelecionado >= 0 ? indiceSelecionado : 0)
        setAberto(true)
    }

    const selecionarIndice = (indice: number) => {
        const opcao = options[indice]
        if (!opcao) return
        onChange(opcao.value)
        setAberto(false)
        gatilhoRef.current?.focus()
    }

    const aoTeclar = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled || options.length === 0) return

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!aberto) abrir()
            else setIndiceAtivo((atual) => Math.min(atual + 1, options.length - 1))
            return
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (!aberto) abrir()
            else setIndiceAtivo((atual) => Math.max(atual - 1, 0))
            return
        }

        if (aberto && event.key === 'Home') {
            event.preventDefault()
            setIndiceAtivo(0)
            return
        }

        if (aberto && event.key === 'End') {
            event.preventDefault()
            setIndiceAtivo(options.length - 1)
            return
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (aberto) selecionarIndice(indiceAtivo)
            else abrir()
            return
        }

        if (event.key === 'Escape') {
            if (aberto) {
                event.preventDefault()
                setAberto(false)
            }
            return
        }

        if (event.key === 'Tab') {
            setAberto(false)
            return
        }

        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const termo = event.key.toLocaleLowerCase('pt-BR')
            const inicio = aberto ? indiceAtivo + 1 : 0
            for (let deslocamento = 0; deslocamento < options.length; deslocamento += 1) {
                const indice = (inicio + deslocamento) % options.length
                if (options[indice].label.toLocaleLowerCase('pt-BR').startsWith(termo)) {
                    event.preventDefault()
                    setAberto(true)
                    setIndiceAtivo(indice)
                    break
                }
            }
        }
    }

    return (
        <div
            ref={raizRef}
            className={`huby-dropdown ${aberto ? 'is-open' : ''} ${abrirParaCima ? 'is-up' : ''} ${className}`.trim()}
        >
            {name && <input type="hidden" name={name} value={value} />}

            <button
                ref={gatilhoRef}
                id={`${id}-trigger`}
                type="button"
                role="combobox"
                className="huby-dropdown__trigger"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={aberto}
                aria-controls={`${id}-listbox`}
                aria-activedescendant={aberto && options[indiceAtivo] ? `${id}-option-${indiceAtivo}` : undefined}
                disabled={disabled}
                onClick={() => aberto ? setAberto(false) : abrir()}
                onKeyDown={aoTeclar}
            >
                <span className="huby-dropdown__valor">{textoSelecionado || placeholder}</span>
                <span className="huby-dropdown__seta" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>

            {aberto && (
                <div
                    ref={menuRef}
                    id={`${id}-listbox`}
                    className="huby-dropdown__menu"
                    role="listbox"
                    aria-labelledby={`${id}-trigger`}
                >
                    {options.map((opcao, indice) => (
                        <button
                            key={opcao.value}
                            id={`${id}-option-${indice}`}
                            type="button"
                            role="option"
                            data-indice={indice}
                            aria-selected={opcao.value === value}
                            tabIndex={-1}
                            className={`huby-dropdown__opcao ${indice === indiceAtivo ? 'is-active' : ''} ${opcao.value === value ? 'is-selected' : ''}`.trim()}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setIndiceAtivo(indice)}
                            onClick={() => selecionarIndice(indice)}
                        >
                            {opcao.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
