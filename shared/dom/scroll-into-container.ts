/**
 * Scrolls the nearest scrollable ancestor so that the element is visible. Unlike
 * `scrollIntoView` it never moves other ancestors, such as the app frame.
 */
export function scrollIntoContainer(element: HTMLElement, margin = 8) {
  let container = element.parentElement
  while (container) {
    const overflowY = getComputedStyle(container).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') break
    container = container.parentElement
  }
  if (!container) return
  const box = element.getBoundingClientRect()
  const frame = container.getBoundingClientRect()
  if (box.top < frame.top + margin) {
    container.scrollTop -= frame.top + margin - box.top
  } else if (box.bottom > frame.bottom - margin) {
    container.scrollTop += box.bottom - (frame.bottom - margin)
  }
}
