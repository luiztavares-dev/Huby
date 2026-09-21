import './Eventos.css'

export function Eventos () {
    const mockEvents = [
        { id: 1, tag: "GAME JAM EXTENSIVA", title: "INSPERARTE", org: "MITROUKAKKAK", participants: "2.391", prize: "1 | 150.00", hasPrize: true },
        { id: 2, tag: "SOUND", title: "BRASIL GAME JAM 26", org: "BGJ", participants: "2", prize: "Sem premiação", hasPrize: false },
        { id: 3, tag: "GAME JAM", title: "POLVOJAM", org: "Polvos", participants: "68mil", prize: "1 | 800.00", hasPrize: true },
        { id: 4, tag: "PIXEL ART", title: "Global Game Jam 12", org: "GGJ", participants: "0", prize: "Sem premiação", hasPrize: false },
        { id: 5, tag: "GAME JAM EXTENSIVA", title: "INSPERARTE", org: "MITROUKAKKAK", participants: "2.391", prize: "1 | 150.00", hasPrize: true }
    ];

    return (
        <div className="eventos-container">
            {/* BANNER MUDE AQUI */}
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

            {/* Barra de Pesquisa */}
            <div className="eventos-search-filter-section">
                <div className="eventos-search-bar">
                    <input type="text" placeholder="RPG" />
                    <button className="eventos-search-icon">🔍</button>
                </div>
                <button className="eventos-filter-button">
                    <span className="eventos-filter-icon">Y</span> Filtros
                </button>
            </div>

            {/* Grade dos Eventos */}
            <div className="eventos-section">
                <h3 className="eventos-section-title">INSCRIÇÕES TERMINANDO</h3>
                <div className="eventos-grid">
                    {mockEvents.map((evento) => (
                        <div key={evento.id} className="eventos-card">
                            <div className="eventos-card-image">
                                <span>Logo {evento.title}</span>
                            </div>
                            <div className="eventos-card-body">
                                <span className={`eventos-tag ${!evento.hasPrize ? 'eventos-tag-dark' : ''}`}>{evento.tag}</span>
                                <h4>{evento.title}</h4>
                                <p className="eventos-org-name">{evento.org}</p>
                                <div className="eventos-card-stats">
                                    <div className="eventos-stat-col">
                                        <span className="eventos-stat-label">INSCRIÇÃO</span>
                                        <span className="eventos-stat-date">Até 01/04/38</span>
                                    </div>
                                    <div className="eventos-stat-col eventos-right">
                                        <span className="eventos-stat-value">{evento.participants}</span>
                                        <span className="eventos-stat-label">inscritos</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`eventos-card-footer ${evento.hasPrize ? 'eventos-prize-active' : 'eventos-no-prize'}`}>
                                <span>{evento.hasPrize ? `💰 ${evento.prize}` : evento.prize}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Sessão extra p demonstrar o scroll */}
            <div className="eventos-section">
                <h3 className="eventos-section-title">GAME JAM</h3>
                <div className="eventos-grid">
                    {mockEvents.slice(0,3).map((evento) => (
                         <div key={evento.id + 10} className="eventos-card">
                            <div className="eventos-card-image">
                                <span>Logo {evento.title}</span>
                            </div>
                            <div className="eventos-card-body">
                                <span className="eventos-tag">{evento.tag}</span>
                                <h4>{evento.title}</h4>
                            </div>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    )
}