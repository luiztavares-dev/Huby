import './Perfil.css'

export function Perfil () {

    const user = {
        name: 'Lunah.xsz',
        nameId: '#lunah.xsz',
        bannerPerfil: 'banner-perfil.svg',
        iconPerfil: 'icon-perfil.png'
    }

    return (
        <>
            <img src={user.bannerPerfil} alt="banner do perfil" className="perfil-banner"/>
            <div className="peril-ifcon">
                <img src={user.iconPerfil} alt="ícone do perfil"/>
                <h2>{user.name}</h2>
                <p>{user.nameId}</p>
            </div>
        </>
    )
}