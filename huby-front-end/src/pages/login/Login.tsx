import { useState } from 'react';
import './Login.css';

type LoginProps = {};

export function Login(_props: LoginProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: conectar com a API de autenticação do Huby.
    console.log('Tentativa de login:', { email });
  }

  return (
    <main className="login-page">
      <section className="login-showcase" aria-label="Apresentação do Huby">
        <div className="showcase-orbit orbit-one" aria-hidden="true" />
        <div className="showcase-orbit orbit-two" aria-hidden="true" />
        <div className="showcase-orbit orbit-three" aria-hidden="true" />

        <div className="showcase-content">
          <img
  className="brand-mark"
  src="/logo-huby.svg"
  alt="Huby"
/>
          <p className="eyebrow">DESCUBRA · JOGUE · APOIE</p>
          <h1>O próximo jogo<br />que vai te marcar<br /><span>é independente.</span></h1>
          <p className="showcase-description">
            Um espaço para descobrir novas ideias, conhecer criadores e dar visibilidade a jogos fora do radar.
          </p>
          <div className="showcase-footer">
            <span className="status-dot" aria-hidden="true" />
            Feito para quem ama descobrir o novo
          </div>
        </div>

        <div className="sound-visual" aria-hidden="true">
          <div className="sound-visual-glow" />
          <div className="sound-ring sound-ring-one" />
          <div className="sound-ring sound-ring-two" />
          <div className="sound-ring sound-ring-three" />
        </div>
      </section>

      <section className="login-panel" aria-label="Entrar na conta">
        <div className="login-box">
          <div className="mobile-brand"><span className="brand-mark" aria-hidden="true">H</span><span>HUBY</span></div>
          <p className="login-kicker">BOM TE VER POR AQUI</p>
          <h2>Faça seu login</h2>
          <p className="login-subtitle">Entre na sua conta e continue explorando<br className="desktop-break" /> o universo dos jogos independentes.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">E-mail ou nome de usuário</label>
            <input
              id="login-email"
              type="text"
              autoComplete="username"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="password-label-row">
              <label htmlFor="login-senha">Senha</label>
              <a href="#recuperar-senha">Esqueceu?</a>
            </div>
            <div className="password-input-wrap">
              <input
                id="login-senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <button className="confirm-button" type="submit">Entrar na plataforma <span aria-hidden="true">↗</span></button>
          </form>

          <div className="separator"><span /> <span>ou continue com</span> <span /></div>
          <button className="google-button" type="button" onClick={() => console.info('Conecte aqui o login OAuth do Google.')}>
          <img
  className="google-logo"
  src="/google-image.png"
  alt=""
  aria-hidden="true"
/> Continuar com o Google
          </button>
          <p className="signup-text">Ainda não tem uma conta? <a href="#cadastro">Criar conta</a></p>
          <p className="terms-text">Ao continuar, você concorda com nossos <a href="#termos">Termos de uso</a> e <a href="#privacidade">Política de privacidade</a>.</p>
        </div>
      </section>
    </main>
  );
}

export default Login;
