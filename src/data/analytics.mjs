/**
 * Analytics configuration for wellroost.com — committed, not just environment.
 *
 * This layout had no analytics at all: no script tag, no build args, nothing. The property was
 * reported as having "no traffic" while nothing on it was counting, and the two are indistinguishable
 * from the outside.
 *
 * The website id is a public identifier — it appears in the served HTML — so it is versioned here
 * rather than left to a build argument the Dockerfile has to remember to declare. Environment
 * variables still win, for a staging build or a re-hosted Umami instance.
 *
 * Self-hosted Umami: tracker and collector both live on umami.aichieve.net, which is the origin the
 * script posts to by default.
 */
export const ANALYTICS = {
	/** Umami tracker. Self-hosted — not cloud.umami.is. */
	src: 'https://umami.aichieve.net/script.js',
	/** Umami → Websites → wellroost.com → Tracking code. One id PER PROPERTY: a shared id scoped to a
	 *  sibling's host drops this property's events without raising an error. */
	websiteId: '0d083a26-cdcd-44ee-83bd-5af221a9e10c',
	/** Umami refuses to record a pageview from a host not in this list. */
	domains: 'wellroost.com,www.wellroost.com'
};
