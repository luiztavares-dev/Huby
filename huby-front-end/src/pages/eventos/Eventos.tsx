import './Eventos.css'

export function Eventos () {
    
    const mockEvents = [
        { id: 1, image: "/imagem-insperarte.jpg", tag: "GAME JAM EXTENSIVA", title: "INSPERARTE", org: "MTROUXAKKAK", date: "Até 01/04/36", participants: "2.391", prize: "100,00", hasPrize: true },
        { id: 2, image: "/imagem-bgj.jpg", tag: "SOUND", title: "BRASIL GAME JAM 26", org: "BGJ", date: "Até 01/04/38", participants: "2", prize: "Sem premiação", hasPrize: false },
        { id: 3, image: "/imagem-polvojam.jpg", tag: "GAME JAM", title: "POLVOJAM", org: "POLVOS", date: "Até 01/04/38", participants: "68mil", prize: "800,00", hasPrize: true },
        { id: 4, image: "/imagem-ggj.png", tag: "PIXEL ART", title: "GLOBAL GAME JAM 12", org: "GGJ", date: "Até 01/04/38", participants: "0", prize: "Sem premiação", hasPrize: false },
        { id: 5, image: "/imagem-insperarte.jpg", tag: "GAME JAM EXTENSIVA", title: "INSPERARTE", org: "MTROUXAKKAK", date: "Até 01/04/36", participants: "2.391", prize: "150,00", hasPrize: true }
    ];

    return (
        <div className="eventos-container">
            <div className="eventos-banner-carousel">
                <div className="eventos-banner-content">
                    <h2>Imagem 1</h2>
                </div>
                <div className="eventos-carousel-indicators">
                    <span className="eventos-indicator eventos-active"></span>
                    <span className="eventos-indicator"></span>
                    <span className="eventos-indicator"></span>
                    <span className="eventos-indicator"></span>
                </div>
            </div>

            <div className="eventos-search-filter-section">
                <div className="eventos-search-bar">
                    <input type="text" placeholder="RPG" />
                    <button className="eventos-search-icon">
                        <img src="/pesquisa.svg" alt="Buscar" />
                    </button>
                </div>
                <button className="eventos-filter-button">
                    <span className="eventos-filter-icon">
                        <img src="/filtros.svg" alt="Filtro" />
                    </span> 
                    Filtros
                </button>
            </div>

            <div className="eventos-section">
                <h3 className="eventos-section-title">INSCRIÇÕES TERMINANDO</h3>
                <div className="eventos-grid">
                    {mockEvents.map((evento) => (
                        <div key={evento.id} className="eventos-card">
                            <div className="eventos-card-image">
                                <img src={evento.image} alt={`Cartaz do evento ${evento.title}`} className="eventos-poster" />
                            </div>
                            
                            <div className="eventos-card-body">
                                <span className={`eventos-tag ${!evento.hasPrize ? 'eventos-tag-dark' : ''}`}>
                                    {evento.tag}
                                </span>
                                
                                <h4 className="eventos-title">{evento.title}</h4>
                                <p className="eventos-org-name">{evento.org}</p>
                                
                                <div className="eventos-card-stats">
                                    <div className="eventos-stat-col">
                                        <span className="eventos-stat-title">INSCRIÇÃO</span>
                                        <span className="eventos-stat-sub">{evento.date}</span>
                                    </div>
                                    <div className="eventos-stat-col eventos-right">
                                        <span className="eventos-stat-title">{evento.participants}</span>
                                        <span className="eventos-stat-sub">inscritos</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`eventos-card-footer ${evento.hasPrize ? 'eventos-prize-active' : 'eventos-no-prize'}`}>
                                {evento.hasPrize ? (
                                    <>
                                        <div className="eventos-footer-left">
                                            <img src="/placar.svg" alt="Rank" className="eventos-icon-podium" />
                                            <span>1 &nbsp;|&nbsp; {evento.prize}</span>
                                        </div>
                                        <span className="eventos-footer-right">
                                            <img src="/cifrao.svg" alt="Cifrão" className="eventos-icon-dollar" />
                                        </span>
                                    </>
                                ) : (
                                    <span>{evento.prize}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="eventos-section">
                <h3 className="eventos-section-title">GAME JAM</h3>
                <div className="eventos-grid">
                    {mockEvents.slice(0,3).map((evento) => (
                         <div key={evento.id + 10} className="eventos-card">
                            <div className="eventos-card-image">
                                <img src={evento.image} alt={`Cartaz do evento ${evento.title}`} className="eventos-poster" />
                            </div>
                            <div className="eventos-card-body">
                                <span className="eventos-tag">{evento.tag}</span>
                                <h4 className="eventos-title">{evento.title}</h4>
                            </div>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    )
}