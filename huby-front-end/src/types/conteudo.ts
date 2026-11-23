export type TipoConteudo = 'JOGO' | 'GAME_JAM' | 'EVENTO' | 'COMUNIDADE'

export type ComentarioApi = {
    id: string
    autor: string
    handle: string
    avatar?: string | null
    texto: string
    curtidas: number
    criadoEm?: string | null
    respostas?: ComentarioApi[] | null
}
