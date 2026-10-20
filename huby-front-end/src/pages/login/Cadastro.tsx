import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import './Cadastro.css';

export function Cadastro() {
  const navigate = useNavigate();

  const [nomeExibicao, setNomeExibicao] = useState('');
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem('');

    if (senha !== confirmarSenha) {
      setMensagem('Erro: As senhas não coincidem.');
      return;
    }

    try {
      const resposta = await fetch('http://localhost:8080/api/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: email,
          senha,
          nomeExibicao,
          username: usuario
        })
      });

 
      const textoBruto = await resposta.text();

      if (resposta.ok) {
        
        const usuarioCriado = JSON.parse(textoBruto);
        localStorage.setItem('huby_user', JSON.stringify(usuarioCriado));
        navigate('/perfil');
      } else {
    
        setMensagem(textoBruto || 'Erro: Não foi possível criar a conta.');
      }

    } catch (error) {
      console.error(error);
      setMensagem('Erro: O servidor Java está desligado ou inacessível.');
    }
  }

  const loginComGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setMensagem('Autenticado pelo Google! Validando no servidor Huby...');
      
      try {
        const resposta = await fetch('http://localhost:8080/api/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenResponse.access_token })
        });

        const textoBruto = await resposta.text();

        if (resposta.ok) {
          const usuarioLogado = JSON.parse(textoBruto);
          localStorage.setItem('huby_user', JSON.stringify(usuarioLogado));
          navigate('/perfil');
        } else {
          setMensagem(textoBruto || 'Erro ao autenticar com Google.');
        }

      } catch (error) {
        console.error(error);
        setMensagem('Erro: Não foi possível conectar ao servidor Java.');
      }
    },
    onError: () => {
      setMensagem('Erro: O cadastro com o Google falhou ou foi cancelado.');
    }
  });

  return (
    <main className="cadastro-page">
      <section className="cadastro-showcase" aria-label="Apresentação do Huby">
        <div className="cadastro-orbit cadastro-orbit-one" aria-hidden="true" />
        <div className="cadastro-orbit cadastro-orbit-two" aria-hidden="true" />
        <div className="cadastro-showcase-content">
          <img
            className="brand-mark"
            src="/logo-huby.svg"
            alt="Huby"
          />
          <p className="cadastro-eyebrow">DESCUBRA · JOGUE · APOIE</p>
          <h1>Seu próximo<br />universo começa<br /><span>aqui.</span></h1>
          <p className="cadastro-description">
            Crie sua conta para descobrir jogos independentes, acompanhar criadores e encontrar sua próxima aventura.
          </p>
          <div className="cadastro-showcase-footer"><span /> Uma comunidade feita para descobrir o novo</div>
        </div>
        <div className="cadastro-sound-visual" aria-hidden="true">
          <div className="cadastro-sound-ring ring-one" />
          <div className="cadastro-sound-ring ring-two" />
          <div className="cadastro-sound-ring ring-three" />
        </div>  
      </section>
      <section className="cadastro-panel" aria-label="Criar conta">
        <div className="cadastro-box">
          <div className="cadastro-mobile-brand"><span className="cadastro-brand-mark" aria-hidden="true">H</span><span>HUBY</span></div>
          <p className="cadastro-kicker">BORA FAZER PARTE</p>
          <h2>Crie sua conta</h2>
          <p className="cadastro-subtitle">Entre para a comunidade e encontre seu próximo jogo favorito.</p>

          {mensagem && (
            <div style={{ 
              padding: '12px 16px', 
              marginBottom: '20px', 
              borderRadius: '8px', 
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: mensagem.includes('Erro') ? 'rgba(250, 41, 95, 0.08)' : 'rgba(40, 167, 69, 0.08)',
              border: `1px solid ${mensagem.includes('Erro') ? 'var(--pink)' : '#28a745'}`,
              color: mensagem.includes('Erro') ? 'var(--pink)' : '#28a745'
            }}>
              {mensagem}
            </div>
          )}

          <form className="cadastro-form" onSubmit={handleSubmit}>
            <label htmlFor="cadastro-nome">Nome de exibição</label>
            <input id="cadastro-nome" type="text" autoComplete="name" placeholder="Como vamos te chamar?" value={nomeExibicao} onChange={(event) => setNomeExibicao(event.target.value)} required />

            <label htmlFor="cadastro-usuario">Nome de usuário</label>
            <input id="cadastro-usuario" type="text" autoComplete="username" placeholder="Escolha um nome de usuário" value={usuario} onChange={(event) => setUsuario(event.target.value)} minLength={3} required />

            <label htmlFor="cadastro-email">E-mail</label>
            <input id="cadastro-email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} required />

            <label htmlFor="cadastro-senha">Senha</label>
            <div className="cadastro-password-wrap">
              <input id="cadastro-senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" placeholder="Crie uma senha" value={senha} onChange={(event) => setSenha(event.target.value)} minLength={8} required />
              <button className="cadastro-password-toggle" type="button" onClick={() => setMostrarSenha((atual) => !atual)} aria-label={mostrarSenha ? 'Ocultar senhas' : 'Mostrar senhas'}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</button>
            </div>

            <label htmlFor="cadastro-confirmar-senha">Confirmar senha</label>
            <input id="cadastro-confirmar-senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" placeholder="Digite a senha novamente" value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} minLength={8} required />

            <button className="cadastro-submit" type="submit">Criar minha conta <span aria-hidden="true">↗</span></button>
          </form>

          <div className="cadastro-separator"><span /> <span>ou continue com</span> <span /></div>
          
          <button className="cadastro-google-button" type="button" onClick={() => loginComGoogle()}>
            <img className="cadastro-google-logo" src="/google-image.png" alt="" aria-hidden="true" /> Continuar com o Google
          </button>
          
          <p className="cadastro-login-text">Já tem uma conta? <Link to="/login">Entrar</Link></p>
          <p className="cadastro-terms-text">Ao criar uma conta, você concorda com nossos <a href="#termos">Termos de uso</a> e <a href="#privacidade">Política de privacidade</a>.</p>
        </div>
      </section>
    </main>
  );
}

export default Cadastro;