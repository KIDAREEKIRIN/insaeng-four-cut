function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Remove the background from a single cut image (runs an ONNX model in the
 * browser; the model is fetched from a CDN on first use). Returns a transparent
 * PNG data URL so the subject sits on the frame color.
 */
export async function removeBg(src: string): Promise<string> {
  // dynamic import: the heavy model/runtime only loads when the user opts in
  const { removeBackground } = await import('@imgly/background-removal')
  const blob = await removeBackground(src)
  return blobToDataUrl(blob)
}
