/**
 * Fecha o teclado virtual ao tocar fora de um campo de texto.
 *
 * - Toque em área vazia: tira o foco já no toque.
 * - Toque em botão ou link: tira o foco só depois do clique. Fechar o teclado antes mudaria
 *   a altura da tela no meio do toque e o clique poderia cair em outro elemento.
 */
const TEXT_FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]), textarea, select, [contenteditable=""], [contenteditable="true"]'
const INTERACTIVE = 'button, a[href], label, summary, [role=button], [role=radio]'

function focusedField(): HTMLElement | null {
  const el = document.activeElement
  return el instanceof HTMLElement && el.matches(TEXT_FIELD) ? el : null
}

export function installKeyboardDismiss(): void {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const field = focusedField()
      if (!field || e.pointerType === 'mouse') return
      const target = e.target instanceof Element ? e.target : null
      if (!target || target.closest(TEXT_FIELD) || target.closest(INTERACTIVE)) return
      field.blur()
    },
    { passive: true },
  )

  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null
    if (!target || target.closest(TEXT_FIELD)) return
    // Rótulos de campos de texto devolvem o foco ao campo; não fechar nesse caso.
    const label = target.closest('label')
    if (label?.control && label.control.matches(TEXT_FIELD)) return
    if (!target.closest(INTERACTIVE)) return
    setTimeout(() => focusedField()?.blur(), 0)
  })
}
