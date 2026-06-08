'use client'

import { useEditor } from '@/lib/editorContext'
import { GalleryImage } from '@/lib/types'
import { Plus, Trash2, Image } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function GalleryEditor() {
  const { data, updateGallery } = useEditor()

  function addImage() {
    updateGallery([
      ...data.gallery,
      { id: Date.now().toString(), url: '', alt: '' },
    ])
  }

  function updateOne(id: string, updates: Partial<GalleryImage>) {
    updateGallery(data.gallery.map(g => (g.id === id ? { ...g, ...updates } : g)))
  }

  function deleteOne(id: string) {
    updateGallery(data.gallery.filter(g => g.id !== id))
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Gallery</h2>
        <p className="text-xs text-muted-text">
          {data.gallery.length} image{data.gallery.length !== 1 ? 's' : ''} in your gallery.
        </p>
      </div>

      <div className="space-y-3">
        {data.gallery.map((img, i) => (
          <div
            key={img.id}
            className="flex gap-3 items-start p-3 bg-white border border-hairline-soft"
          >
            {/* Placeholder thumbnail */}
            <div className="w-16 h-16 bg-[#f0ede8] flex items-center justify-center flex-shrink-0">
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
              ) : (
                <Image size={18} className="text-muted-text" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                className="w-full text-sm bg-cream border border-hairline px-3 py-1.5 text-near-black placeholder:text-[#b0a99f] focus:outline-none focus:border-near-black/30"
                placeholder="Paste a link to your image"
                value={img.url}
                onChange={e => updateOne(img.id, { url: e.target.value })}
              />
              <input
                className="w-full text-sm bg-cream border border-hairline px-3 py-1.5 text-near-black placeholder:text-[#b0a99f] focus:outline-none focus:border-near-black/30"
                placeholder="Image description (for screen readers)"
                value={img.alt}
                onChange={e => updateOne(img.id, { alt: e.target.value })}
              />
            </div>

            <button
              onClick={() => deleteOne(img.id)}
              className="p-1.5 text-muted-text hover:text-danger transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <Button variant="secondary" size="sm" onClick={addImage}>
        <Plus size={14} className="mr-1.5" />
        Add Image
      </Button>

      <p className="text-xs text-muted-text pt-2">
        Photo upload (drag and drop) coming soon.
      </p>
    </div>
  )
}
