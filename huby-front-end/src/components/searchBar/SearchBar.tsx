import "./SearchBar.css"

export default function BarraDePesquisa() {
    return (
        <div className="SearchBar-content">

            <div className="SearchBar-Barra">
                <input type="text" placeholder="Pesquise..." className="SearchBar-Barra-input" />
                <img src="icon-pesquisa.svg" alt="" className="SearchBar-Barra-img" />
            </div>
            <div className="SearchBar-Filtro">
                <img src="icon-filtros.svg" alt="" />
                <p>Filtros</p>
            </div>
            
        </div>
    )
}