/**
 * Upload an image to a temporary, no-account host and return a direct link.
 * Used to back the QR-code share (a QR can't hold a full image, only a URL).
 * Files auto-expire; if the upload is blocked (CORS/offline) the caller falls
 * back to the native share sheet.
 */
const ENDPOINT = 'https://litterbox.catbox.moe/resources/internals/api.php'

export async function uploadForQr(file: File): Promise<string> {
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('time', '24h') // expires after 24 hours
  form.append('fileToUpload', file, file.name)

  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 25000)
  try {
    const res = await fetch(ENDPOINT, { method: 'POST', body: form, signal: ctrl.signal })
    if (!res.ok) throw new Error(`업로드 실패 (${res.status})`)
    const text = (await res.text()).trim()
    if (!text.startsWith('http')) throw new Error('서버 응답이 올바르지 않아요')
    return text
  } finally {
    clearTimeout(timeout)
  }
}
