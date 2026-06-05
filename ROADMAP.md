# Color Printables Roadmap

## Current Position

Color Printables is a browser-based printable coloring page generator at `https://www.colorprintables.online`. The core promise is simple: describe an idea, create a coloring page or paint-by-numbers page, then print it or save it as a PDF.

The backend auth, Google login, admin entitlement, generation limits, PDF export, Stripe checkout, and custom-domain OAuth setup are treated as locked. See `BACKEND_STABILITY_LOG.md`.

## Product Direction

1. Make the homepage immediately explain what the user can do.
2. Make the first screen feel like a printable creation tool, not a generic AI landing page.
3. Build SEO pages around real use cases: teachers, Sunday school, parents, homeschool, preschool, adult relaxation, parties, paint by numbers, and free generator searches.
4. Keep each SEO page useful with example prompts, steps, audience-specific guidance, and a clear CTA.
5. Register and monitor the site in Google Search Console after the new sitemap and metadata are live.

## SEO Page Plan

Initial pages:

- `/teacher` - classroom coloring pages and fast printable activities.
- `/sunday-school` - Bible story and church lesson coloring pages.
- `/parents` - at-home printable coloring pages for kids.
- `/homeschool` - educational learning printables.
- `/preschool` - simple large-shape pages for young children.
- `/adult-coloring-pages` - detailed mandala, floral, butterfly, and relaxation pages.
- `/party-activities` - birthday, holiday, rainy-day, and group activities.
- `/paint-by-numbers` - numbered regions and color guide generator.
- `/free-coloring-page-generator` - direct high-intent generator page.

## Keyword Themes

Primary:

- coloring pages to print
- printable coloring pages
- free coloring page generator
- generate coloring pages free
- AI coloring page generator
- coloring pages PDF
- paint by numbers generator

Use-case clusters:

- coloring pages for teachers
- classroom coloring pages
- Sunday school coloring pages
- Bible coloring pages printable
- preschool coloring pages
- homeschool coloring pages
- adult coloring pages printable
- mandala coloring page generator
- birthday coloring pages printable

## Implementation Sequence

1. Rebrand visible public surfaces from ColoringAI to Color Printables.
2. Redesign homepage around prompt, print, and PDF value.
3. Add use-case pages with unique metadata and structured data.
4. Add sitemap and robots routes.
5. Verify page rendering on desktop and mobile.
6. Submit sitemap in Google Search Console.
7. Watch Search Console impressions and refine titles/descriptions based on real queries.

## Quality Rules

- Do not create fake testimonials. Use clearly framed example scenarios.
- Do not make thin SEO pages. Each page needs specific prompt ideas, workflow guidance, and relevant CTAs.
- Do not change locked backend/auth/payment/domain behavior while doing frontend or SEO work.
- Avoid claiming guaranteed Google rankings. Optimize for relevance, clarity, crawlability, and usefulness.
