import { Link } from 'react-router-dom';
import './Footer.css';

const navigationLinks = [
    { label: 'Início', to: '/' },
    { label: 'Eventos', to: '/eventos' },
    { label: 'Comunidades', to: '/comunidades' },
    { label: 'Biblioteca', to: '/biblioteca' },
];

const accountLinks = [
    { label: 'Meu perfil', to: '/perfil' },
    { label: 'Mensagens', to: '/mensagens' },
    { label: 'Carrinho', to: '/carrinho' },
];

const socialLinks = [
    { label: 'Instagram', href: '#', icon: '/instagram.svg' },
    { label: 'TikTok', href: '#', icon: '/tiktok.svg' },
    { label: 'X', href: '#', icon: '/x-twitter.svg' },
    { label: 'Discord', href: '#', icon: '/discord.svg' },
];

export function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <Link to="/" className="footer-logo" aria-label="Huby - início">
                        <img src="/logo-huby.svg" alt="" />
                        <span>huby</span>
                    </Link>
                    <p>Seu espaço para jogar, criar e encontrar sua comunidade.</p>
                </div>

                <nav className="footer-navigation" aria-label="Navegação do rodapé">
                    <div className="footer-column">
                        <h2>Explorar</h2>
                        {navigationLinks.map((link) => (
                            <Link key={link.to} to={link.to}>{link.label}</Link>
                        ))}
                    </div>
                    <div className="footer-column">
                        <h2>Minha conta</h2>
                        {accountLinks.map((link) => (
                            <Link key={link.to} to={link.to}>{link.label}</Link>
                        ))}
                    </div>
                </nav>

                <div className="footer-social">
                    <h2>Faça parte</h2>
                    <p>Acompanhe o Huby nas redes.</p>
                    <div className="footer-social-links">
                        {socialLinks.map((social) => (
                            <a
                                key={social.label}
                                href={social.href}
                                aria-label={social.label}
                                className="footer-social-link"
                            >
                                <img src={social.icon} alt="" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <span>© {new Date().getFullYear()} Huby. Todos os direitos reservados.</span>
                <span>Feito para quem vive jogos.</span>
            </div>
        </footer>
    );
}
