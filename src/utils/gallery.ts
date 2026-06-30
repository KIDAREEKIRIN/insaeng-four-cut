export interface GalleryItem {
  id: string
  dataUrl: string
  createdAt: number
}

const DB_NAME = 'insaeng-four-cut'
const STORE = 'photos'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveToGallery(dataUrl: string): Promise<GalleryItem> {
  const item: GalleryItem = {
    id: `${Date.now()}-${Math.floor(performance.now())}`,
    dataUrl,
    createdAt: Date.now(),
  }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return item
}

export async function listGallery(): Promise<GalleryItem[]> {
  const db = await openDb()
  const items = await new Promise<GalleryItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as GalleryItem[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteFromGallery(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
