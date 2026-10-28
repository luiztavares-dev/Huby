import "./SearchBar.css"

export default function BarraDePesquisa() {
    return (
        <div className="SearchBar-content">

            <div className="SearchBar-Barra">
                <input type="text" placeholder="Ex: RPG" className="SearchBar-Barra-input" />
                <img src="/icon-pesquisa.svg" alt="" className="SearchBar-Barra-img" />
            </div>

            <button className="SearchBar-Filtro">
                <img src="/icon-filtros.svg" alt="" />
                <span>Filtros</span>
            </button>

        </div>
    )
}
