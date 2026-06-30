/**
 * Open the browser/OS print dialog for a single image (AirPrint on iPad,
 * any installed printer on desktop). Real, no backend needed.
 */
export function printImage(dataUrl: string) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><style>
      @page { margin: 10mm; }
      html, body { margin: 0; height: 100%; }
      body { display: flex; align-items: center; justify-content: center; }
      img { max-width: 100%; max-height: 100%; object-fit: contain; }
    </style></head><body><img src="${dataUrl}"></body></html>`,
  )
  doc.close()

  const run = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 1500)
  }
  const img = doc.querySelector('img')
  if (img && !img.complete) img.addEventListener('load', run, { once: true })
  else run()
}
