/**
 * Archival plates used across the site.
 *
 * Every one is public domain, from the Historic American Buildings Survey collection via Wikimedia
 * Commons, and every one is credited on the page it appears (caption) and in the footer. None of
 * them is a property WellRoost has modelled, and none is presented as the work of a client — they
 * are pictures of the housing stock these decisions get made about.
 */
import heroPlate from '../assets/photos/hero-plate.jpg';
import porchBracket from '../assets/photos/porch-bracket.jpg';
import interior from '../assets/photos/interior.jpg';
import plan from '../assets/photos/plan.jpg';
import mantel from '../assets/photos/mantel.jpg';

export interface Plate {
	src: ImageMetadata;
	alt: string;
	credit: string;
}

export const plates = {
	house: {
		src: heroPlate,
		alt: 'A timber-framed colonial house behind bare trees, photographed in 1937.',
		credit: 'Eleazer Arnold House, Saylesville, Rhode Island. Historic American Buildings Survey, 1937. Public domain.'
	},
	porch: {
		src: porchBracket,
		alt: 'The carved bracket under a porch roof, seen from below.',
		credit: 'Isaac Bell House, Newport, Rhode Island. Porch bracket detail, HABS, 1969. Public domain.'
	},
	interior: {
		src: interior,
		alt: 'A panelled sitting room opening into a library through a wide doorway.',
		credit: 'Sherman Phelps House, Binghamton, New York. Interior toward the library, HABS, 1966. Public domain.'
	},
	plan: {
		src: plan,
		alt: 'A hand-drawn first floor plan with rooms, walls and a stair hall.',
		credit: 'First floor plan, residence for Charles Millard Pratt. McKim, Mead & White. Public domain.'
	},
	mantel: {
		src: mantel,
		alt: 'A panelled chimney breast with a fireplace and a built-in closet door.',
		credit: 'Jacob Vanderbeck House, Saddle River, New Jersey. Mantel and closet detail, HABS, 1938. Public domain.'
	}
} satisfies Record<string, Plate>;

export type PlateName = keyof typeof plates;
