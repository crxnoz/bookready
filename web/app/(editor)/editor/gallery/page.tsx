import { redirect } from 'next/navigation'

// Gallery management lives inside the Website Editor as its own tab.
// Anyone landing on the old standalone /editor/gallery URL is sent there.
export default function GalleryRedirect() {
  redirect('/editor/website?tab=gallery')
}
