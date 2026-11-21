import "./SearchBar.css"

type BarraDePesquisaProps = {
    value?: string
    onChange?: (valor: string) => void
    placeholder?: string
    onFiltroClick?: () => void
    filtroAtivo?: boolean
}

export default function BarraDePesquisa({
    value,
    onChange,
    placeholder = "Ex: RPG",
    onFiltroClick,
    filtroAtivo = false
}: BarraDePesquisaProps) {
    return (
        <div className="SearchBar-content">

            <div className="SearchBar-Barra">
                <input
                    type="text"
                    placeholder={placeholder}
                    className="SearchBar-Barra-input"
                    value={value}
                    onChange={(event) => onChange?.(event.target.value)}
                />
                <img src="/icon-pesquisa.svg" alt="" className="SearchBar-Barra-img" />
            </div>

            <button
                type="button"
                className={`SearchBar-Filtro ${filtroAtivo ? 'is-active' : ''}`}
                onClick={onFiltroClick}
                aria-expanded={filtroAtivo}
            >
                <img src="/icon-filtros.svg" alt="" />
                <span>Filtros</span>
            </button>

        </div>
    )
}
