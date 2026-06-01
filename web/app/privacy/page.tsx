import type { Metadata } from 'next'
import LegalShell from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Privacy Policy — BookReady',
  description: 'How BookReady collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="Legal" title="Privacy Policy" effectiveDate="May 26, 2026">
      <p>
        This Privacy Notice for DaysGraphic LLC (doing business as BookReady)
        (&ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>,&rdquo; or{' '}
        &ldquo;<strong>our</strong>&rdquo;) describes how and why we might access,
        collect, store, use, and/or share (&ldquo;<strong>process</strong>&rdquo;)
        your personal information when you use our services
        (&ldquo;<strong>Services</strong>&rdquo;), including when you:
      </p>
      <ul>
        <li>
          Visit our website at{' '}
          <a href="https://bkrdy.me" target="_blank" rel="noopener noreferrer">
            https://bkrdy.me
          </a>
          , or any website of ours that links to this Privacy Notice.
        </li>
        <li>
          Use BookReady platform services. BookReady provides subscription-based
          business management and booking website services, including appointment
          scheduling, customer management, payment and deposit features, automated
          communications, digital content hosting, website templates, business
          automation tools, and analytics designed for beauty and service-based
          businesses.
        </li>
        <li>
          Create a BookReady customer account at{' '}
          <a href="https://app.bkrdy.me/account">app.bkrdy.me/account</a>{' '}
          to manage bookings across multiple BookReady-powered businesses from
          a single sign-in.
        </li>
        <li>Engage with us in other related ways, including any marketing or events.</li>
      </ul>

      <h2>A note on two kinds of users</h2>
      <p>
        BookReady is used by two distinct groups, and we process their
        information differently:
      </p>
      <ul>
        <li>
          <strong>Business owners</strong> — the salons, barbers, and other
          beauty professionals who subscribe to BookReady to run their booking
          site. We are the data controller for their account information
          (email, password, profile, subscription) and the data processor for
          the customer records they store in their workspace.
        </li>
        <li>
          <strong>End-clients</strong> — the people who book appointments
          through a business&rsquo;s public booking site. When you book without
          creating an account, your information (name, contact details, the
          booking itself) is held in the business&rsquo;s workspace and they
          are the data controller — we process it on their behalf. When you
          create a free BookReady customer account to manage your bookings
          across multiple businesses, we additionally hold your account
          identity (email, password hash, name, phone, optional preferences) as
          a data controller in our own right. The two records are linked but
          remain logically separate: each business sees their own slice of
          your activity, never another business&rsquo;s.
        </li>
      </ul>
      <p>
        <strong>Questions or concerns?</strong> Reading this Privacy Notice will help
        you understand your privacy rights and choices. We are responsible for making
        decisions about how your personal information is processed. If you do not
        agree with our policies and practices, please do not use our Services. If you
        still have any questions or concerns, please contact us at{' '}
        <a href="mailto:privacy@mybookready.com">privacy@mybookready.com</a>.
      </p>

      <h2>Summary of key points</h2>
      <p>
        <em>
          This summary provides key points from our Privacy Notice. You can find more
          details about any topic by clicking the link following each key point or by
          using the table of contents below.
        </em>
      </p>
      <p>
        <strong>What personal information do we process?</strong> When you visit, use,
        or navigate our Services, we may process personal information depending on how
        you interact with us, the choices you make, and the products and features you
        use. See{' '}
        <a href="#personalinfo">personal information you disclose to us</a>.
      </p>
      <p>
        <strong>Do we process any sensitive personal information?</strong> Some
        information may be considered &ldquo;special&rdquo; or &ldquo;sensitive&rdquo;
        in certain jurisdictions, for example your racial or ethnic origins, sexual
        orientation, and religious beliefs. <strong>We do not process sensitive
        personal information.</strong>
      </p>
      <p>
        <strong>Do we collect any information from third parties?</strong> We may
        collect information from public databases, marketing partners, social media
        platforms, and other outside sources. See{' '}
        <a href="#othersources">information collected from other sources</a>.
      </p>
      <p>
        <strong>How do we process your information?</strong> We process your
        information to provide, improve, and administer our Services, communicate with
        you, for security and fraud prevention, and to comply with law. We may also
        process your information for other purposes with your consent. We process your
        information only when we have a valid legal reason to do so. See{' '}
        <a href="#infouse">how we process your information</a>.
      </p>
      <p>
        <strong>In what situations and with which parties do we share personal
        information?</strong> We may share information in specific situations and with
        specific third parties. See{' '}
        <a href="#whoshare">when and with whom we share your personal information</a>.
      </p>
      <p>
        <strong>How do we keep your information safe?</strong> We have adequate
        organizational and technical processes and procedures in place to protect your
        personal information. However, no electronic transmission over the internet or
        information storage technology can be guaranteed to be 100% secure, so we
        cannot promise or guarantee that hackers, cybercriminals, or other
        unauthorized third parties will not be able to defeat our security and
        improperly collect, access, steal, or modify your information. See{' '}
        <a href="#infosafe">how we keep your information safe</a>.
      </p>
      <p>
        <strong>What are your rights?</strong> Depending on where you are located
        geographically, the applicable privacy law may mean you have certain rights
        regarding your personal information. See{' '}
        <a href="#privacyrights">your privacy rights</a>.
      </p>
      <p>
        <strong>How do you exercise your rights?</strong> The easiest way to exercise
        your rights is by contacting us at{' '}
        <a href="mailto:privacy@mybookready.com">privacy@mybookready.com</a>. We will
        consider and act upon any request in accordance with applicable data
        protection laws.
      </p>

      <h2 id="toc">Table of contents</h2>
      <ol>
        <li><a href="#infocollect">What information do we collect?</a></li>
        <li><a href="#infouse">How do we process your information?</a></li>
        <li><a href="#whoshare">When and with whom do we share your personal information?</a></li>
        <li><a href="#cookies">Do we use cookies and other tracking technologies?</a></li>
        <li><a href="#sociallogins">How do we handle your social logins?</a></li>
        <li><a href="#inforetain">How long do we keep your information?</a></li>
        <li><a href="#infosafe">How do we keep your information safe?</a></li>
        <li><a href="#infominors">Do we collect information from minors?</a></li>
        <li><a href="#privacyrights">What are your privacy rights?</a></li>
        <li><a href="#dnt">Controls for do-not-track features</a></li>
        <li><a href="#uslaws">Do United States residents have specific privacy rights?</a></li>
        <li><a href="#policyupdates">Do we make updates to this notice?</a></li>
        <li><a href="#contact">How can you contact us about this notice?</a></li>
        <li><a href="#request">How can you review, update, or delete the data we collect from you?</a></li>
      </ol>

      <h2 id="infocollect">1. What information do we collect?</h2>

      <h3 id="personalinfo">Personal information you disclose to us</h3>
      <p>
        <strong><em>In short:</em></strong> <em>We collect personal information that
        you provide to us.</em>
      </p>
      <p>
        We collect personal information that you voluntarily provide to us when you
        register on the Services, express an interest in obtaining information about
        us or our products and Services, when you participate in activities on the
        Services, or otherwise when you contact us.
      </p>
      <p>
        <strong>Personal Information Provided by You.</strong> The personal
        information that we collect depends on the context of your interactions with
        us and the Services, the choices you make, and the products and features you
        use. The personal information we collect may include the following:
      </p>
      <ul>
        <li>names</li>
        <li>phone numbers</li>
        <li>email addresses</li>
        <li>passwords</li>
        <li>contact or authentication data</li>
        <li>billing addresses</li>
        <li>debit/credit card numbers</li>
        <li>contact preferences</li>
        <li>Stripe Connect onboarding information for business owners who accept customer payments</li>
        <li>business name and business profile details</li>
        <li>appointment details</li>
        <li>photos and uploaded images</li>
      </ul>
      <p>
        <strong>Sensitive Information.</strong> We do not process sensitive
        information.
      </p>
      <p>
        <strong>Payment Data.</strong> We may collect data necessary to process your
        payment if you choose to make purchases, such as your payment instrument
        number, and the security code associated with your payment instrument. All
        payment data is handled and stored by Stripe. You may find their privacy
        notice here:{' '}
        <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
          https://stripe.com/privacy
        </a>
        .
      </p>
      <p>
        <strong>Social Media Login Data.</strong> We may provide you with the option
        to register with us using your existing social media account details. If you
        choose to register in this way, we will collect certain profile information
        about you from the social media provider, as described in the section{' '}
        <a href="#sociallogins">How do we handle your social logins?</a> below.
      </p>
      <p>
        All personal information that you provide to us must be true, complete, and
        accurate, and you must notify us of any changes to such personal information.
      </p>

      <h3>Information automatically collected</h3>
      <p>
        <strong><em>In short:</em></strong> <em>Some information — such as your
        Internet Protocol (IP) address and/or browser and device characteristics — is
        collected automatically when you visit our Services.</em>
      </p>
      <p>
        We automatically collect certain information when you visit, use, or navigate
        the Services. This information does not reveal your specific identity (like
        your name or contact information) but may include device and usage
        information, such as your IP address, browser and device characteristics,
        operating system, language preferences, referring URLs, device name, country,
        location, information about how and when you use our Services, and other
        technical information. This information is primarily needed to maintain the
        security and operation of our Services, and for our internal analytics and
        reporting purposes.
      </p>
      <p>
        Like many businesses, we also collect information through cookies and similar
        technologies. See section{' '}
        <a href="#cookies">Do we use cookies and other tracking technologies?</a>{' '}
        for a summary, or our full{' '}
        <a href="/cookies">Cookie Policy</a> for details.
      </p>
      <p>The information we collect includes:</p>
      <ul>
        <li>
          <em>Log and Usage Data.</em> Service-related, diagnostic, usage, and
          performance information our servers automatically collect when you access or
          use our Services. Depending on how you interact with us, this log data may
          include your IP address, device information, browser type, settings, and
          information about your activity in the Services (such as date/time stamps,
          pages and files viewed, searches, and other actions you take), device event
          information (such as system activity, error reports, and hardware settings).
        </li>
        <li>
          <em>Device Data.</em> Information about your computer, phone, tablet, or
          other device you use to access the Services. Depending on the device used,
          this may include your IP address (or proxy server), device and application
          identification numbers, location, browser type, hardware model, Internet
          service provider and/or mobile carrier, operating system, and system
          configuration information.
        </li>
        <li>
          <em>Location Data.</em> Information about your device&rsquo;s location,
          which can be either precise or imprecise. How much information we collect
          depends on the type and settings of the device you use to access the
          Services. You can opt out of allowing us to collect this information either
          by refusing access to the information or by disabling your Location setting
          on your device. However, if you choose to opt out, you may not be able to
          use certain aspects of the Services.
        </li>
      </ul>

      <h3>Google API</h3>
      <p>
        Our use of information received from Google APIs will adhere to the{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy#limited-use"
          target="_blank"
          rel="noopener noreferrer"
        >
          Limited Use requirements
        </a>
        .
      </p>

      <h3 id="othersources">Information collected from other sources</h3>
      <p>
        <strong><em>In short:</em></strong> <em>We may collect limited data from
        public databases, marketing partners, social media platforms, and other
        outside sources.</em>
      </p>
      <p>
        In order to enhance our ability to provide relevant marketing, offers, and
        services to you and update our records, we may obtain information about you
        from other sources, such as public databases, joint marketing partners,
        affiliate programs, data providers, social media platforms, and other third
        parties. This information includes mailing addresses, job titles, email
        addresses, phone numbers, intent data (or user behavior data), Internet
        Protocol (IP) addresses, social media profiles, social media URLs, and custom
        profiles, for purposes of targeted advertising and event promotion.
      </p>
      <p>
        If you interact with us on a social media platform using your social media
        account (e.g., Facebook or X), we receive personal information about you from
        such platforms such as your name, email address, and gender. You may have the
        right to withdraw your consent to processing your personal information. See{' '}
        <a href="#withdrawconsent">withdrawing your consent</a>. Any personal
        information that we collect from your social media account depends on your
        social media account&rsquo;s privacy settings. Please note that their own use
        of your information is not governed by this Privacy Notice.
      </p>

      <h2 id="infouse">2. How do we process your information?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>We process your information to
        provide, improve, and administer our Services, communicate with you, for
        security and fraud prevention, and to comply with law. We may also process
        your information for other purposes with your consent.</em>
      </p>
      <p>
        <strong>We process your personal information for a variety of reasons,
        depending on how you interact with our Services, including:</strong>
      </p>
      <ul>
        <li>
          <strong>To facilitate account creation and authentication and otherwise
          manage user accounts.</strong> We may process your information so you can
          create and log in to your account, as well as keep your account in working
          order.
        </li>
        <li>
          <strong>To deliver and facilitate delivery of services to the user.</strong>{' '}
          We may process your information to provide you with the requested service.
        </li>
        <li>
          <strong>To respond to user inquiries and offer support to users.</strong> We
          may process your information to respond to your inquiries and solve any
          potential issues you might have with the requested service.
        </li>
        <li>
          <strong>To send administrative information to you.</strong> We may process
          your information to send you details about our products and services,
          changes to our terms and policies, and other similar information.
        </li>
        <li>
          <strong>To fulfill and manage your orders.</strong> We may process your
          information to fulfill and manage your orders, payments, returns, and
          exchanges made through the Services.
        </li>
        <li>
          <strong>To enable user-to-user communications.</strong> We may process your
          information if you choose to use any of our offerings that allow for
          communication with another user.
        </li>
        <li>
          <strong>To request feedback.</strong> We may process your information when
          necessary to request feedback and to contact you about your use of our
          Services.
        </li>
        <li>
          <strong>To send you marketing and promotional communications.</strong> We
          may process the personal information you send to us for our marketing
          purposes, if this is in accordance with your marketing preferences. You can
          opt out of our marketing emails at any time. For more information, see{' '}
          <a href="#privacyrights">What are your privacy rights?</a> below.
        </li>
        <li>
          <strong>To post testimonials.</strong> We post testimonials on our Services
          that may contain personal information.
        </li>
        <li>
          <strong>To protect our Services.</strong> We may process your information as
          part of our efforts to keep our Services safe and secure, including fraud
          monitoring and prevention.
        </li>
        <li>
          <strong>To evaluate and improve our Services, products, marketing, and your
          experience.</strong> We may process your information when we believe it is
          necessary to identify usage trends, determine the effectiveness of our
          promotional campaigns, and to evaluate and improve our Services, products,
          marketing, and your experience.
        </li>
        <li>
          <strong>To identify usage trends.</strong> We may process information about
          how you use our Services to better understand how they are being used so we
          can improve them.
        </li>
        <li>
          <strong>To comply with our legal obligations.</strong> We may process your
          information to comply with our legal obligations, respond to legal requests,
          and exercise, establish, or defend our legal rights.
        </li>
      </ul>

      <h2 id="whoshare">3. When and with whom do we share your personal information?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>We may share information in specific
        situations described in this section and/or with the following third
        parties.</em>
      </p>
      <p>
        <strong>Vendors, Consultants, and Other Third-Party Service Providers.</strong>{' '}
        We may share your data with third-party vendors, service providers,
        contractors, or agents (&ldquo;<strong>third parties</strong>&rdquo;) who
        perform services for us or on our behalf and require access to such
        information to do that work. We have contracts in place with our third
        parties, which are designed to help safeguard your personal information. This
        means that they cannot do anything with your personal information unless we
        have instructed them to do it. They will also not share your personal
        information with any organization apart from us. They also commit to protect
        the data they hold on our behalf and to retain it for the period we instruct.
      </p>
      <p>The third parties we may share personal information with are as follows:</p>
      <ul>
        <li><strong>Invoice and Billing</strong> — Stripe</li>
        <li><strong>User Account Registration and Authentication</strong> — Google Sign-In</li>
        <li><strong>Transactional Email Delivery</strong> — Resend</li>
        <li><strong>Cloud Storage</strong> — Cloudflare R2 (uploaded photos and media)</li>
        <li><strong>Cloud Hosting</strong> — DigitalOcean</li>
      </ul>
      <p>We also may need to share your personal information in the following situations:</p>
      <ul>
        <li>
          <strong>Business Transfers.</strong> We may share or transfer your
          information in connection with, or during negotiations of, any merger, sale
          of company assets, financing, or acquisition of all or a portion of our
          business to another company.
        </li>
      </ul>

      <h2 id="cookies">4. Do we use cookies and other tracking technologies?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>We may use cookies and other tracking
        technologies to collect and store your information.</em>
      </p>
      <p>
        We may use cookies and similar tracking technologies (like web beacons and
        pixels) to gather information when you interact with our Services. Some online
        tracking technologies help us maintain the security of our Services and your
        account, prevent crashes, fix bugs, save your preferences, and assist with
        basic site functions.
      </p>
      <p>
        We also permit third parties and service providers to use online tracking
        technologies on our Services for analytics and advertising, including to help
        manage and display advertisements, to tailor advertisements to your interests,
        or to send abandoned shopping cart reminders (depending on your communication
        preferences). The third parties and service providers use their technology to
        provide advertising about products and services tailored to your interests
        which may appear either on our Services or on other websites.
      </p>
      <p>
        To the extent these online tracking technologies are deemed to be a
        &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; (which includes targeted
        advertising, as defined under the applicable laws) under applicable US state
        laws, you can opt out of these online tracking technologies by submitting a
        request as described below under section{' '}
        <a href="#uslaws">Do United States residents have specific privacy rights?</a>
      </p>
      <p>
        Most web browsers are set to accept cookies by default. If you prefer, you can
        usually choose to set your browser to remove cookies and to reject cookies. If
        you choose to remove cookies or reject cookies, this could affect certain
        features or services of our Services.
      </p>

      <h3>Google Analytics</h3>
      <p>
        We may share your information with Google Analytics to track and analyze the
        use of the Services. To opt out of being tracked by Google Analytics across
        the Services, visit{' '}
        <a
          href="https://tools.google.com/dlpage/gaoptout"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://tools.google.com/dlpage/gaoptout
        </a>
        . For more information on the privacy practices of Google, please visit the{' '}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Privacy &amp; Terms page
        </a>
        .
      </p>

      <h2 id="sociallogins">5. How do we handle your social logins?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>If you choose to register or log in to
        our Services using a social media account, we may have access to certain
        information about you.</em>
      </p>
      <p>
        Our Services offer you the ability to register and log in using your
        third-party social media account details (like your Google account). Where you
        choose to do this, we will receive certain profile information about you from
        your social media provider. The profile information we receive may vary
        depending on the social media provider concerned, but will often include your
        name and email address, as well as other information you choose to make public
        on such a social media platform.
      </p>
      <p>
        We will use the information we receive only for the purposes that are
        described in this Privacy Notice or that are otherwise made clear to you on
        the relevant Services. Please note that we do not control, and are not
        responsible for, other uses of your personal information by your third-party
        social media provider. We recommend that you review their privacy notice to
        understand how they collect, use, and share your personal information, and how
        you can set your privacy preferences on their sites and apps.
      </p>

      <h2 id="inforetain">6. How long do we keep your information?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>We keep your information for as long
        as necessary to fulfill the purposes outlined in this Privacy Notice unless
        otherwise required by law.</em>
      </p>
      <p>
        We will only keep your personal information for as long as it is necessary for
        the purposes set out in this Privacy Notice, unless a longer retention period
        is required or permitted by law (such as tax, accounting, or other legal
        requirements). No purpose in this notice will require us keeping your personal
        information for longer than three (3) months past the termination of the
        user&rsquo;s account.
      </p>
      <p>
        When we have no ongoing legitimate business need to process your personal
        information, we will either delete or anonymize such information, or, if this
        is not possible (for example, because your personal information has been
        stored in backup archives), then we will securely store your personal
        information and isolate it from any further processing until deletion is
        possible.
      </p>

      <h2 id="infosafe">7. How do we keep your information safe?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>We aim to protect your personal
        information through a system of organizational and technical security
        measures.</em>
      </p>
      <p>
        We have implemented appropriate and reasonable technical and organizational
        security measures designed to protect the security of any personal information
        we process. However, despite our safeguards and efforts to secure your
        information, no electronic transmission over the Internet or information
        storage technology can be guaranteed to be 100% secure, so we cannot promise
        or guarantee that hackers, cybercriminals, or other unauthorized third parties
        will not be able to defeat our security and improperly collect, access, steal,
        or modify your information. Although we will do our best to protect your
        personal information, transmission of personal information to and from our
        Services is at your own risk. You should only access the Services within a
        secure environment.
      </p>

      <h2 id="infominors">8. Do we collect information from minors?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>We do not knowingly collect data from
        or market to children under 18 years of age.</em>
      </p>
      <p>
        We do not knowingly collect, solicit data from, or market to children under 18
        years of age, nor do we knowingly sell such personal information. By using the
        Services, you represent that you are at least 18 or that you are the parent or
        guardian of such a minor and consent to such minor dependent&rsquo;s use of
        the Services. If we learn that personal information from users less than 18
        years of age has been collected, we will deactivate the account and take
        reasonable measures to promptly delete such data from our records. If you
        become aware of any data we may have collected from children under age 18,
        please contact us at{' '}
        <a href="mailto:privacy@mybookready.com">privacy@mybookready.com</a>.
      </p>

      <h2 id="privacyrights">9. What are your privacy rights?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>You may review, change, or terminate
        your account at any time, depending on your country, province, or state of
        residence.</em>
      </p>
      <p id="withdrawconsent">
        <strong><u>Withdrawing your consent:</u></strong> If we are relying on your
        consent to process your personal information, which may be express and/or
        implied consent depending on the applicable law, you have the right to
        withdraw your consent at any time. You can withdraw your consent at any time
        by contacting us using the contact details provided in the section{' '}
        <a href="#contact">How can you contact us about this notice?</a> below.
      </p>
      <p>
        However, please note that this will not affect the lawfulness of the
        processing before its withdrawal nor, when applicable law allows, will it
        affect the processing of your personal information conducted in reliance on
        lawful processing grounds other than consent.
      </p>
      <p>
        <strong><u>Opting out of marketing and promotional communications:</u></strong>{' '}
        You can unsubscribe from our marketing and promotional communications at any
        time by clicking on the unsubscribe link in the emails that we send, replying
        &ldquo;STOP&rdquo; or &ldquo;UNSUBSCRIBE&rdquo; to the SMS messages that we
        send, or by contacting us using the details provided in the section{' '}
        <a href="#contact">How can you contact us about this notice?</a> below. You
        will then be removed from the marketing lists. However, we may still
        communicate with you — for example, to send you service-related messages that
        are necessary for the administration and use of your account, to respond to
        service requests, or for other non-marketing purposes.
      </p>
      <p>
        No mobile information will be shared with third parties or affiliates for
        marketing or promotional purposes. Information sharing to subcontractors in
        support services, such as customer service, is permitted. All other use case
        categories exclude text messaging originator opt-in data and consent; this
        information will not be shared with third parties.
      </p>

      <h3>SMS Communications and 10DLC Compliance</h3>
      <p>
        <strong><u>What SMS we send.</u></strong>{' '}
        BookReady sends transactional SMS notifications related to your
        appointments on a BookReady-powered booking site. Categories include:
        appointment confirmations, reminders (typically 24 hours and 2 hours
        before the appointment), cancellation notices, and reschedule notices.
        We do not send marketing or promotional SMS through this consent channel.
      </p>
      <p>
        <strong><u>How we collect your consent.</u></strong>{' '}
        When you book an appointment on a BookReady-powered website, the booking
        form presents an unchecked consent checkbox below the phone-number field
        with the label: &ldquo;Send me SMS reminders for this appointment. Msg
        &amp; data rates may apply. Msg frequency varies. Reply STOP to opt out,
        HELP for help.&rdquo; You must affirmatively check this box before
        submitting the booking. We record the consent action, timestamp, IP
        address, and phone number against the appointment record. No SMS is sent
        to a number without a recorded affirmative consent. Consent is{' '}
        <em>never</em> a condition of completing your booking.
      </p>
      <p>
        <strong><u>Message frequency and rates.</u></strong>{' '}
        Message frequency varies depending on your appointment activity
        (typically 3-5 messages per appointment cycle). Message and data rates
        may apply, charged by your mobile carrier. BookReady is not responsible
        for delayed or undelivered messages caused by your carrier.
      </p>
      <p>
        <strong><u>How to opt out.</u></strong>{' '}
        At any time, reply{' '}
        <strong>STOP, UNSUBSCRIBE, CANCEL, END,</strong> or <strong>QUIT</strong>{' '}
        to any SMS from BookReady to immediately unsubscribe. You will receive
        one final confirmation message acknowledging the opt-out and will not
        receive further SMS from BookReady or any business operating on the
        BookReady platform. To resubscribe, reply <strong>START</strong>. For
        help, reply <strong>HELP</strong> or <strong>INFO</strong>, or contact
        us using the details in the section{' '}
        <a href="#contact">How can you contact us about this notice?</a> below.
      </p>
      <p>
        <strong><u>No sharing of mobile information.</u></strong>{' '}
        BookReady will not share your mobile phone number or SMS opt-in consent
        information with third parties or affiliates for marketing or
        promotional purposes. We do not sell SMS opt-in data. Information may be
        shared only with subcontractors that support our messaging
        infrastructure (for example, our SMS delivery provider, Telnyx) and
        solely for the purpose of delivering the transactional messages you have
        consented to receive.
      </p>
      <p>
        <strong><u>Carrier disclaimer.</u></strong>{' '}
        Wireless carriers are not liable for any delays or failures in the
        delivery of messages sent through our SMS service. Service is available
        on AT&amp;T, Verizon Wireless, T-Mobile, U.S. Cellular, and other
        participating US carriers.
      </p>

      <h3>Account Information</h3>
      <p>
        If you would at any time like to review or change the information in your
        account or terminate your account, you can:
      </p>
      <ul>
        <li>Log in to your account settings and update your user account.</li>
      </ul>
      <p>
        Upon your request to terminate your account, we will deactivate or delete your
        account and information from our active databases. However, we may retain some
        information in our files to prevent fraud, troubleshoot problems, assist with
        any investigations, enforce our legal terms and/or comply with applicable
        legal requirements.
      </p>
      <p>
        If you have questions or comments about your privacy rights, you may email us
        at <a href="mailto:privacy@mybookready.com">privacy@mybookready.com</a>.
      </p>

      <h2 id="dnt">10. Controls for do-not-track features</h2>
      <p>
        Most web browsers and some mobile operating systems and mobile applications
        include a Do-Not-Track (&ldquo;DNT&rdquo;) feature or setting you can activate
        to signal your privacy preference not to have data about your online browsing
        activities monitored and collected. At this stage, no uniform technology
        standard for recognizing and implementing DNT signals has been finalized. As
        such, we do not currently respond to DNT browser signals or any other
        mechanism that automatically communicates your choice not to be tracked
        online. If a standard for online tracking is adopted that we must follow in
        the future, we will inform you about that practice in a revised version of
        this Privacy Notice.
      </p>
      <p>
        California law requires us to let you know how we respond to web browser DNT
        signals. Because there currently is not an industry or legal standard for
        recognizing or honoring DNT signals, we do not respond to them at this time.
      </p>

      <h2 id="uslaws">11. Do United States residents have specific privacy rights?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>If you are a resident of California,
        Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland,
        Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island,
        Tennessee, Texas, Utah, or Virginia, you may have the right to request access
        to and receive details about the personal information we maintain about you
        and how we have processed it, correct inaccuracies, get a copy of, or delete
        your personal information. You may also have the right to withdraw your
        consent to our processing of your personal information. These rights may be
        limited in some circumstances by applicable law. More information is provided
        below.</em>
      </p>

      <h3>Categories of Personal Information We Collect</h3>
      <p>
        The table below shows the categories of personal information we have collected
        in the past twelve (12) months. The table includes illustrative examples of
        each category and does not reflect the personal information we collect from
        you. For a comprehensive inventory of all personal information we process,
        please refer to the section{' '}
        <a href="#infocollect">What information do we collect?</a>.
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Examples</th>
            <th>Collected</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A. Identifiers</td>
            <td>Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>B. Personal information as defined in the California Customer Records statute</td>
            <td>Name, contact information, education, employment, employment history, and financial information</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>C. Protected classification characteristics under state or federal law</td>
            <td>Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data</td>
            <td>NO</td>
          </tr>
          <tr>
            <td>D. Commercial information</td>
            <td>Transaction information, purchase history, financial details, and payment information</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>E. Biometric information</td>
            <td>Fingerprints and voiceprints</td>
            <td>NO</td>
          </tr>
          <tr>
            <td>F. Internet or other similar network activity</td>
            <td>Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>G. Geolocation data</td>
            <td>Device location</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>H. Audio, electronic, sensory, or similar information</td>
            <td>Images and audio, video or call recordings created in connection with our business activities</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>I. Professional or employment-related information</td>
            <td>Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>J. Education Information</td>
            <td>Student records and directory information</td>
            <td>NO</td>
          </tr>
          <tr>
            <td>K. Inferences drawn from collected personal information</td>
            <td>Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual&rsquo;s preferences and characteristics</td>
            <td>NO</td>
          </tr>
          <tr>
            <td>L. Sensitive personal information</td>
            <td>—</td>
            <td>NO</td>
          </tr>
        </tbody>
      </table>
      <p>
        We may also collect other personal information outside of these categories
        through instances where you interact with us in person, online, or by phone or
        mail in the context of:
      </p>
      <ul>
        <li>Receiving help through our customer support channels;</li>
        <li>Participation in customer surveys or contests; and</li>
        <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
      </ul>
      <p>
        We will use and retain the collected personal information as needed to provide
        the Services or for:
      </p>
      <ul>
        <li>Category A — As long as the user has an account with us</li>
        <li>Category B — As long as the user has an account with us</li>
        <li>Category D — As long as the user has an account with us</li>
        <li>Category F — As long as the user has an account with us</li>
        <li>Category G — As long as the user has an account with us</li>
        <li>Category H — As long as the user has an account with us</li>
        <li>Category I — As long as the user has an account with us</li>
      </ul>

      <h3>Sources of Personal Information</h3>
      <p>
        Learn more about the sources of personal information we collect in{' '}
        <a href="#infocollect">What information do we collect?</a>
      </p>

      <h3>How We Use and Share Personal Information</h3>
      <p>
        Learn more about how we use your personal information in the section{' '}
        <a href="#infouse">How do we process your information?</a>
      </p>
      <p><strong>Will your information be shared with anyone else?</strong></p>
      <p>
        We may disclose your personal information with our service providers pursuant
        to a written contract between us and each service provider. Learn more about
        how we disclose personal information in the section{' '}
        <a href="#whoshare">
          When and with whom do we share your personal information?
        </a>
      </p>
      <p>
        We may use your personal information for our own business purposes, such as
        for undertaking internal research for technological development and
        demonstration. This is not considered to be &ldquo;selling&rdquo; of your
        personal information.
      </p>
      <p>
        We have not sold or shared any personal information to third parties for a
        business or commercial purpose in the preceding twelve (12) months. We have
        disclosed the following categories of personal information to third parties
        for a business or commercial purpose in the preceding twelve (12) months:
      </p>
      <ul>
        <li>Category A. Identifiers</li>
        <li>Category B. Personal information as defined in the California Customer Records law</li>
        <li>Category D. Commercial information</li>
        <li>Category F. Internet or other electronic network activity information</li>
        <li>Category G. Geolocation data</li>
        <li>Category H. Audio, electronic, visual, and similar information</li>
        <li>Category I. Professional or employment-related information</li>
      </ul>
      <p>
        The categories of third parties to whom we disclosed personal information for
        a business or commercial purpose can be found under{' '}
        <a href="#whoshare">
          When and with whom do we share your personal information?
        </a>
      </p>

      <h3>Your Rights</h3>
      <p>
        You have rights under certain US state data protection laws. However, these
        rights are not absolute, and in certain cases, we may decline your request as
        permitted by law. These rights include:
      </p>
      <ul>
        <li><strong>Right to know</strong> whether or not we are processing your personal data</li>
        <li><strong>Right to access</strong> your personal data</li>
        <li><strong>Right to correct</strong> inaccuracies in your personal data</li>
        <li><strong>Right to request</strong> the deletion of your personal data</li>
        <li><strong>Right to obtain a copy</strong> of the personal data you previously shared with us</li>
        <li><strong>Right to non-discrimination</strong> for exercising your rights</li>
        <li>
          <strong>Right to opt out</strong> of the processing of your personal data if
          it is used for targeted advertising (or sharing as defined under
          California&rsquo;s privacy law), the sale of personal data, or profiling in
          furtherance of decisions that produce legal or similarly significant effects
          (&ldquo;profiling&rdquo;)
        </li>
      </ul>
      <p>Depending upon the state where you live, you may also have the following rights:</p>
      <ul>
        <li>
          Right to access the categories of personal data being processed (as
          permitted by applicable law, including the privacy law in Minnesota)
        </li>
        <li>
          Right to obtain a list of the categories of third parties to which we have
          disclosed personal data (as permitted by applicable law, including the
          privacy law in California, Delaware, and Maryland)
        </li>
        <li>
          Right to obtain a list of specific third parties to which we have disclosed
          personal data (as permitted by applicable law, including the privacy law in
          Minnesota and Oregon)
        </li>
        <li>
          Right to obtain a list of third parties to which we have sold personal data
          (as permitted by applicable law, including the privacy law in Connecticut)
        </li>
        <li>
          Right to review, understand, question, and depending on where you live,
          correct how personal data has been profiled (as permitted by applicable law,
          including the privacy law in Connecticut and Minnesota)
        </li>
        <li>
          Right to limit use and disclosure of sensitive personal data (as permitted
          by applicable law, including the privacy law in California)
        </li>
        <li>
          Right to opt out of the collection of sensitive data and personal data
          collected through the operation of a voice or facial recognition feature (as
          permitted by applicable law, including the privacy law in Florida)
        </li>
      </ul>

      <h3>How to Exercise Your Rights</h3>
      <p>
        To exercise these rights, you can contact us by emailing us at{' '}
        <a href="mailto:privacy@mybookready.com">privacy@mybookready.com</a>, by
        mailing to 447 Broadway, 2nd Fl. — #3000, New York, NY 10013-2562, or by
        referring to the contact details at the bottom of this document.
      </p>
      <p>
        Under certain US state data protection laws, you can designate an authorized
        agent to make a request on your behalf. We may deny a request from an
        authorized agent that does not submit proof that they have been validly
        authorized to act on your behalf in accordance with applicable laws.
      </p>

      <h3>Request Verification</h3>
      <p>
        Upon receiving your request, we will need to verify your identity to determine
        you are the same person about whom we have the information in our system. We
        will only use personal information provided in your request to verify your
        identity or authority to make the request. However, if we cannot verify your
        identity from the information already maintained by us, we may request that
        you provide additional information for the purposes of verifying your identity
        and for security or fraud-prevention purposes.
      </p>
      <p>
        If you submit the request through an authorized agent, we may need to collect
        additional information to verify your identity before processing your request
        and the agent will need to provide a written and signed permission from you to
        submit such request on your behalf.
      </p>

      <h3>Appeals</h3>
      <p>
        Under certain US state data protection laws, if we decline to take action
        regarding your request, you may appeal our decision by emailing us at{' '}
        <a href="mailto:privacy@mybookready.com">privacy@mybookready.com</a>. We will
        inform you in writing of any action taken or not taken in response to the
        appeal, including a written explanation of the reasons for the decisions. If
        your appeal is denied, you may submit a complaint to your state attorney
        general.
      </p>

      <h3>California &ldquo;Shine The Light&rdquo; Law</h3>
      <p>
        California Civil Code Section 1798.83, also known as the &ldquo;Shine The
        Light&rdquo; law, permits our users who are California residents to request
        and obtain from us, once a year and free of charge, information about
        categories of personal information (if any) we disclosed to third parties for
        direct marketing purposes and the names and addresses of all third parties
        with which we shared personal information in the immediately preceding
        calendar year. If you are a California resident and would like to make such a
        request, please submit your request in writing to us by using the contact
        details provided in the section{' '}
        <a href="#contact">How can you contact us about this notice?</a>
      </p>

      <h2 id="policyupdates">12. Do we make updates to this notice?</h2>
      <p>
        <strong><em>In short:</em></strong> <em>Yes, we will update this notice as
        necessary to stay compliant with relevant laws.</em>
      </p>
      <p>
        We may update this Privacy Notice from time to time. The updated version will
        be indicated by an updated &ldquo;Revised&rdquo; date at the top of this
        Privacy Notice. If we make material changes to this Privacy Notice, we may
        notify you either by prominently posting a notice of such changes or by
        directly sending you a notification. We encourage you to review this Privacy
        Notice frequently to be informed of how we are protecting your information.
      </p>

      <h2 id="contact">13. How can you contact us about this notice?</h2>
      <p>
        If you have questions or comments about this notice, you may email us at{' '}
        <a href="mailto:privacy@mybookready.com">privacy@mybookready.com</a> or
        contact us by post at:
      </p>
      <p>
        DaysGraphic LLC<br />
        447 Broadway, 2nd Fl. — #3000<br />
        New York, NY 10013-2562
      </p>

      <h2 id="request">14. How can you review, update, or delete the data we collect from you?</h2>
      <p>
        You have the right to request access to the personal information we collect
        from you, details about how we have processed it, correct inaccuracies, or
        delete your personal information. You may also have the right to withdraw your
        consent to our processing of your personal information. These rights may be
        limited in some circumstances by applicable law.
      </p>
      <p>
        <strong>Customer account holders</strong> can exercise most of these
        rights directly from{' '}
        <a href="https://app.bkrdy.me/account/profile">app.bkrdy.me/account/profile</a>:
      </p>
      <ul>
        <li>
          <strong>Export your data.</strong> Download a complete JSON dump of
          your profile and every booking we have linked to your account, across
          every business you&rsquo;ve booked with through BookReady.
        </li>
        <li>
          <strong>Delete your account.</strong> Wipes your BookReady account
          (identity, password, contact details, account session tokens) and
          unlinks the booking records held by each business you&rsquo;ve booked
          with. The booking records themselves remain with the business
          (they&rsquo;re the data controller for those — see &ldquo;A note on
          two kinds of users&rdquo; above). To have specific booking history
          deleted from a particular business&rsquo;s records, contact that
          business directly.
        </li>
        <li>
          <strong>Update profile details.</strong> Name, phone, email (with
          re-verification), and password.
        </li>
      </ul>
      <p>
        For any request that isn&rsquo;t available through the self-serve flow,
        or if you don&rsquo;t have an account but want to request changes to
        booking records held by businesses on our platform, please email us at{' '}
        <a href="mailto:privacy@mybookready.com">privacy@mybookready.com</a>.
      </p>
    </LegalShell>
  )
}
