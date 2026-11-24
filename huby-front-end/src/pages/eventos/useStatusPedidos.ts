import { useCallback, useEffect, useMemo, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

import { API_URL } from '../../services/home'
import {
    chavePedidoEquipe,
    statusDoPedido,
    type PedidoEquipeApi,
    type StatusPedidoEquipe
} from '../../services/eventos'

const WS_URL = API_URL.replace(/^http/, 'ws')

export function useStatusPedidos(usuarioId: string, eventoId?: string) {
    const escopo = `${usuarioId}:${eventoId ?? ''}`
    const [dados, setDados] = useState<{ escopo: string; status: Map<string, StatusPedidoEquipe> }>(
        () => ({ escopo, status: new Map() })
    )
    const statusPedidos = useMemo(
        () => dados.escopo === escopo ? dados.status : new Map<string, StatusPedidoEquipe>(),
        [dados, escopo]
    )

    const atualizarStatus = useCallback((
        equipeId?: string | null,
        destinatarioId?: string | null,
        status?: StatusPedidoEquipe
    ) => {
        const chave = chavePedidoEquipe(equipeId, destinatarioId)
        if (!chave || !status) return

        setDados((atuais) => {
            const mapaAtual = atuais.escopo === escopo ? atuais.status : new Map<string, StatusPedidoEquipe>()
            if (mapaAtual.get(chave) === status && atuais.escopo === escopo) return atuais
            const proximos = new Map(mapaAtual)
            proximos.set(chave, status)
            return { escopo, status: proximos }
        })
    }, [escopo])

    const carregarPedidos = useCallback((pedidos: PedidoEquipeApi[]) => {
        setDados((atuais) => {
            const mapaAtual = atuais.escopo === escopo ? atuais.status : new Map<string, StatusPedidoEquipe>()
            const proximos = new Map(mapaAtual)

            for (const pedido of pedidos) {
                const chave = chavePedidoEquipe(pedido.equipeId, pedido.destinatarioId)
                if (chave && !proximos.has(chave)) {
                    proximos.set(chave, statusDoPedido(pedido))
                }
            }

            return { escopo, status: proximos }
        })
    }, [escopo])

    useEffect(() => {
        if (!usuarioId || !eventoId) return

        const client = new Client({
            webSocketFactory: () => new SockJS(`${WS_URL}/ws`),
            onConnect: () => {
                client.subscribe(`/topic/mensagens/${usuarioId}`, (mensagemRecebida) => {
                    try {
                        const pedido = JSON.parse(mensagemRecebida.body) as PedidoEquipeApi
                        if (pedido.tipo !== 'PEDIDO_EQUIPE'
                            || pedido.remetenteId !== usuarioId
                            || pedido.eventoId !== eventoId) return

                        atualizarStatus(pedido.equipeId, pedido.destinatarioId, statusDoPedido(pedido))
                    } catch {
                        // Ignora mensagens que não são atualizações de pedidos.
                    }
                })
            }
        })

        client.activate()
        return () => {
            client.deactivate()
        }
    }, [usuarioId, eventoId, atualizarStatus])

    return { statusPedidos, carregarPedidos, atualizarStatus }
}
