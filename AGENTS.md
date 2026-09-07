# AGENTS.md

## Project mission

Build a polished, high-energy headless front end for a WordPress-managed blog.

WordPress remains the content system for posts, categories, featured images, and search. The public website front end should be built with Astro, Tailwind CSS, and minimal interactive islands. The goal is a fast, beautiful editorial site with a premium visual identity: glassmorphism, bento-grid composition, neon accents, and clean responsive navigation.

## Source-of-truth project files

Before writing or changing code, inspect these files if they exist in the repository:

* `wellroost_overview.md`
* `design-language.md`

Use WordPress categories as the source of truth for the category menu, category pages, category labels, category slugs, hierarchy, and category IDs.

Use `wellroost_overview.md` as the source of truth for the site concept, audience, tone, positioning, homepage copy direction, and any content hierarchy.

Use `design-language.md` as the directional reference for palette, spacing, tone, and visual composition. It is not the source of truth for content, but it should guide aesthetic decisions.

If any supporting content file is missing, search the repository for similar names before proceeding:

* `wellroost_overview.md`
* `wellroost overview.md`
* `overview.md`

If the files cannot be found, continue with a safe placeholder implementation and add a clear TODO near the data-loading code explaining what file is expected.

## Technology choices

Use:

* Astro as the site skeleton and routing layer.
* Tailwind CSS for styling.
* shadcn/ui only where it adds value, especially for interactive React islands such as the search overlay, dialog, sheet, or command-style search UI.
* Astro static/server rendering for public pages.
* React islands only for client-side interactivity.

Do not turn the site into a full single-page React app. Astro should own routing, page composition, and static/server-rendered content.

## Current implemented architecture

The repo now contains a working Astro front end. Prefer extending this implementation rather than recreating it from scratch.

Current key files:

* `src/layouts/BaseLayout.astro`
* `src/components/SiteNav.astro`
* `src/components/SearchOverlay.astro`
* `src/components/HeroGlass.astro`
* `src/components/CategoryBento.astro`
* `src/components/LatestPostsGrid.astro`
* `src/components/PostCard.astro`
* `src/components/Footer.astro`
* `src/lib/source-files.ts`
* `src/lib/categories.ts`
* `src/lib/overview.ts`
* `src/lib/wordpress.ts`
* `src/pages/index.astro`
* `src/pages/categories/index.astro`
* `src/pages/categories/[slug].astro`
* `src/pages/[slug].astro`
* `src/pages/about.astro`
* `src/styles/global.css`

Important implementation notes:

* The search overlay is currently implemented as `SearchOverlay.astro` with client-side script, not as a React island.
* The site already supports a local Astro article route at `src/pages/[slug].astro` that fetches WordPress posts by slug and recreates them as Astro-rendered pages.
* `src/lib/categories.ts` now reads live category structure directly from WordPress rather than from a CSV file.
* `src/lib/source-files.ts` remains available for overview-style source file discovery, but category structure should not be re-coupled to a CSV without explicit intent.

## Core pages to build

Create or update these routes:

* `/` — high-energy landing page.
* `/categories` — category index using the live WordPress category list.
* `/categories/[slug]` — category detail page showing posts from that WordPress category.
* `/[slug]` — local article detail page that recreates a WordPress article inside Astro.
* `/about` — about page using the overview file as directional copy.

Optional if the architecture already supports it:

* `/search` — server-rendered or client-assisted search results page.

## Landing page requirements

The homepage must include:

1. A sticky floating island navigation bar at the top.
2. A glassmorphism hero section.
3. A clear brand headline and subheadline based on `wellroost_overview.md`.
4. Primary CTA and secondary CTA.
5. A responsive bento-style section introducing the main site themes or categories.
6. A `Latest Posts` grid powered by the WordPress REST API.
7. Category links based on the live WordPress taxonomy.
8. A search icon that opens a full-screen overlay.

Visual direction:

* Premium editorial SaaS energy.
* Glass panels with `backdrop-blur`.
* Gradient mesh or neon orb background accents.
* Bento-grid modules with asymmetry on desktop and clean stacking on mobile.
* Avoid generic stock-template layouts.
* Keep readability high. Do not sacrifice contrast for style.

use file design-language.md to get more directional details about the web design

## Navigation requirements

Build a responsive navigation bar with links:

* Home → `/`
* Categories → `/categories`
* About → `/about`

The nav must:

* Stay sticky/fixed near the top.
* Look like a floating rounded island.
* Blur the page content behind it while scrolling.
* Have a mobile-friendly menu.
* Include a search icon button.
* Use accessible labels and keyboard support.

Suggested Tailwind direction:

