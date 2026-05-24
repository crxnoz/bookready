'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, AlertCircle, Link as LinkIcon, ImagePlus } from 'lucide-react'
import { uploadEditorImage, type UploadKind } from '@/lib/api'
import { cn } from '@/lib/cn'

interface Props {
  label:        string
  value:        string | null
  onChange:     (url: string | null) => void
  kind:         UploadKind
  hint?:        string
  aspectClass?: string  // tailwind aspect class, e.g. 'aspect-[16/9]' or 'aspect-square'
}

export default function ImageUploadField({
  label, value, onChange, kind, hint, aspectClass = 'aspect-[16/9]',
}: Props) {
  const inputRef          = useRef<HTMLInputElement>(null)
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [showUrl, setShowUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState(value ?? '')

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const { url } = await uploadEditorImage(file, kind)
      onChange(url)
      setUrlDraft(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
          {label}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setUrlDraft('') }}
            className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-text hover:text-near-black inline-flex items-center gap-1"
          >
            <X size={11} /> Remove
          </button>
        )}
      </div>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          'relative w-full bg-cream border border-dashed border-[rgba(18,18,18,0.20)] overflow-hidden',
          aspectClass,
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-text gap-1.5 p-4 text-center">
            <ImagePlus size={20} strokeWidth={1.6} />
            <p className="text-[11px]">Drag an image here, or use the button below.</p>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 size={20} className="animate-spin text-near-black" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={onPick}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] border border-near-black bg-near-black text-white px-3 py-1.5 hover:bg-white hover:text-near-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={12} />
          {value ? 'Replace' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={() => setShowUrl(s => !s)}
          className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-text hover:text-near-black inline-flex items-center gap-1"
        >
          <LinkIcon size={11} />
          {showUrl ? 'Hide URL' : 'Use URL instead'}
        </button>
      </div>

      {showUrl && (
        <div className="flex items-center gap-2 border border-[rgba(18,18,18,0.15)] bg-white px-2 focus-within:border-near-black">
          <LinkIcon size={12} className="text-muted-text flex-shrink-0" />
          <input
            type="text"
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            onBlur={() => {
              const v = urlDraft.trim()
              if (v && v !== value) onChange(v)
              else if (!v && value) onChange(null)
            }}
            placeholder="https://…"
            className="w-full bg-transparent py-1.5 text-xs text-near-black focus:outline-none"
          />
        </div>
      )}

      {hint && !error && (
        <p className="text-[10px] text-muted-text">{hint}</p>
      )}
      {error && (
        <p className="text-[10px] text-red-600 flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  )
}
