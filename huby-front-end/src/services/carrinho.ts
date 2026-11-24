 export interface ItemCarrinhoApi {
  id: string;
  titulo: string;
  imagem: string;
  tags?: string[];
  preco?: number;
}

const API_URL = 'http://localhost:8080/api/carrinho';

export async function buscarCarrinho(usuarioId: string): Promise<ItemCarrinhoApi[]> {
  const res = await fetch(`${API_URL}/${usuarioId}`);
  if (!res.ok) throw new Error('Não foi possível carregar o carrinho.');
  return res.json();
}

export async function adicionarAoCarrinho(usuarioId: string, jogoId: string): Promise<ItemCarrinhoApi[]> {
  const res = await fetch(`${API_URL}/${usuarioId}/adicionar/${jogoId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Não foi possível adicionar o jogo ao carrinho.');
  return res.json();
}

export async function removerDoCarrinho(usuarioId: string, jogoId: string): Promise<ItemCarrinhoApi[]> {
  const res = await fetch(`${API_URL}/${usuarioId}/remover/${jogoId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Não foi possível remover o jogo.');
  return res.json();
}

export async function limparCarrinho(usuarioId: string): Promise<void> {
  const res = await fetch(`${API_URL}/${usuarioId}/limpar`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Não foi possível limpar o carrinho.');
}