* `fixed top-4 left-1/2 z-50 -translate-x-1/2`
* `rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl`
* dark text/light text chosen according to the page background.

## Search overlay requirements

The search icon should open a full-screen overlay.

The overlay must:

* Cover the viewport.
* Use a blurred/glass background.
* Include a large search input.
* Close via Escape, close button, and outside/backdrop interaction where appropriate.
* Trap or manage focus accessibly.
* Search WordPress posts through the REST API when the user submits or types.
* Show result title, excerpt if available, and link.
* Handle loading, empty, and error states.

Keep this as a React island if needed. Do not ship unnecessary JavaScript to the rest of the page.

The current implementation uses an Astro component with inline client script. Reuse that approach unless React materially improves the behavior.

## Latest Posts grid requirements

Build a `Latest Posts` section that pulls from the WordPress REST API.

Use an endpoint like:

```txt
${WORDPRESS_API_BASE}/wp-json/wp/v2/posts?_embed=1&per_page=6
```

For each post, display:

* Featured image from `_embedded['wp:featuredmedia'][0].source_url` when available.
* Post title from `title.rendered` converted to safe display text.
* Optional category label if available.
* Link to the post detail URL or WordPress canonical link until local post pages are implemented.

Card behavior:

* Hover scales the card up by 5%.
* Hover adds a soft neon glow.
* Use smooth transitions.
* Preserve layout stability.

Suggested Tailwind direction:

* `transition duration-300 ease-out hover:scale-105`
* `hover:shadow-[0_0_40px_rgba(56,189,248,0.35)]`
* `focus-visible:ring-2 focus-visible:ring-cyan-300`

## WordPress REST API integration

Create a small API utility module, for example:

* `src/lib/wordpress.ts`

Responsibilities:

* Read `WORDPRESS_API_BASE` or `PUBLIC_WORDPRESS_API_BASE` from environment variables.
* Fetch latest posts.
* Fetch posts by category.
* Fetch a single post by slug for local article pages.
* Fetch all posts when generating Astro article routes.
* Fetch categories if needed.
* Normalize WordPress responses into front-end-friendly objects.
* Handle missing featured images gracefully.
* Handle API failures gracefully.

The current `src/lib/wordpress.ts` already includes:

* `fetchLatestPosts`
* `fetchPostsByCategory`
* `searchPosts`
* `fetchPostBySlug`
* `fetchAllPosts`

When extending this module, preserve the normalized `WordPressPost` shape and keep absolute image URLs working.

Do not hardcode the WordPress production URL in multiple components. Centralize it in the API utility and `.env.example`.

Add or update `.env.example`:

```txt
PUBLIC_WORDPRESS_API_BASE=https://your-wordpress-site.com
```

## Category CSV handling

Create a data-loading utility, for example:

* `src/lib/categories.ts`

Responsibilities:

* Read categories from the WordPress REST API at build time.
* Normalize category names, slugs, descriptions, hierarchy, and counts.
* Use WordPress categories for nav/menu and category pages.
* Do not manually duplicate category data across components.
* Exclude or intentionally handle infrastructure categories such as `uncategorized`.
* If you need a CSV in the future, treat it as an optional enrichment layer rather than the primary taxonomy source.

## Design system

Use Tailwind tokens and reusable classes rather than scattered one-off styles.

Preferred visual system:

* Background: deep editorial gradient, not flat black.
* Accent colors: cyan, electric blue, violet, lime, or soft neon green.
* Surfaces: translucent glass panels with border highlights.
* Cards: rounded `2xl` or `3xl`, soft shadows, subtle neon on hover.
* Typography: strong headline, short subheadline, readable body copy.
* Layout: generous spacing, no cramped sections.

Avoid:

* Plain WordPress theme look.
* Generic three-card template feel.
* Overusing animations.
* Low-contrast glass panels.
* Excessive client-side JavaScript.

## Suggested component structure

Prefer small reusable components:

```txt
src/components/SiteNav.astro
src/components/SearchOverlay.astro
src/components/HeroGlass.astro
src/components/LatestPostsGrid.astro
src/components/PostCard.astro
src/components/CategoryBento.astro
src/components/Footer.astro
src/lib/source-files.ts
src/lib/overview.ts
src/lib/wordpress.ts
src/lib/categories.ts
src/pages/index.astro
src/pages/categories/index.astro
src/pages/categories/[slug].astro
src/pages/[slug].astro
src/pages/about.astro
```

Adjust paths to match the existing repository structure.

## Accessibility requirements

* Every interactive control must be keyboard accessible.
* Search button must have an `aria-label`.
* Mobile menu button must have an `aria-label` and visible focus state.
* Search overlay must support Escape to close.
* Images must have useful `alt` text or empty alt text if decorative.
* Use semantic headings in order.
* Maintain strong color contrast.
* Respect `prefers-reduced-motion` for nonessential animation.

