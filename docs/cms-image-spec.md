# CMS image spec — featured images

Every article on wellroost.com is illustrated by its **featured image in WordPress**. The front end
no longer generates or substitutes images for new posts: if a post has no curated plate in the repo,
the CMS image is what ships. That makes this file the contract.

The rules below are split into **machine-checked** (enforced by `npm run check:images`, which fails
the run) and **review-checked** (judgement, recorded per image at approval). The machine rules exist
because they were all broken by the current library; the review rules exist because a script cannot
tell a photograph from a chart.

---

## 0. Which images this covers

**All of them.** The *numbers* differ by slot, because each slot crops differently; the *content*
rules (§2) are identical everywhere. Two of these five slots are CMS-managed.

| Slot | Where it renders | Frame | Source | Machine-checked |
| --- | --- | --- | --- | --- |
| **Featured image** | article cards, article masthead, `og:image` | 7:4 card, 16:9 masthead, `object-cover` | CMS | yes, §1 |
| **In-body image** | inside article body, via `set:html` | article column (36 rem), full width | CMS | partly, §6 |
| Curated plate | cards + masthead for the 34 existing posts | 7:4, 16:9 | repo, `src/assets/articles/` | build-time |
| Editorial plate | full-bleed bands, portrait argument | 46–62 vh band, 4:5 portrait | repo, `src/assets/photos/` | review |
| Subject tile | subject rows on `/categories/` | 4:3 at 160 px | repo, `src/assets/subjects/` | review |

**The generated-per-post plates are the exception, not the model.** They exist for the 34 posts
published before this spec and are kept as a set. A new post gets no plate: it renders its CMS
featured image, so §1 and §2 are the whole contract for it.

---

## 1. Technical requirements (machine-checked)

| # | Requirement | Value | Why |
| --- | --- | --- | --- |
| 1 | Featured image set | required | A post without one falls back to a placeholder and breaks the card grid. |
| 2 | Aspect ratio | **16:9**, tolerance ±3% | The site renders two crops: a 7:4 card and a 16:9 masthead. From a 16:9 master the card crop removes 1.6% of the width and the masthead removes nothing. Any other master loses content in one of the two. |
| 3 | Width | **≥ 1344 px** — a 1K 16:9 render is 1344 × 768, which is the target, not the floor | Cards render at ≤ 30 vw (≈ 430 CSS px) and the masthead at ≤ 72 rem (1152 CSS px). 1344 covers the masthead at 1.17×, enough for photography. Asking for more made the build upscale a 1K original, which costs bytes and adds nothing. A 2K render is a deliberate upgrade for a hero image, never a requirement. |
| 4 | File weight | **≤ 400 KB** at upload size | Cards are 340 px wide. 342 KB average was the old library's normal; a 16:9 JPEG at q84 lands near 150 KB. |
| 5 | Format | **JPEG, sRGB, progressive** | PNG photographs are 4–8× heavier. No CMYK. WebP only if WordPress's media library is configured to accept it. |
| 6 | WordPress renditions | `large` must exist | `src/lib/wordpress.ts` asks for `large`, then `medium_large`, then `medium`, then the original. A missing rendition means the front end silently ships a 2560 px file. |
| 7 | Filename | lowercase, hyphenated, `<slug>-featured.jpg` | Readable in the media library, and the front end's curated-plate lookup is keyed by slug. |
| 8 | Alt text | **40–140 characters**, describing the photograph | It is announced by screen readers and is the only text search engines can read inside an image. Currently 38/38 present — keep that. |
| 9 | Alt text ≠ title | required | An alt that repeats the headline is read twice and describes nothing. |
| 10 | Uniqueness | no two posts share an image | A repeated image reads as a templated site and defeats the card grid. |

## 2. Content requirements (review-checked)

