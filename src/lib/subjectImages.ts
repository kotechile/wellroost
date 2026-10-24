/**
 * One picture per subject.
 *
 * These were generated for the subject, not borrowed from an article: every article's featured image
 * on this CMS is a share card with its own headline set into it, so using one as a subject tile put
 * another piece's headline in the place where the subject's name should be doing the work.
 *
 * Art direction, kept identical across the four: editorial architectural photograph, soft directional
 * daylight from the left, bone / graphite / pine palette, shallow depth of field, no text or logos.
 * Generated with kie.ai (google/nano-banana). If they are ever replaced, keep the four as a series.
 */
import energy from '../assets/subjects/energy-efficiency.jpg';
import cost from '../assets/subjects/home-cost-decisions.jpg';
import smart from '../assets/subjects/smart-home-security.jpg';
import tools from '../assets/subjects/tools-equipment.jpg';

export interface SubjectImage {
	src: ImageMetadata;
	alt: string;
}

export const subjectImages: Record<string, SubjectImage> = {
	'energy-efficiency': {
		src: energy,
		alt: 'A heat pump condenser mounted on a rendered wall, autumn leaves banked against its base.'
	},
	'home-cost-decisions': {
		src: cost,
		alt: 'A blank sheet of paper on an oak table with a steel tape measure and a pencil.'
	},
	'smart-home-security': {
		src: smart,
		alt: 'A matte black smart lock on a deep green painted front door, seen close.'
	},
	'tools-equipment': {
		src: tools,
		alt: 'A cordless drill standing on a pale workbench beside its battery pack, side light across the grain.'
	}
};

export function getSubjectImage(slug: string): SubjectImage | null {
	return subjectImages[slug] ?? null;
}
