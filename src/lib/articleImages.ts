/**
 * One photograph per article, made for it.
 *
 * These exist because the CMS's featured image is a *share card*: the article's headline set into a
 * 1344x768 graphic. Printed above the H1 it restated the title in different words, which is the one
 * thing a masthead must not do. These are clean plates — no type, no logos — generated for each
 * story from its own subject, in one art direction (soft daylight from the left, bone / graphite /
 * pine, 35mm grain, no people, no text).
 *
 * Generated with kie.ai (google/nano-banana), reviewed frame by frame, four regenerated.
 * Any file dropped into src/assets/articles/<slug>.jpg is picked up automatically.
 */
const files = import.meta.glob<{ default: ImageMetadata }>('../assets/articles/*.jpg', { eager: true });

const bySlug: Record<string, ImageMetadata> = Object.fromEntries(
	Object.entries(files).map(([path, mod]) => [
		path.split('/').pop()!.replace(/\.jpg$/, ''),
		mod.default
	])
);

/** Alt text describes the photograph, not the story — it is what a screen reader announces. */
const alt: Record<string, string> = {
	'20-percent-of-your-ac-never-arrives': 'A ceiling supply vent with a strip of tissue held at its grille, flex duct visible through an open ceiling hatch.',
	'3-percent-cap-never-covers-your-addition': 'A half-finished room addition seen from the garden: new studs, house wrap and a ladder against the frame.',
	'backup-battery-sizing-critical-loads': 'A transfer switch and battery front panel in a dim utility closet, cables dressed tightly.',
	'battery-payback-five-state-gap': 'A home battery and inverter on a garage wall beside a utility meter, cables routed in steel conduit.',
	'borrow-at-8-to-remodel-or-let-your-battery-earn-on-the-grid': 'A roll of house plans tied with tape on a kitchen island beside a folder of loan papers.',
	'california-fair-plan-premiums-jump-291-oct-15-your-exit-strategy': 'A stack of insurance envelopes on a counter beside a policy folder, hard afternoon light across them.',
	'california-legalizes-plug-in-home-solar-panels': 'A plug-in solar panel leaning against a balcony rail, its cable running to an outdoor socket.',
	'cheapest-fuel-priciest-pipe': 'A gas meter with its yellow service line entering a foundation wall, paint peeling from the sill.',
	'cloud-update-bricked-the-fridge-local-first': 'A fridge with its control panel dark, doors ajar, in a dim kitchen at the end of the day.',
	'heat-pumps-cheaper-to-run-pricier-to-buy': 'A heat pump condenser on a wall bracket above a snowy windowsill, frost on the fan grille.',
	'heat-pumps-just-got-cheaper-to-run-and-pricier-to-buy': 'An outdoor heat pump unit in autumn, its grille beaded with condensation, leaves banked at the base.',
	'hold-back-capped-at-5-percent': 'A contractor invoice clipped to a clipboard resting on a sawhorse, a tape measure curled beside it.',
	'kill-your-deposit-in-3-days': 'A single sheet of paper on a pale wooden table with one black ballpoint pen laid diagonally across it.',
	'local-api-isnt-in-the-contract': 'A din-rail smart relay module inside a wiring cabinet, its terminals and single indicator LED in macro.',
	'local-first-smart-home-cost-squeeze': 'A small white smart-home hub on a bookshelf beside a coiled ethernet cable, its power lead unplugged.',
	'mechanics-lien-clock-payment-release': 'A blank completion form on a clipboard resting on a job-site table, a pencil laid beside it.',
	'monitor-77-percent-guess-where-it-fails': 'A digital clamp meter clipped around a thick cable inside an open electrical panel, breaker rows blurred behind it.',
	'panel-upgrade-80-percent-test': 'An open electrical panel with combed breaker rows, a small smart subpanel mounted beside it.',
	'roof-claim-hidden-second-check-12-months': 'A roofing ladder hooked over a gutter, a bundle of shingles resting on the slope, low morning light.',
	'silent-15400-home-loss': 'A water-stained baseboard meeting swollen floorboards, the pins of a moisture meter touching the wood.',
	'smart-irrigation-payback-water-tier': 'A pop-up sprinkler head set flush into turf, water breaking over its nozzle in short streams, wet grass in morning light.',
	'the-remodel-that-pays-you-back-isnt-the-one-you-want': 'A new garage door’s panel and window row seen from an angle, driveway apron in the foreground.',
	'water-leak-monitor-rate-threshold': 'A copper supply line with a single bead of water at a joint, a shallow drip tray beneath.',
	'windows-13-percent-best-case': 'The corner of a replacement window in extreme detail: glazing, spacer bar and compressed weather seal.',
	'your-49-discount-isnt-all-roof': 'A newly shingled roof edge against a flat overcast sky, underlayment visible beneath the first course.',
	'your-5-deductible-risks-your-claim': 'A storm shutter leaning against a stucco wall, rain beaded on its slats, a gutter downpipe beside it.',
	'your-75000-btu-tank-venting-trap': 'The flue of a gas water heater rising into a ceiling, its draft hood and vent connector in close view.',
	'your-batterys-745-mw-cliff': 'A wall-mounted home battery in a garage, its status ring lit, beside a coiled charging cable on a concrete floor.',
	'your-blocks-30b-hardening-bill': 'A cleared defensible-space band around a hillside house: gravel strip, cut brush and a metal roof edge.',
	'your-ev-is-now-a-home-battery-behind-a-paywall': 'An EV charge port with the cable plugged in, the car’s flank and a garage wall in soft light.',
	'your-locks-blind-90-bet': 'A black smart deadbolt on a painted timber door, a thin band of evening light across the frame.',
	'your-nonrenewal-isnt-final-count-120-days': 'A certified letter lying unopened on a hall table beside a brass date stamp and a stack of envelopes.',
	'your-remodel-loses-to-149-growth': 'An electrician’s canvas tool bag on bare studs inside a half-wired kitchen, cable spools stacked against the framing.',
	'your-upgrades-9-silent-reset': 'A folded mortgage statement and a pencil on a dark desk, a bank card face down beside them.',
};

export function getArticleImage(slug: string): { src: ImageMetadata; alt: string } | null {
	const src = bySlug[slug];
	return src ? { src, alt: alt[slug] ?? '' } : null;
}
