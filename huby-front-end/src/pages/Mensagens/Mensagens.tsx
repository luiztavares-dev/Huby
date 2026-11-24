import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/navbar/Navbar';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_URL } from '../../services/home';
import './Mensagens.css';

const WS_URL = API_URL.replace(/^http/, 'ws');

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
  tipo?: string;
  origem?: string;
  destinatarioId?: string;
  equipeId?: string;
  eventoId?: string;
  eventoTitulo?: string;
  equipeNome?: string;
  funcao?: string;
  conviteStatus?: 'PENDENTE' | 'ACEITO' | 'RECUSADO' | '';
}

function formatarMensagem(m: any, meuId: string): Mensagem {
  return {
    id: m.id,
    texto: m.texto,
    minha: m.remetenteId === meuId,
    hora: new Date(m.dataHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    tipo: m.tipo || 'TEXTO',
    origem: m.origem || 'EQUIPE',
    destinatarioId: m.destinatarioId || '',
    equipeId: m.equipeId || '',
    eventoId: m.eventoId || '',
    eventoTitulo: m.eventoTitulo || '',
    equipeNome: m.equipeNome || '',
    funcao: m.funcao || '',
    conviteStatus: m.conviteStatus || ''
  };
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
  const [erroConvite, setErroConvite] = useState<string | null>(null);
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
        const resContatos = await fetch(`${API_URL}/api/mensagens/contatos/${loggedUser.id}`);
        let listaContatos: UsuarioData[] = resContatos.ok ? await resContatos.json() : [];

        if (id) {
          const jaTemHistorico = listaContatos.find(c => c.id === id);
          
          if (!jaTemHistorico) {
            const resPerfil = await fetch(`${API_URL}/api/perfil/${id}`);
            if (resPerfil.ok) {
              const novoContato = await resPerfil.json();
              listaContatos = [novoContato, ...listaContatos]; 
            }
          }

          const alvoAtivo = listaContatos.find(c => c.id === id);
          setChatAtivo(alvoAtivo || null);


          const resHistorico = await fetch(`${API_URL}/api/mensagens/${loggedUser.id}/${id}`);
          if (resHistorico.ok) {
            const histDB = await resHistorico.json();
            
            const histFormatado = histDB.map((m: any) => formatarMensagem(m, loggedUser.id));
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
      webSocketFactory: () => new SockJS(`${WS_URL}/ws`),
      onConnect: () => {
        client.subscribe(`/topic/mensagens/${loggedUser.id}`, (mensagemRecebida) => {
          const novaMsgDoBanco = JSON.parse(mensagemRecebida.body);
          
          setChatAtivo(chatAtual => {
            if (!chatAtual) return chatAtual;

            const fazParteDaConversa = novaMsgDoBanco.remetenteId === chatAtual.id
              || novaMsgDoBanco.destinatarioId === chatAtual.id;

            if (!fazParteDaConversa) return chatAtual;

            setMensagens(prev => {
              const formatada = formatarMensagem(novaMsgDoBanco, loggedUser.id);
              const existente = prev.find(m => m.id === formatada.id);

              if (existente) {
                return prev.map(m => (m.id === formatada.id ? formatada : m));
              }

              return [...prev, formatada];
            });

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
      const resposta = await fetch(`${API_URL}/api/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadMensagem)
      });

      if (resposta.ok) {
        const msgSalva = await resposta.json();
        
        setMensagens(prev => [...prev, formatarMensagem(msgSalva, loggedUser.id)]);
      }
    } catch (erro) {
      console.error("Erro ao enviar mensagem:", erro);
      setInputMsg(textoEnviado); 
    }
  };

  const handleDeletarMensagem = async (msgId: string) => {
    try {
      const resposta = await fetch(`${API_URL}/api/mensagens/${msgId}`, {
        method: 'DELETE'
      });
      if (resposta.ok) {
        setMensagens(prev => prev.filter(m => m.id !== msgId));
      }
    } catch (erro) {
      console.error("Erro ao deletar mensagem:", erro);
    }
  };

  const handleResponder = async (msg: Mensagem, aceitar: boolean) => {
    if (!loggedUser) return;

    const ehPedido = msg.tipo === 'PEDIDO_EQUIPE';
    const acao = ehPedido ? 'pedido' : 'convite';

    setErroConvite(null);

    try {
      const resposta = await fetch(`${API_URL}/api/mensagens/${msg.id}/${acao}/${aceitar ? 'aceitar' : 'recusar'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: loggedUser.id })
      });

      const corpo = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErroConvite(corpo?.mensagem || `Não foi possível responder ao ${acao}.`);
        return;
      }

      const novoStatus = (corpo?.conviteStatus || (aceitar ? 'ACEITO' : 'RECUSADO')) as Mensagem['conviteStatus'];

      setMensagens(prev => prev.map(m => (
        m.id === msg.id ? { ...m, conviteStatus: novoStatus } : m
      )));
    } catch {
      setErroConvite(`Não foi possível responder ao ${acao}.`);
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
                    
                    {msg.minha && msg.tipo === 'TEXTO' && (
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

                    {(msg.tipo === 'CONVITE_EQUIPE' || msg.tipo === 'PEDIDO_EQUIPE') ? (
                      <div className="msg-balao convite">
                        <span className="convite-titulo">
                          {msg.tipo === 'PEDIDO_EQUIPE'
                            ? (msg.origem === 'PERFIL_BUSCA' ? 'Pedido para entrar na equipe' : 'Pedido de entrada')
                            : 'Convite de equipe'}
                        </span>
                        <p className="convite-texto">{msg.texto}</p>

                        <div className="convite-dados">
                          {msg.equipeNome && <span><strong>Equipe</strong>{msg.equipeNome}</span>}
                          {msg.eventoTitulo && <span><strong>Evento</strong>{msg.eventoTitulo}</span>}
                          {(msg.tipo === 'CONVITE_EQUIPE' || msg.origem === 'PERFIL_BUSCA') && msg.funcao && (
                            <span><strong>Função</strong>{msg.funcao}</span>
                          )}
                        </div>

                        {!msg.minha && msg.conviteStatus === 'PENDENTE' && (
                          <div className="convite-acoes">
                            <button type="button" className="aceitar" onClick={() => handleResponder(msg, true)}>
                              Aceitar
                            </button>
                            <button type="button" className="recusar" onClick={() => handleResponder(msg, false)}>
                              Recusar
                            </button>
                          </div>
                        )}

                        {msg.conviteStatus === 'ACEITO' && (
                          <span className="convite-status aceito">
                            {msg.tipo === 'PEDIDO_EQUIPE'
                              ? (msg.origem === 'PERFIL_BUSCA'
                                ? (msg.minha
                                  ? 'Pedido aceito — o integrante entrou na equipe.'
                                  : 'Pedido aceito — você entrou na equipe!')
                                : (msg.minha
                                  ? 'Pedido aceito — você entrou na equipe!'
                                  : 'Pedido aceito — o integrante entrou na equipe.'))
                              : (msg.minha
                                ? 'Convite aceito pelo integrante.'
                                : 'Convite aceito — você entrou na equipe!')}
                          </span>
                        )}

                        {msg.conviteStatus === 'RECUSADO' && (
                          <span className="convite-status recusado">
                            {msg.tipo === 'PEDIDO_EQUIPE'
                              ? (msg.origem === 'PERFIL_BUSCA'
                                ? (msg.minha
                                  ? 'Pedido recusado pelo integrante.'
                                  : 'Pedido recusado — você não entrou na equipe.')
                                : (msg.minha
                                  ? 'Pedido recusado — você não entrou na equipe.'
                                  : 'Pedido recusado pela equipe.'))
                              : (msg.minha
                                ? 'Convite recusado pelo integrante.'
                                : 'Convite recusado — você não entrou na equipe.')}
                          </span>
                        )}

                        {msg.minha && msg.conviteStatus === 'PENDENTE' && (
                          <span className="convite-status pendente">
                            {msg.tipo === 'PEDIDO_EQUIPE'
                              ? (msg.origem === 'PERFIL_BUSCA'
                                ? 'Aguardando resposta do integrante.'
                                : 'Aguardando resposta da equipe.')
                              : 'Aguardando resposta do integrante.'}
                          </span>
                        )}

                        <span className="msg-hora">{msg.hora}</span>
                      </div>
                    ) : (
                      <div className="msg-balao">
                        <p>{msg.texto}</p>
                        <span className="msg-hora">{msg.hora}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={fimDoChatRef} />
              </div>

              {erroConvite && <p className="convite-erro" role="alert">{erroConvite}</p>}

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