import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/navbar/Navbar';
import { usuarioLogado } from '../../services/sessao';
import { comprarJogo } from '../../services/usuarios';
import {
  buscarCarrinho,
  limparCarrinho,
  removerDoCarrinho,
  type ItemCarrinhoApi,
} from '../../services/carrinho';
import './Carrinho.css';

type MetodoPagamento = 'debito' | 'credito' | 'pix';

const formatarPreco = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const formatarNumeroCartao = (valor: string) =>
  valor
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '\$1 ');

const formatarTempo = (segundos: number) => {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
};

export function Carrinho() {
  const navigate = useNavigate();
  const [usuario] = useState(() => usuarioLogado());
  const [itens, setItens] = useState<ItemCarrinhoApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);


  const [metodo, setMetodo] = useState<MetodoPagamento>('credito');
  const [nomeTitular, setNomeTitular] = useState('');
  const [numeroCartao, setNumeroCartao] = useState('');
  const [mesValidade, setMesValidade] = useState('');
  const [anoValidade, setAnoValidade] = useState('');
  const [cvc, setCvc] = useState('');


  const [pixGerado, setPixGerado] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(0);
  const [codigoPix, setCodigoPix] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!usuario.id) {
      navigate('/login');
      return;
    }

    setCarregando(true);
    buscarCarrinho(usuario.id)
      .then((dados) => setItens(dados))
      .catch(() => setAviso({ tipo: 'erro', texto: 'Não foi possível carregar os itens do carrinho.' }))
      .finally(() => setCarregando(false));
  }, [navigate, usuario.id]);

  useEffect(() => {
    if (!pixGerado || tempoRestante <= 0) return;

    const timer = window.setInterval(() => {
      setTempoRestante((atual) => {
        if (atual <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return atual - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pixGerado, tempoRestante]);

  const total = useMemo(
    () => itens.reduce((acc, item) => acc + (item.preco ?? 0), 0),
    [itens]
  );


  const resetarPix = () => {
    setPixGerado(false);
    setTempoRestante(0);
    setCodigoPix('');
    setCopiado(false);
  };

  const handleTrocarMetodo = (novoMetodo: MetodoPagamento) => {
    setMetodo(novoMetodo);
    setAviso(null);
    if (novoMetodo !== 'pix') {
      resetarPix();
    }
  };

  const handleGerarPix = () => {
    if (itens.length === 0) return;
    const hash = Math.random().toString(36).substring(2, 12).toUpperCase();
    const valorFormatado = total.toFixed(2);
    setCodigoPix(`00020126360014BR.GOV.BCB.PIX0114HUBY${hash}520400005303986540${valorFormatado}5802BR5904HUBY6304`);
    setPixGerado(true);
    setTempoRestante(15 * 60); 
    setCopiado(false);
  };

  const handleCopiarPix = async () => {
    if (!codigoPix) return;
    try {
      await navigator.clipboard.writeText(codigoPix);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
  
    }
  };

  const cartaoValido =
    nomeTitular.trim().length >= 3 &&
    numeroCartao.replace(/\D/g, '').length === 16 &&
    mesValidade.length === 2 &&
    Number(mesValidade) >= 1 &&
    Number(mesValidade) <= 12 &&
    anoValidade.length === 2 &&
    cvc.length >= 3;

  const podeConfirmar =
    itens.length > 0 &&
    !processando &&
    (metodo === 'pix' ? pixGerado && tempoRestante > 0 : cartaoValido);

  const handleExcluirJogo = async (jogoId: string) => {
    if (!usuario.id || processando) return;
    setProcessando(true);
    setAviso(null);
    try {
      const atualizados = await removerDoCarrinho(usuario.id, jogoId);
      setItens(atualizados);
      resetarPix();
    } catch {
      setAviso({ tipo: 'erro', texto: 'Erro ao remover o jogo do carrinho.' });
    } finally {
      setProcessando(false);
    }
  };

  const handleExcluirTudo = async () => {
    if (!usuario.id || itens.length === 0 || processando) return;
    setProcessando(true);
    setAviso(null);
    try {
      await limparCarrinho(usuario.id);
      setItens([]);
      resetarPix();
    } catch {
      setAviso({ tipo: 'erro', texto: 'Erro ao limpar o carrinho.' });
    } finally {
      setProcessando(false);
    }
  };

  const handleConfirmarCompra = async () => {
    if (!usuario.id || !podeConfirmar) return;
    setProcessando(true);
    setAviso(null);

    try {
      for (const item of itens) {
        await comprarJogo(usuario.id, item.id);
      }

      await limparCarrinho(usuario.id);
      setItens([]);
      resetarPix();
      setNomeTitular('');
      setNumeroCartao('');
      setMesValidade('');
      setAnoValidade('');
      setCvc('');

      setAviso({
        tipo: 'sucesso',
        texto: 'Pagamento aprovado! Os jogos foram adicionados à sua conta.',
      });
    } catch (error) {
      setAviso({
        tipo: 'erro',
        texto: error instanceof Error ? error.message : 'Não foi possível concluir a compra.',
      });
    } finally {
      setProcessando(false);
    }
  };

  if (!usuario.id) return null;

  return (
    <>
      <Navbar activeLink="carrinho" />

      <main className="carrinho-page">
        <div className="carrinho-layout">
          <section className="carrinho-lista-col">
            <header className="carrinho-header">
              <div className="carrinho-titulo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <h1>
                  Itens no carrinho <span>({itens.length})</span>
                </h1>
              </div>

              {itens.length > 0 && (
                <button
                  type="button"
                  className="btn-excluir-tudo"
                  onClick={handleExcluirTudo}
                  disabled={processando}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  Excluir tudo
                </button>
              )}
            </header>

            {aviso && (
              <div className={`carrinho-aviso ${aviso.tipo}`} role="status">
                {aviso.texto}
              </div>
            )}

            {carregando ? (
              <div className="carrinho-vazio">
                <p>Carregando carrinho...</p>
              </div>
            ) : itens.length === 0 ? (
              <div className="carrinho-vazio">
                <p>Seu carrinho está vazio.</p>
                <button type="button" className="btn-voltar-catalogo" onClick={() => navigate('/')}>
                  Explorar jogos
                </button>
              </div>
            ) : (
              <div className="carrinho-cards">
                {itens.map((item) => (
                  <article key={item.id} className="carrinho-card">
                    <div className="carrinho-card-thumb">
                      <img src={item.imagem} alt={item.titulo} />
                    </div>

                    <div className="carrinho-card-info">
                      <h2>{item.titulo}</h2>

                      {item.tags && item.tags.length > 0 && (
                        <div className="carrinho-card-tags">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={`${item.id}-${tag}`} className="carrinho-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <strong className="carrinho-card-preco">
                        {formatarPreco(item.preco ?? 0)}
                      </strong>
                    </div>

                    <div className="carrinho-card-acoes">
                      <button
                        type="button"
                        className="btn-excluir-jogo"
                        onClick={() => handleExcluirJogo(item.id)}
                        disabled={processando}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Excluir jogo
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* COLUNA DIREITA: RESUMO + PAGAMENTO */}
          <aside className="carrinho-resumo-col">
            <div className="carrinho-resumo-card">
              <h3>Resumo</h3>

              <div className="resumo-lista">
                {itens.length === 0 ? (
                  <p className="resumo-vazio">Nenhum item selecionado</p>
                ) : (
                  itens.map((item) => (
                    <div key={item.id} className="resumo-linha">
                      <span className="resumo-nome">{item.titulo}</span>
                      <span className="resumo-valor">{formatarPreco(item.preco ?? 0)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="resumo-divisor" />

              <div className="resumo-total">
                <span>TOTAL</span>
                <strong>{formatarPreco(total)}</strong>
              </div>

              <div className="pagamento-metodos" role="tablist" aria-label="Método de pagamento">
                <button
                  type="button"
                  role="tab"
                  aria-selected={metodo === 'debito'}
                  className={`pagamento-metodo-btn ${metodo === 'debito' ? 'ativo' : ''}`}
                  onClick={() => handleTrocarMetodo('debito')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  DÉBITO
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={metodo === 'credito'}
                  className={`pagamento-metodo-btn ${metodo === 'credito' ? 'ativo' : ''}`}
                  onClick={() => handleTrocarMetodo('credito')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  CRÉDITO
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={metodo === 'pix'}
                  className={`pagamento-metodo-btn ${metodo === 'pix' ? 'ativo' : ''}`}
                  onClick={() => handleTrocarMetodo('pix')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2L7.5 6.5 12 11l4.5-4.5L12 2zm0 20l4.5-4.5L12 13l-4.5 4.5L12 22zM2 12l4.5 4.5L11 12 6.5 7.5 2 12zm20 0l-4.5-4.5L13 12l4.5 4.5L22 12z" />
                  </svg>
                  PIX
                </button>
              </div>

              {/* FORMULÁRIO DE CARTÃO (DÉBITO / CRÉDITO) */}
              {(metodo === 'debito' || metodo === 'credito') && (
                <div className="pagamento-cartao-form">
                  <div className="pagamento-campo">
                    <label htmlFor="titular">Nome do titular</label>
                    <input
                      id="titular"
                      type="text"
                      placeholder="Ex: ANA MARIA BRAGA"
                      value={nomeTitular}
                      onChange={(e) => setNomeTitular(e.target.value.toUpperCase())}
                      maxLength={40}
                    />
                  </div>

                  <div className="pagamento-campo">
                    <label htmlFor="numero-cartao">Número do cartão</label>
                    <input
                      id="numero-cartao"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 0000 0000 0000 0000"
                      value={numeroCartao}
                      onChange={(e) => setNumeroCartao(formatarNumeroCartao(e.target.value))}
                    />
                  </div>

                  <div className="pagamento-linha-dupla">
                    <div className="pagamento-campo">
                      <label>Validade</label>
                      <div className="validade-inputs">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="MM"
                          maxLength={2}
                          value={mesValidade}
                          onChange={(e) => setMesValidade(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="AA"
                          maxLength={2}
                          value={anoValidade}
                          onChange={(e) => setAnoValidade(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        />
                      </div>
                    </div>

                    <div className="pagamento-campo">
                      <label htmlFor="cvc">CVC</label>
                      <input
                        id="cvc"
                        type="text"
                        inputMode="numeric"
                        placeholder="000"
                        maxLength={4}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ÁREA DO PIX */}
              {metodo === 'pix' && (
                <div className="pagamento-pix-area">
                  {!pixGerado ? (
                    <button
                      type="button"
                      className="btn-gerar-pix"
                      onClick={handleGerarPix}
                      disabled={itens.length === 0 || processando}
                    >
                      GERAR
                    </button>
                  ) : (
                    <div className="pix-qrcode-box">
                      <div className="pix-qrcode-wrap">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(codigoPix)}`}
                          alt="QR Code Pix para pagamento"
                        />
                      </div>

                      <div className={`pix-timer ${tempoRestante === 0 ? 'expirado' : ''}`}>
                        {tempoRestante > 0 ? (
                          <>
                            <span>Tempo restante para pagar</span>
                            <strong>{formatarTempo(tempoRestante)}</strong>
                          </>
                        ) : (
                          <>
                            <span>QR Code expirado</span>
                            <button type="button" className="btn-regerar-pix" onClick={handleGerarPix}>
                              Gerar novo código
                            </button>
                          </>
                        )}
                      </div>

                      {tempoRestante > 0 && (
                        <button type="button" className="btn-copiar-pix" onClick={handleCopiarPix}>
                          {copiado ? 'Código copiado!' : 'Copiar código Pix'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className="btn-confirmar-compra"
                onClick={handleConfirmarCompra}
                disabled={!podeConfirmar}
              >
                {processando ? 'PROCESSANDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

export default Carrinho;