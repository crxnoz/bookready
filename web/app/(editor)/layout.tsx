import EditorGuard from '@/components/editor/EditorGuard'

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <EditorGuard>{children}</EditorGuard>
}
