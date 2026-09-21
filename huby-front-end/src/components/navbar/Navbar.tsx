import './Navbar.css'
import { Link } from 'react-router-dom'

interface NavbarProps {
    activeLink?: String
}

export function Navbar ({activeLink}: NavbarProps) {

    return (
        <>
            <div className="navbar">
                <Link to="/" className="navbar-link" style={{
                    backgroundColor: activeLink === 'home' ? 'var(--pink)' : '' 
                }}>
                    <img src="icon-home.svg" alt="home" />
                </Link>

                <Link to="/perfil" className="navbar-link" style={{
                    backgroundColor: activeLink === 'perfil' ? 'var(--pink)' : '' 
                }}>
                    <img src="icon-perfil.png" alt="perfil" className="navbar-link-perfil" />
                </Link>

                <Link to="/eventos" className="navbar-link" style={{
                    backgroundColor: activeLink === 'eventos' ? 'var(--pink)' : '' 
                }}>
                    <img src="icon-eventos.svg" alt="eventos" />
                </Link>

                <Link to="/biblioteca" className="navbar-link" style={{
                    backgroundColor: activeLink === 'biblioteca' ? 'var(--pink)' : '' 
                }}>
                    <img src="icon-biblioteca.svg" alt="biblioteca" />
                </Link>

                <Link to="/comunidades" className="navbar-link" style={{
                    backgroundColor: activeLink === 'comunidades' ? 'var(--pink)' : '' 
                }}>
                    <img src="icon-comunidades.svg" alt="comunidades" />
                </Link>

                <Link to="/carrinho" className="navbar-link" style={{
                    backgroundColor: activeLink === 'carrinho' ? 'var(--pink)' : '' 
                }}>
                    <img src="icon-carrinho.svg" alt="carrinho" />
                </Link>

                <Link to="/configuracoes" className="navbar-link" style={{
                    backgroundColor: activeLink === 'configuracoes' ? 'var(--pink)' : '' 
                }}>
                    <img src="icon-configuracoes.svg" alt="configuracoes" />
                </Link>
            </div>
        </>
    )
}