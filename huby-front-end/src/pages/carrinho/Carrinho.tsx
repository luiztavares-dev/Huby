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

const formatarPreco = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export function Carrinho() {
  const navigate = useNavigate();
  const [usuario] = useState(() => usuarioLogado());
  const [itens, setItens] = useState<ItemCarrinhoApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

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

  const total = useMemo(
    () => itens.reduce((acc, item) => acc + (item.preco ?? 0), 0),
    [itens]
  );

  const handleExcluirJogo = async (jogoId: string) => {
    if (!usuario.id || processando) return;
    setProcessando(true);
    setAviso(null);
    try {
      const atualizados = await removerDoCarrinho(usuario.id, jogoId);
      setItens(atualizados);
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
    } catch {
      setAviso({ tipo: 'erro', texto: 'Erro ao limpar o carrinho.' });
    } finally {
      setProcessando(false);
    }
  };

  const handleConfirmarCompra = async () => {
    if (!usuario.id || itens.length === 0 || processando) return;
    setProcessando(true);
    setAviso(null);

    try {
      for (const item of itens) {
        await comprarJogo(usuario.id, item.id);
      }

      
      await limparCarrinho(usuario.id);
      setItens([]);
      setAviso({
        tipo: 'sucesso',
        texto: 'Compra confirmada! Os jogos foram salvos na sua conta.',
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
          {/* COLUNA ESQUERDA: LISTA DE ITENS */}
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

          {/* COLUNA DIREITA: RESUMO */}
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

              <button
                type="button"
                className="btn-confirmar-compra"
                onClick={handleConfirmarCompra}
                disabled={itens.length === 0 || processando}
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