| # | Requirement | Why |
| --- | --- | --- |
| 11 | **No text in the image.** No headline, kicker, subtitle, caption, label or wordmark baked into the pixels. | The page prints the headline directly above the image in Instrument Serif. Text inside the image restates it in a second face at a third size, is illegible at 340 px, and is invisible to screen readers and search. |
| 12 | **No invented data.** No counter, badge or chart carrying a figure that has no source. A data figure built from real numbers is allowed and encouraged — see §5 for where it goes and what it needs. | The site's promise is that every number is published and checkable. A generated illustration carrying a fabricated "$1,834.75" contradicts that promise more directly than any layout mistake. |
| 13 | One physical subject, photographed. | A photograph of the mechanism in the story (a stamped envelope, a clamped meter, a flue, a battery on a wall) survives any crop and any size. A collage or a 3D render does not. |
| 14 | No people, faces or hands. | No model releases, and faces pull attention from the subject. |
| 15 | No logos, brands, or recognisable proprietary products. | Legal exposure and instant dating. |
| 16 | Palette: bone, graphite, weathered pine, one warm accent at most. No saturated primaries, no neon, no purple-blue gradients. | The page ground is `#ebe9e3` with a single pine accent (`#1c3b2e`). An image outside that family reads as a different site. |
| 17 | Key: mid-key, soft directional light, no blown highlights, no crushed blacks. | Cards sit on a light ground; a mostly-black image reads as a hole in the grid. |
| 18 | Composition: subject inside the middle 80%, nothing essential in the outer 10%, horizon level. | The card crops 1.6% of the width and the masthead 0%; keep rhythm and edges safe anyway for future layouts. |
| 19 | Depth: shallow but legible — the subject reads at 340 px wide. | The card is the smallest place the image appears. If it needs a caption to be identifiable, it fails there. |
| 20 | Rights: original, licensed, or public domain, with the source recorded. | Archival plates are credited in their caption and in the footer; commissioned and generated images carry their brief. |

## 3. What the front end does with the file

So the rules above are not arbitrary, this is the actual path:

1. `src/lib/wordpress.ts` normalises each post and picks the image: `large` → `medium_large` →
   `medium` → original (`pickMediaUrl`).
2. **Article cards** (`PostCard.astro`) render it in a **7:4** frame, `object-fit: cover`, lazy,
   scaled 1.03 on hover, alt text from the CMS.
3. **Article masthead** (`src/pages/[slug].astro`) renders it in a **16:9** frame at up to 72 rem
   wide, `object-fit: cover`, eager.
4. **`og:image`** uses the same URL, so it is also the social card. (A share card with the headline
   set into it is *correct* here and wrong everywhere else — if the desk wants one, keep it as a
   separate asset, not as the featured image.)
5. Astro re-encodes local plates to WebP at build. CMS images are served from WordPress, so the
   upload itself carries the weight — rule 4 is the one that costs readers time.

## 4. In-body images

An article body can carry images, and four posts do. They render inside the reading column at full
measure, so the rules differ from the featured image:

| Requirement | Value | Why |
| --- | --- | --- |
| Alt text | required, never empty | Read aloud in the middle of the piece; the gate fails on an empty one. |
| Host | this CMS only | Hotlinked images rot and hand a third party your page weight. |
| Width | ≤ 1600 px | It renders at 36 rem (576 px) and never wider. |
| Format / weight | JPEG sRGB, ≤ 300 KB | Same reasoning as rule 5. |
| Markup | theme chrome is stripped for you | `src/lib/wordpress.ts` → `cleanArticleHtml()` rewrites every `<img>`: drops the theme's classes and inline `float`/`width`, adds `loading="lazy"`, `decoding="async"`, and dimensions when WordPress supplies them. `border-border` in a body otherwise resolves to currentColor and draws a near-black hairline on a paper ground. |
| No text, no charts | same as rules 11 and 12 | A screenshot of a table is not an illustration; it is unreadable on a phone and unsearchable everywhere. |
| Aspect | **any**, including portrait (3:4 – 4:5) | The body slot is the one place a tall picture works. It is height-capped at 34rem and centred (`max-height: 34rem; width: auto`), so a 3:4 portrait arrives at ~408 × 544 px instead of a 768 px wall. Wide images never reach the cap, so their treatment is unchanged. |

### About 1K

The generator renders 16:9 at **1344 × 768**. That is the size this site is built for, and it is
also the cheapest render the models offer — the difference between 1K and 2K is roughly a doubling
of cost per image for detail that a 340 px card cannot show and a 1152 px masthead barely can.

What 1344 buys, precisely:

| Slot | Displayed at | Source ratio | Verdict |
| --- | --- | --- | --- |
| Card | ≈ 430 CSS px (30 vw at 1440) | 3.1× | plenty, even on a 2× screen |
| Masthead | ≤ 1152 CSS px (72 rem) | 1.17× | acceptable for photography; soft if zoomed |
| `og:image` | 1200 × 630 crop | 1.1× | fine |

So: **render at 1K, always.** Go to 2K only for a piece whose masthead is the whole point — a hero
spread — and never because a checklist said so. The build no longer upscales: the masthead asks for
720, 1080 and 1344, and stops at the source.

### Why the featured image cannot be portrait