## Performance requirements

* Keep Astro pages mostly static/server-rendered.
* Ship JavaScript only for search overlay and mobile nav if needed.
* Use lazy-loaded images below the fold.
* Use responsive image dimensions when available.
* Avoid large animation libraries unless already installed and justified.
* Avoid adding dependencies unless they materially simplify the build.

Because WordPress API access may fail during build or in restricted environments, all page-level data fetches must degrade gracefully instead of crashing the build.

## WordPress article recreation requirements

When implementing or updating `src/pages/[slug].astro`, the goal is not to iframe or proxy the WordPress theme. The goal is to recreate the article as a native Astro page while preserving the article’s content fidelity.

Requirements:

* Fetch the post from WordPress by slug using `src/lib/wordpress.ts`.
* Generate static paths from the live WordPress post list when possible.
* Use the normalized post object for title, excerpt, date, category label, featured image, canonical link, and HTML content.
* Render the article body with `set:html` only after the content has been sourced from WordPress and normalized in the shared utility.
* Preserve canonical metadata and social metadata.
* Recreate the reading experience in Astro rather than duplicating WordPress theme markup one-for-one.
* Keep the article page visually aligned with the site’s editorial design system.
* Do not embed WordPress admin chrome, Elementor wrappers, or WordPress theme navigation.
* Prefer semantic article structure, readable measure, strong contrast, and responsive media handling.

When reading articles from WordPress to recreate them in Astro:

1. Inspect the WordPress REST response for the post slug.
2. Reuse the normalized data fields from `src/lib/wordpress.ts` instead of re-parsing the same response in the page.
3. Preserve featured media and the article title exactly enough to keep content identity intact.
4. Cleanly render long-form HTML content while avoiding extra WordPress front-end chrome.
5. If the WordPress HTML includes layout-specific or theme-specific wrappers that harm readability, strip or override them in Astro rather than reproducing them blindly.
6. If future work requires more robust cleanup of WordPress article HTML, add that cleanup in the shared WordPress utility layer, not ad hoc in one page.

## Implementation workflow for Codex

Before editing:

1. Inspect the current repo structure.
2. Inspect `package.json`, `astro.config.*`, `tailwind.config.*`, and existing layout/components.
3. Read `wordpress_categories.csv` or `wordpress _categories.csv` if present.
4. Read `wellroost_overview.md`.
5. Read `design-language.md` for visual direction.
6. Identify the safest minimal file changes.
7. Briefly summarize the plan before coding.

While editing:

1. Implement data utilities first.
2. Build shared layout/navigation next.
3. Build the homepage sections.
4. Build category and about pages.
5. Maintain or extend the local article route at `src/pages/[slug].astro` when article recreation is in scope.
6. Add search overlay behavior with minimal client JavaScript.
7. Keep components small and reusable.
8. Avoid hardcoded content that should come from the CSV or overview file.

After editing:

1. Run formatting if configured.
2. Run linting if configured.
3. Run type checks if configured.
4. Run the Astro build.
5. Fix errors before reporting completion.

## Commands

Use the commands available in `package.json`. Common commands may be:

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run check
```

Do not invent scripts. Inspect `package.json` first and use the actual scripts.

## Acceptance criteria

The work is complete when:

* The homepage renders with a premium glassmorphism hero.
* The floating sticky nav includes Home, Categories, About, and search.
* The nav is responsive.
* Search opens a full-screen overlay and queries WordPress posts.
* Latest Posts pulls featured images and titles from WordPress REST API.
* Latest Posts cards scale to `1.05` on hover and show a soft neon glow.
* Categories are sourced from the live WordPress taxonomy.
* Category pages are generated from the WordPress-backed category list.
* Local article pages can be generated from WordPress post slugs when `src/pages/[slug].astro` is in scope.
* The About page reflects `wellroost_overview.md`.
* The site builds successfully.
* Missing WordPress API data does not break the page.

## Safety and quality rules

* Do not commit secrets or API keys.
* Do not modify WordPress itself.
* Do not use Elementor/Astra/WordPress theme code for this front end.
* Do not hardcode categories if the CSV is present.
* Do not rewrite the entire project unnecessarily.
* Do not replace Astro with Next.js, Angular, or a full React SPA.
* Do not add heavy dependencies without a clear reason.
* Do not leave broken imports, unused components, or failing builds.

## Preferred final response from Codex

When finished, report:

* Files changed.
* What was implemented.
* What data source was used for categories.
* What WordPress API base URL is expected.
* Commands run and whether they passed.
* Any remaining TODOs or assumptions.
