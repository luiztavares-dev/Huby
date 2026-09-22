import "./Banner.css"

const banners = [
    {
        image: "/imagem-polvojam.jpg",
        title: "Polvo Jam",
        description: "Uma game jam para criar, experimentar e publicar."
    },
    {
        image: "/imagem-insperarte.jpg",
        title: "Insperarte",
        description: "Participe de uma nova experiência de criação de jogos."
    },
    {
        image: "/imagem-ggj.png",
        title: "Global Game Jam",
        description: "Encontre projetos e comunidades para participar."
    },
    {
        image: "/imagem-bgj.jpg",
        title: "Brasil Game Jam",
        description: "Descubra eventos e projetos da comunidade brasileira."
    }
]

export default function Banner() {
    return (
        <section className="Banner">

            <div className="Banner-image">
                <img
                    src={banners[0].image}
                    alt={banners[0].title}
                />
            </div>

            <div className="Banner-overlay"></div>

            <div className="Banner-info">
                <h1>{banners[0].title}</h1>

                <p>
                    {banners[0].description}
                </p>
            </div>

            <div className="Banner-indicators">
                {banners.map((_, index) => (
                    <button
                        key={index}
                        className={
                            index === 0
                                ? "active"
                                : ""
                        }
                    />
                ))}
            </div>

        </section>
    )
}