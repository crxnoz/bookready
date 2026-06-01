# Example Blank — official BookReady template starter

This directory is the canonical skeleton for new BookReady templates. Fork it (rename `_example-blank` → your slug, update `manifest.ts`, rewrite the component), and you have a valid template.

**Not registered in production.** This template is NOT included in `web/templates/registry.ts`. It exists in the codebase as:

1. A reference implementation creators can read to understand the contract
2. A known-good fixture the manifest validator tests against
3. A baseline for the submission portal's "what did this PR change vs. the starter?" diff tooling

## Files

- `manifest.ts` — the marketplace contract. Defines `slug`, `name`, `version`, color role + palette, header + footer surface.
- `ExampleBlankTemplate.tsx` — the React component. Renders every required section using the simplest possible markup.
- `README.md` — this file.

## What's intentionally minimal

- No animations. Add them with `prefers-reduced-motion`-gated rules.
- No visual polish. The starter looks like a Wikipedia article on purpose.
- No empty-state hints. Real templates should explain what each empty section is for.
- No A/B variants in the palette. Real templates ship 3-6 thoughtful colors.
- No booking flow integration yet — points to the future `@bkrdy/platform` import path. Phase 1 finalizes the publish path.

## Required reading

See [`../_shared/AUTHORING.md`](../_shared/AUTHORING.md) for the full creator guide. See [`../_shared/manifest.schema.json`](../_shared/manifest.schema.json) for the formal manifest contract.

## Validating your manifest

```ts
import { validateManifest } from '../_shared/validateManifest'
import manifest from './manifest'

const errs = validateManifest(manifest)
if (errs.length === 0) console.log('✓ manifest valid')
else                   console.error('✗ manifest errors:', errs)
```

The submission portal runs this exact check. Pass it locally first.
