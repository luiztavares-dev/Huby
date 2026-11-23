import { useEffect, useState } from 'react'
import { buscarJogos, type ConteudoApi } from '../../services/home'
import { buscarBiblioteca, removerBiblioteca } from '../../services/usuarios'
import './Biblioteca.css'

export function Biblioteca() {
    const [jogos, setJogos] = useState<ConteudoApi[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        let usuarioId = ''
        try {
            usuarioId = (JSON.parse(localStorage.getItem('huby_user') || '{}') as { id?: string }).id || ''
        } catch {
            usuarioId = ''
        }
        if (!usuarioId) {
            setErro('Entre na sua conta para acessar a biblioteca.')
            setCarregando(false)
            return
        }

        Promise.all([buscarBiblioteca(usuarioId, controller.signal), buscarJogos(controller.signal)])
            .then(([ids, lista]) => setJogos(lista.filter((jogo) => ids.includes(jogo.id))))
            .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                    setErro(error instanceof Error ? error.message : 'Não foi possível carregar sua biblioteca.')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false)
            })
        return () => controller.abort()
    }, [])

    const remover = async (jogoId: string) => {
        let usuarioId = ''
        try {
            usuarioId = (JSON.parse(localStorage.getItem('huby_user') || '{}') as { id?: string }).id || ''
        } catch {
            return
        }
        await removerBiblioteca(usuarioId, jogoId)
        setJogos((lista) => lista.filter((jogo) => jogo.id !== jogoId))
    }

    return (
        <main className="biblioteca">
            <header><h1>Biblioteca</h1></header>
            {carregando && <p>Carregando...</p>}
            {!carregando && erro && <p role="alert">{erro}</p>}
            {!carregando && !erro && jogos.length === 0 && <p className="biblioteca-vazia">Sua biblioteca ainda está vazia.</p>}
            {!carregando && !erro && (
                <div className="biblioteca-lista">
                    {jogos.map((jogo) => (
                        <article key={jogo.id} className="biblioteca-card">
                            <img src={jogo.imagem || '/imagem-polvojam.jpg'} alt="" />
                            <div><strong>{jogo.titulo}</strong><span>{jogo.desenvolvedor}</span></div>
                            {jogo.linkUrl && <a href={jogo.linkUrl} target="_blank" rel="noreferrer">Abrir</a>}
                            <button type="button" onClick={() => remover(jogo.id)}>Remover</button>
                        </article>
                    ))}
                </div>
            )}
        </main>
    )
}
