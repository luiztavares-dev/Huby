const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

function partes(iso?: string | null) {
    if (!iso) return null

    const [ano, mes, dia] = iso.split('-')
    const mesNumero = Number(mes)

    if (!ano || !mes || !dia || Number.isNaN(mesNumero)) return null

    return { ano, mes, mesNumero, dia }
}

export function formatarData(iso?: string | null) {
    const data = partes(iso)
    if (!data) return ''

    return `${data.dia} ${MESES[data.mesNumero - 1]} ${data.ano}`
}

export function formatarPeriodo(inicio?: string | null, fim?: string | null) {
    const dataInicio = partes(inicio)
    const dataFim = partes(fim)

    if (dataInicio && dataFim) {
        if (dataInicio.ano === dataFim.ano && dataInicio.mes === dataFim.mes) {
            if (dataInicio.dia === dataFim.dia) {
                return `${dataInicio.dia} ${MESES[dataInicio.mesNumero - 1]} ${dataInicio.ano}`
            }

            return `${dataInicio.dia}–${dataFim.dia} ${MESES[dataInicio.mesNumero - 1]} ${dataInicio.ano}`
        }

        return `${dataInicio.dia} ${MESES[dataInicio.mesNumero - 1]} – ${dataFim.dia} ${MESES[dataFim.mesNumero - 1]} ${dataFim.ano}`
    }

    if (dataInicio) return formatarData(inicio)

    return 'Comunidade aberta'
}

export function formatarParticipantes(participantes?: number | null) {
    if (typeof participantes !== 'number') return ''

    return `${participantes.toLocaleString('pt-BR')} participantes`
}
