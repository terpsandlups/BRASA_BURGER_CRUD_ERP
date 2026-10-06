import { useEffect, useId, useRef } from 'react'

export default function SidePanel({ aberto, onFechar, titulo, children }) {
  const dialogRef = useRef(null)
  const tituloId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!aberto) { if (dialog.open) dialog.close(); return }
    const focoAnterior = document.activeElement
    const overflowAnterior = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflowAnterior
      if (focoAnterior?.isConnected) focoAnterior.focus()
    }
  }, [aberto])

  return (
    <dialog ref={dialogRef} aria-labelledby={tituloId}
      onCancel={event => { event.preventDefault(); onFechar() }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onFechar()
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md p-0 bg-branco text-texto border-l border-borda backdrop:bg-carvao/40">
      <div className="flex items-center justify-between px-6 py-5 border-b border-borda">
        <h3 id={tituloId} className="font-display text-xl text-texto break-all">{titulo}</h3>
        <button type="button" autoFocus onClick={onFechar} aria-label="Fechar painel" className="text-fumaca hover:text-texto text-2xl leading-none ml-3">×</button>
      </div>
      <div className="p-6 overflow-y-auto">{aberto && children}</div>
    </dialog>
  )
}
