export type UsuarioLocal = {
    id: string
    username: string
}

export function usuarioLogado(): UsuarioLocal {
    try {
        const dados = localStorage.getItem('huby_user')
        if (!dados) return { id: '', username: '' }

        const usuario = JSON.parse(dados) as { id?: string; username?: string; login?: string }

        return {
            id: usuario.id || '',
            username: (usuario.username || usuario.login || '').replace(/^[@#]+/, '')
        }
    } catch {
        return { id: '', username: '' }
    }
}
