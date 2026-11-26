import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'

type RecortarMidiaProps = {
    arquivo: File
    onCancelar: () => void
    onConfirmar: (imagem: Blob) => Promise<void>
}

export function RecortarMidia({ arquivo, onCancelar, onConfirmar }: RecortarMidiaProps) {
    const [previa] = useState(() => URL.createObjectURL(arquivo))
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [area, setArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    const aoConcluirCrop = useCallback((_area: unknown, pixels: { x: number; y: number; width: number; height: number }) => {
        setArea(pixels)
    }, [])

    const aplicar = async () => {
        if (!area || salvando) return

        setSalvando(true)
        setErro(null)
        try {
            const imagem = new Image()
            imagem.src = previa
            await imagem.decode()

            const canvas = document.createElement('canvas')
            canvas.width = Math.round(area.width)
            canvas.height = Math.round(area.height)
            const contexto = canvas.getContext('2d')
            if (!contexto) throw new Error('Não foi possível recortar a imagem.')

            contexto.drawImage(
                imagem,
                area.x,
                area.y,
                area.width,
                area.height,
                0,
                0,
                canvas.width,
                canvas.height
            )

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', 0.92)
            })
            if (!blob) throw new Error('Não foi possível recortar a imagem.')

            await onConfirmar(blob)
            URL.revokeObjectURL(previa)
        } catch (error) {
            setErro(error instanceof Error ? error.message : 'Não foi possível aplicar o recorte.')
            setSalvando(false)
        }
    }

    const cancelar = () => {
        URL.revokeObjectURL(previa)
        onCancelar()
    }

    return (
        <div className="recortar-midia-overlay" role="dialog" aria-modal="true" aria-labelledby="recortar-midia-titulo">
            <div className="recortar-midia-modal">
                <h2 id="recortar-midia-titulo">Ajustar mídia do jogo</h2>
                <p>Posicione e ajuste o zoom da imagem para a capa.</p>
                <div className="recortar-midia-area">
                    <Cropper
                        image={previa}
                        crop={crop}
                        zoom={zoom}
                        aspect={16 / 9}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={aoConcluirCrop}
                    />
                </div>
                <label className="recortar-midia-zoom">
                    Zoom
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(event) => setZoom(Number(event.target.value))}
                        disabled={salvando}
                    />
                </label>
                {erro && <p className="postar-jogo-erro" role="alert">{erro}</p>}
                <div className="recortar-midia-acoes">
                    <button type="button" onClick={cancelar} disabled={salvando}>Cancelar</button>
                    <button type="button" onClick={aplicar} disabled={!area || salvando}>
                        {salvando ? 'Enviando…' : 'Usar imagem'}
                    </button>
                </div>
            </div>
        </div>
    )
}
