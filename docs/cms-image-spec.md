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
| 3 | Width | **≥ 1600 px** (upload 2400 × 1350) | The front end requests WordPress's `large` rendition (1024 px) for cards and the full file for a masthead on a 1440 pt screen. Under 1600 px the masthead is soft. |
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
| 12 | **No invented data.** No dashboards, bar charts, counters, price tags, percentages, or "saves up to" badges. | The site's promise is that every number is published and checkable. An illustration carrying a fabricated "$1,834.75" contradicts that promise more directly than any layout mistake. If a number belongs in the piece, it belongs in the text, linked to its source. |
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

Put the image in the body only when the piece genuinely needs a second picture. The masthead already
carries one.

## 5. How a new post gets its image

```
1. Commission the photograph against §2 (kie.ai nano-banana, FLUX, a shoot, or an archive plate).
2. Export 2400 × 1350 JPEG, sRGB, q84, ≤ 400 KB.
3. Upload to the media library, set as the post's featured image.
4. Write alt text per rule 8, not a restatement of the title.
5. Run `npm run check:images` — it exits non-zero on any new violation.
```

Rules 11–20 cannot be automated. They are checked at approval against §2 and the image is either
accepted or re-shot; the script prints them as a reminder for every new file.

## 6. Grandfathered images

The 38 posts published before this spec carry images that break rules 2, 3, 4, 11 and 12 (nine
aspect ratios, headline text baked in, three with invented figures). They are listed in
`scripts/cms-image-baseline.json` and are reported but do not fail the run. **The baseline is a
record, not a permission**: new posts must pass. Regenerate the list with
`npm run check:images -- --write-baseline` only after an image has deliberately been accepted as-is.

Thirty-four of those posts additionally ship a curated plate in `src/assets/articles/`, which takes
precedence on cards and mastheads. Those plates are kept as a set; new posts do not get one.
