import type { Metadata } from 'next'
import LegalShell from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Cookie Policy — BookReady',
  description: 'How BookReady uses cookies and similar tracking technologies.',
}

export default function CookiesPage() {
  return (
    <LegalShell eyebrow="Legal" title="Cookie Policy" effectiveDate="May 26, 2026">
      <p>
        This Cookie Policy explains how DaysGraphic LLC (&ldquo;<strong>Company</strong>,&rdquo;{' '}
        &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>,&rdquo; and{' '}
        &ldquo;<strong>our</strong>&rdquo;) uses cookies and similar technologies to
        recognize you when you visit our website at{' '}
        <a href="https://bkrdy.me" target="_blank" rel="noopener noreferrer">
          https://bkrdy.me
        </a>{' '}
        (&ldquo;<strong>Website</strong>&rdquo;). It explains what these technologies
        are and why we use them, as well as your rights to control our use of them.
      </p>
      <p>
        In some cases we may use cookies to collect personal information, or that
        becomes personal information if we combine it with other information.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small data files that are placed on your computer or mobile device
        when you visit a website. Cookies are widely used by website owners in order
        to make their websites work, or to work more efficiently, as well as to
        provide reporting information.
      </p>
      <p>
        Cookies set by the website owner (in this case, DaysGraphic LLC) are called
        &ldquo;first-party cookies.&rdquo; Cookies set by parties other than the
        website owner are called &ldquo;third-party cookies.&rdquo; Third-party
        cookies enable third-party features or functionality to be provided on or
        through the website (e.g., advertising, interactive content, and analytics).
        The parties that set these third-party cookies can recognize your computer
        both when it visits the website in question and also when it visits certain
        other websites.
      </p>

      <h2>Why do we use cookies?</h2>
      <p>
        We use first- and third-party cookies for several reasons. Some cookies are
        required for technical reasons in order for our Website to operate, and we
        refer to these as &ldquo;essential&rdquo; or &ldquo;strictly necessary&rdquo;
        cookies. Other cookies enable us to remember your preferences and to help us
        understand how our Website is used.
      </p>
      <p>
        The cookies and localStorage entries BookReady uses include:
      </p>
      <ul>
        <li>
          <strong>Authentication token</strong> — a Sanctum bearer token stored after
          you sign in, so you stay logged in across requests. Essential.
        </li>
        <li>
          <strong>Tenant identifier</strong> — the workspace ID associated with your
          account, so the editor loads the correct business data. Essential.
        </li>
        <li>
          <strong>Template choice</strong> — your selection during signup, retained
          briefly so we can apply it when your account is created. Essential.
        </li>
        <li>
          <strong>Cross-Site Request Forgery (CSRF) protections</strong> — used by
          authenticated form submissions. Essential.
        </li>
      </ul>
      <p>
        We do not use advertising cookies, cross-site tracking cookies, or third-party
        analytics that profile individual users.
      </p>

      <h2>How can I control cookies?</h2>
      <p>
        BookReady&rsquo;s cookies are essential to the operation of the Services —
        without them, you would not be able to sign in or use the editor. We do not
        present a cookie consent banner because we do not set non-essential or
        advertising cookies.
      </p>
      <p>
        You can still control cookies through your web browser settings. If you choose
        to block or delete the cookies described above, you may not be able to sign in
        to your account, and some functionality of the Website may be restricted.
      </p>

      <h2>How can I control cookies on my browser?</h2>
      <p>
        The means by which you can refuse cookies through your web browser controls
        vary from browser to browser. You should visit your browser&rsquo;s help menu
        for more information. The following is information about how to manage cookies
        on the most popular browsers:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647#zippy=%2Callow-or-block-cookies"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d"
            target="_blank"
            rel="noopener noreferrer"
          >
            Internet Explorer
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
            target="_blank"
            rel="noopener noreferrer"
          >
            Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/en-ie/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd"
            target="_blank"
            rel="noopener noreferrer"
          >
            Edge
          </a>
        </li>
        <li>
          <a
            href="https://help.opera.com/en/latest/web-preferences/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Opera
          </a>
        </li>
      </ul>

      <h2>What about other tracking technologies, like web beacons?</h2>
      <p>
        Cookies are not the only way to recognize or track visitors to a website. We
        may use other, similar technologies from time to time, like web beacons
        (sometimes called &ldquo;tracking pixels&rdquo; or &ldquo;clear gifs&rdquo;).
        These are tiny graphics files that contain a unique identifier that enables us
        to recognize when someone has visited our Website. This allows us, for
        example, to monitor the traffic patterns of users from one page within a
        website to another, to deliver or communicate with cookies, to understand
        whether you have come to the website from an online advertisement displayed on
        a third-party website, to improve site performance, and to measure the success
        of email marketing campaigns. In many instances, these technologies are
        reliant on cookies to function properly, and so declining cookies will impair
        their functioning.
      </p>

      <h2>Do you serve targeted advertising?</h2>
      <p>
        No. BookReady does not serve targeted advertising. We do not sell or share
        your data with advertisers, and we do not allow third-party advertising
        networks to place tracking cookies on our Website.
      </p>

      <h2>How often will you update this Cookie Policy?</h2>
      <p>
        We may update this Cookie Policy from time to time in order to reflect, for
        example, changes to the cookies we use or for other operational, legal, or
        regulatory reasons. Please therefore revisit this Cookie Policy regularly to
        stay informed about our use of cookies and related technologies.
      </p>
      <p>The date at the top of this Cookie Policy indicates when it was last updated.</p>

      <h2>Where can I get further information?</h2>
      <p>
        If you have any questions about our use of cookies or other technologies,
        please email us at{' '}
        <a href="mailto:daysgraphicnyc@gmail.com">daysgraphicnyc@gmail.com</a> or by
        post to:
      </p>
      <p>
        DaysGraphic LLC<br />
        447 Broadway, 2nd Fl. — #3000<br />
        New York, NY 10013-2562
      </p>
    </LegalShell>
  )
}
