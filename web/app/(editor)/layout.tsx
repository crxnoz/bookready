import EditorGuard from '@/components/editor/EditorGuard'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <EditorGuard>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </EditorGuard>
  )
}
