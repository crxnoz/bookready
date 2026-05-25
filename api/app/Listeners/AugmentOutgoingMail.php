<?php

namespace App\Listeners;

use Illuminate\Mail\Events\MessageSending;

/**
 * Fires on every outgoing mail just before Symfony hands it to the transport.
 * Two deliverability tweaks applied here so we don't have to remember them
 * inside every Mailable:
 *
 *   1. If the email is HTML-only, generate a passable text/plain alternative
 *      from the HTML body. Gmail and Outlook penalize HTML-only mail.
 *   2. Add a List-Unsubscribe header (mailto form). Even transactional mail
 *      benefits from this — Gmail's bulk-sender guidance treats it as a
 *      legitimacy signal regardless of volume.
 */
class AugmentOutgoingMail
{
    public function handle(MessageSending $event): void
    {
        $message = $event->message; // Symfony\Component\Mime\Email

        // 1. Auto-text alternative when the mail was built HTML-only.
        if ($message->getTextBody() === null) {
            $html = (string) $message->getHtmlBody();
            if ($html !== '') {
                $message->text($this->htmlToText($html));
            }
        }

        // 2. List-Unsubscribe — mailto form lets a human reply to opt out.
        //    We don't have a one-click unsubscribe endpoint so we omit
        //    List-Unsubscribe-Post (that header REQUIRES a working POST URL).
        $headers = $message->getHeaders();
        if (! $headers->has('List-Unsubscribe')) {
            $headers->addTextHeader(
                'List-Unsubscribe',
                '<mailto:hello@mybookready.com?subject=unsubscribe>',
            );
        }
    }

    /**
     * Minimal HTML → plain-text converter, intentionally dependency-free.
     * Good enough for our transactional emails (single-card layout, a few
     * paragraphs, one CTA). If we ever ship a marketing email we should
     * probably author hand-written text views instead.
     */
    private function htmlToText(string $html): string
    {
        // Drop <style> / <script> blocks wholesale.
        $text = (string) preg_replace('/<(style|script)\b[^>]*>.*?<\/\1>/is', '', $html);

        // Turn <a href="X">label</a> into "label (X)" so the CTA URL survives.
        $text = (string) preg_replace_callback(
            '/<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is',
            function ($m) {
                $label = trim(strip_tags($m[2]));
                $href  = trim($m[1]);
                if ($label === '') return $href;
                if (stripos($href, $label) === 0) return $href;
                return "{$label} ({$href})";
            },
            $text,
        );

        // Block-level closers become newlines.
        $text = (string) preg_replace('/<\s*br\s*\/?>/i', "\n", $text);
        $text = (string) preg_replace('/<\/(p|div|tr|li|h[1-6])\s*>/i', "\n", $text);
        $text = (string) preg_replace('/<\/td\s*>/i', "\t", $text);

        // Strip everything else.
        $text = strip_tags($text);

        // Decode entities like &rsquo; → '
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Normalize whitespace: trim every line, collapse blank-line runs to one.
        $lines = array_map(fn ($l) => trim(preg_replace('/[ \t]+/', ' ', $l) ?? ''), explode("\n", $text));
        $text  = (string) preg_replace("/\n{3,}/", "\n\n", implode("\n", $lines));

        return trim($text);
    }
}
