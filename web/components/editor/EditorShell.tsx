"use client";

import { EditorProvider } from "@/lib/editorContext";
import EditorSidebar from "./EditorSidebar";
import LivePreview from "./LivePreview";

interface Props {
  children: React.ReactNode;
  slug?: string;
}

export default function EditorShell({
  children,
  slug = "the-fade-room",
}: Props) {
  return (
    <EditorProvider>
      <div className="flex h-screen overflow-hidden bg-cream">
        {/* Left: sidebar */}
        <EditorSidebar slug={slug} />

        {/* Middle: editing panel */}
        <div className="w-[420px] flex-shrink-0 flex flex-col h-full border-r border-[rgba(18,18,18,0.10)] overflow-hidden">
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>

        {/* Right: live preview */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <LivePreview />
        </div>
      </div>
    </EditorProvider>
  );
}