It has two frames and both are wide: a 7:4 card and a 16:9 masthead, `object-fit: cover`. Cover on a
3:4 master keeps **43%** of the card and **42%** of the masthead — 57–58% of the picture is cropped
away, and the crop is horizontal-blind: it cannot know where the subject is. A portrait there is not
merely out of spec, it is unusable, which is why rule 2 fails it rather than tolerating it.

If the desk wants a tall picture, the body slot is where it goes. If a whole post genuinely needs a
portrait *masthead* — a real editorial form, the Argument band on the homepage uses 4:5 — that needs
a new slot in the layout, and the spec gains a rule for it at the same time. Tell me and I will build
it; do not send portrait files to the featured image and hope.

### Text beside an image

Two different things, and only one of them is allowed:

- **Text baked into the image, beside or over a portrait subject** — fails rule 11, always. It is the
  exact case the rule exists for: at 340 px in a card the text is noise, and a screen reader reads
  the headline twice.
- **Real page text flowing beside the image** — a layout, not an asset property. The site has one
  such layout today (the homepage's 4:5 Argument band, copy beside a portrait plate), and it is used
  with repo assets. In a CMS body, images are block-level: they interrupt the column, they do not
  sit beside the text, because a float would collapse the measure on a phone. If side-by-side prose
  is wanted, that is a layout to design and build — say so and it becomes a slot with its own rules.

Put the image in the body only when the piece genuinely needs a second picture. The masthead already
carries one.

## 5. Infographics and data figures

Rule 12 bans **invented** numbers, not charts. A figure built from real, sourced data is one of the
better things this site can publish; three of the grandfathered images are banned precisely because a
diffusion model painted plausible digits that no source supports.

The dividing line is where the numbers come from:

| | Allowed | Not allowed |
| --- | --- | --- |
| **Source of numbers** | a published dataset, the article's own computed figures, a cited report | anything a generative model produced |
| **How the graphic is made** | generated *from* the data — an HTML table, inline SVG, or a chart rendered at build | an image model asked to "draw an infographic" |
| **Where it lives** | the body, as a `figure` | the featured image |
| **Text in the picture** | never baked in — labels are real text | raster with labels drawn into the pixels |

**Why never the featured image.** It renders at 340 px in a card. Chart axes, legends and units are
unreadable at that size, and the card would then be a slide from a deck rather than a photograph. Use
the subject of the figure as the photograph instead — the meter, the panel, the bill — and put the
figure in the body, where it has the full column and the reader's attention.

**Preferred form: a table.** It is the only form that survives every reader:

```
Words, not pixels.        screen reader  reads it        search  indexes it
                          phone          reflows         print   reflows
                          source         sits in the caption, linkable
```

`.article-body table` is styled as a data figure — hairline rules, tabular figures, uppercase column
heads — and `figcaption` / `table caption` carry the source line. Ship the numbers as a table and you
get accessibility, searchability and checkability for free.

**Acceptable second: inline SVG**, generated from the same dataset, inside a `figure` with a
`figcaption` source line, `role="img"` and an `aria-label` stating the finding in one sentence. Note
that WordPress strips `<svg>` from post content unless the editor has `unfiltered_html`; if the figure
must come through the CMS body, a table is the reliable route.

**Acceptable third: a raster infographic** (a scanned report page, a supplied graphic) — with the full
data also present as text or a table, alt text stating the finding rather than describing the layout,
and a caption naming the source. Never the only place a number appears.

**Every data figure needs, in this order:** the figure, the finding in one sentence, the source with a
link, and the date the data is current to. A number without those four is decoration.

## 6. How a new post gets its image

```
1. Commission the photograph against §2 (kie.ai nano-banana, FLUX, a shoot, or an archive plate).
2. Export 2400 × 1350 JPEG, sRGB, q84, ≤ 400 KB.
3. Upload to the media library, set as the post's featured image.
4. Write alt text per rule 8, not a restatement of the title.
5. Run `npm run check:images` — it exits non-zero on any new violation.
```

Rules 11–20 cannot be automated. They are checked at approval against §2 and the image is either
accepted or re-shot; the script prints them as a reminder for every new file.

## 7. Grandfathered images

The 38 posts published before this spec carry images that break rules 2, 3, 4, 11 and 12 (nine
aspect ratios, headline text baked in, three with invented figures). They are listed in
`scripts/cms-image-baseline.json` and are reported but do not fail the run. **The baseline is a
record, not a permission**: new posts must pass. Regenerate the list with
`npm run check:images -- --write-baseline` only after an image has deliberately been accepted as-is.

Thirty-four of those posts additionally ship a curated plate in `src/assets/articles/`, which takes
precedence on cards and mastheads. Those plates are kept as a set; new posts do not get one.
