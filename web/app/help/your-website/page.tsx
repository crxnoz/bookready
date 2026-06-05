import type { Metadata } from 'next'
import HelpArticle from '@/components/help/HelpArticle'

export const metadata: Metadata = {
  title: 'Your website — BookReady Help',
  description: 'Edit your public booking page on BookReady: header, content, gallery, footer, templates, and live preview.',
}

export default function Page() {
  return (
    <HelpArticle
      slug="your-website"
      intro="Your booking page is the first thing clients see. The Website editor lets you shape every part of it — and a live preview shows your changes instantly."
    >
      <h2>Where to find it</h2>
      <p>
        Open <strong>Website</strong> from the main menu. You&rsquo;ll see your
        editing controls on the left and a live preview of your page on the
        right. The preview updates every time you save, so you always know
        exactly how clients will see it.
      </p>

      <h2>The tabs</h2>
      <p>The Website editor is organized into tabs:</p>
      <ul>
        <li><strong>Overview</strong> — the big picture and quick toggles for which sections appear.</li>
        <li><strong>Header</strong> — your business name, tagline, logo, and the hero image at the top of the page.</li>
        <li><strong>Content</strong> — your About blurb, the &ldquo;Advice&rdquo; and &ldquo;Timeline&rdquo; blocks, and your policies.</li>
        <li><strong>Additionals</strong> — extra sections like before-and-after results and your gallery.</li>
        <li><strong>Footer</strong> — what shows at the bottom: contact details, social links, and fine print.</li>
      </ul>

      <div className="help-note">
        <p><strong>Advice &amp; Timeline</strong></p>
        <p>These two blocks let you set expectations — &ldquo;how to prep for your appointment&rdquo; and &ldquo;what happens on the day.&rdquo; They cut down on no-shows and first-visit nerves.</p>
      </div>

      <h2>Showing and hiding sections</h2>
      <p>
        Every section of your page can be turned on or off. Use the toggles in
        the Overview tab to hide anything you&rsquo;re not ready to fill in — an
        empty gallery looks worse than no gallery. A few core sections (your
        header, the booking button, and footer) always stay on.
      </p>

      <h2>Photos &amp; the gallery</h2>
      <p>
        Upload photos in the <strong>Additionals</strong> tab. A tight set of
        five to eight strong photos converts better than a sprawling album — pick
        your best work. You can also add before-and-after pairs to show results.
      </p>

      <h2>Templates</h2>
      <p>
        Your page uses a template — a designed look chosen at signup. It controls
        fonts, colors, and layout so your page looks polished without any design
        work from you. You can switch templates later from your settings; your
        content carries over.
      </p>

      <h2>Previewing &amp; publishing</h2>
      <p>
        Changes save as you go and appear in the live preview immediately. There&rsquo;s
        no separate &ldquo;publish&rdquo; step during your trial — your page is
        live the whole time. To see it exactly as a client would, click{' '}
        <strong>View site</strong> at the top of the dashboard, or visit{' '}
        <code>yourbusiness.bkrdy.me</code> directly.
      </p>
    </HelpArticle>
  )
}
