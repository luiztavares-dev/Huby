import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/navbar/Navbar';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './Mensagens.css';

interface UsuarioData {
  id: string;
  nomeExibicao: string;
  username: string;
  avatarUrl: string;
}

interface Mensagem {
  id: string;
  texto: string;
  minha: boolean;
  hora: string;
}

export function Mensagens() {
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate();
  
  const [loggedUser, setLoggedUser] = useState<UsuarioData | null>(null);
  const [contatos, setContatos] = useState<UsuarioData[]>([]);
  const [busca, setBusca] = useState('');
  
  const [chatAtivo, setChatAtivo] = useState<UsuarioData | null>(null);
  const [inputMsg, setInputMsg] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const fimDoChatRef = useRef<HTMLDivElement>(null);

 
  useEffect(() => {
    const dadosSalvos = localStorage.getItem('huby_user');
    if (!dadosSalvos) {
      navigate('/login');
      return;
    }
    setLoggedUser(JSON.parse(dadosSalvos));
  }, [navigate]);


  useEffect(() => {
    if (!loggedUser) return;

    const carregarDadosDoChat = async () => {
      try {
        const resContatos = await fetch(`http://localhost:8080/api/mensagens/contatos/${loggedUser.id}`);
        let listaContatos: UsuarioData[] = resContatos.ok ? await resContatos.json() : [];

        if (id) {
          const jaTemHistorico = listaContatos.find(c => c.id === id);
          
          if (!jaTemHistorico) {
            const resPerfil = await fetch(`http://localhost:8080/api/perfil/${id}`);
            if (resPerfil.ok) {
              const novoContato = await resPerfil.json();
              listaContatos = [novoContato, ...listaContatos]; 
            }
          }

          const alvoAtivo = listaContatos.find(c => c.id === id);
          setChatAtivo(alvoAtivo || null);


          const resHistorico = await fetch(`http://localhost:8080/api/mensagens/${loggedUser.id}/${id}`);
          if (resHistorico.ok) {
            const histDB = await resHistorico.json();
            
            const histFormatado = histDB.map((m: any) => ({
              id: m.id,
              texto: m.texto,
              minha: m.remetenteId === loggedUser.id,
              hora: new Date(m.dataHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMensagens(histFormatado);
          }
        } else {
          setChatAtivo(null);
          setMensagens([]);
        }

        setContatos(listaContatos);
      } catch (erro) {
        console.error("Erro ao carregar chat:", erro);
      }
    };

    carregarDadosDoChat();
  }, [loggedUser, id]);


  useEffect(() => {
    fimDoChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  useEffect(() => {
    if (!loggedUser) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe(`/topic/mensagens/${loggedUser.id}`, (mensagemRecebida) => {
          const novaMsgDoBanco = JSON.parse(mensagemRecebida.body);
          
          setChatAtivo(chatAtual => {
            if (chatAtual && chatAtual.id === novaMsgDoBanco.remetenteId) {
              setMensagens(prev => {
                if (prev.some(m => m.id === novaMsgDoBanco.id)) {
                  return prev; 
                }
                
                return [...prev, {
                  id: novaMsgDoBanco.id,
                  texto: novaMsgDoBanco.texto,
                  minha: false,
                  hora: new Date(novaMsgDoBanco.dataHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }];
              });
            }
            return chatAtual;
          });
        });
      },
    });

    client.activate();

    return () => {
      client.deactivate(); 
    };
  }, [loggedUser]);

  const handleEnviar = async () => {
    if (!inputMsg.trim() || !chatAtivo || !loggedUser) return;
    
    const textoEnviado = inputMsg.trim();
    setInputMsg('');

    const payloadMensagem = {
      remetenteId: loggedUser.id,
      destinatarioId: chatAtivo.id,
      texto: textoEnviado
    };

    try {
      const resposta = await fetch('http://localhost:8080/api/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadMensagem)
      });

      if (resposta.ok) {
        const msgSalva = await resposta.json();
        
        setMensagens(prev => [...prev, {
          id: msgSalva.id,
          texto: msgSalva.texto,
          minha: true,
          hora: new Date(msgSalva.dataHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (erro) {
      console.error("Erro ao enviar mensagem:", erro);
      setInputMsg(textoEnviado); 
    }
  };

  const handleDeletarMensagem = async (msgId: string) => {
    try {
      const resposta = await fetch(`http://localhost:8080/api/mensagens/${msgId}`, {
        method: 'DELETE'
      });
      if (resposta.ok) {
        setMensagens(prev => prev.filter(m => m.id !== msgId));
      }
    } catch (erro) {
      console.error("Erro ao deletar mensagem:", erro);
    }
  };

  const contatosFiltrados = contatos.filter(c => 
    (c.nomeExibicao || '').toLowerCase().includes(busca.toLowerCase()) || 
    (c.username || '').toLowerCase().includes(busca.toLowerCase())
  );

  if (!loggedUser) return null;

  return (
    <>
      <Navbar activeLink="mensagens" />
      
      <div className="mensagens-container">
        
        <aside className="mensagens-sidebar">
          <div className="sidebar-header">
            <h3>Mensagens</h3>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Buscar conversa..." 
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>
          
          <div className="contatos-list">
            {contatosFiltrados.map(contato => {
              const nome = contato.nomeExibicao || contato.username;
              const isAtivo = chatAtivo?.id === contato.id;
              
              return (
                <div 
                  key={contato.id} 
                  className={`contato-item ${isAtivo ? 'ativo' : ''}`}
                  onClick={() => navigate(`/mensagens/${contato.id}`)}
                >
                  {contato.avatarUrl ? (
                    <img src={contato.avatarUrl} alt={nome} className="contato-avatar" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="contato-avatar vazio">{nome[0].toUpperCase()}</div>
                  )}
                  <div className="contato-info">
                    <h4>{nome}</h4>
                    <span>@{contato.username}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="mensagens-main">
          {chatAtivo ? (
            <div className="chat-area">
              
              <div className="chat-topo">
                <div className="chat-topo-info" onClick={() => navigate(`/perfil/${chatAtivo.id}`)}>
                  {chatAtivo.avatarUrl ? (
                    <img src={chatAtivo.avatarUrl} alt="Avatar" className="topo-avatar" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="topo-avatar vazio">{(chatAtivo.nomeExibicao || chatAtivo.username)[0].toUpperCase()}</div>
                  )}
                  <div>
                    <h2>{chatAtivo.nomeExibicao || chatAtivo.username}</h2>
                    <span>@{chatAtivo.username}</span>
                  </div>
                </div>
              </div>

              <div className="chat-historico">
                {mensagens.length === 0 && (
                  <div className="chat-sem-mensagens">
                    <p>Inicie a conversa com {chatAtivo.nomeExibicao || chatAtivo.username}!</p>
                  </div>
                )}
                
                {mensagens.map(msg => (
                  <div key={msg.id} className={`msg-linha ${msg.minha ? 'minha' : 'deles'}`}>
                    
                    {msg.minha && (
                      <button 
                        className="btn-deletar-msg" 
                        onClick={() => handleDeletarMensagem(msg.id)} 
                        title="Apagar mensagem"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}

                    <div className="msg-balao">
                      <p>{msg.texto}</p>
                      <span className="msg-hora">{msg.hora}</span>
                    </div>
                  </div>
                ))}
                <div ref={fimDoChatRef} />
              </div>

              <div className="chat-input-area">
                <input 
                  type="text" 
                  placeholder="Escreva a sua mensagem..." 
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEnviar()}
                />
                <button onClick={handleEnviar}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>

            </div>
          ) : (
            <div className="chat-vazio">
              <img src="/chat.svg" alt="Chat" className="vazio-icon" />
              <h3>As tuas Mensagens</h3>
              <p>Selecione um perfil na barra lateral para começar a conversar.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}