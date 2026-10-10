/**
 * ============================================================================
 * HYPELAB WEB3 AD NETWORK CONFIGURATION
 * ============================================================================
 * Web3 advertising placement and property slug definitions.
 */

export const HYPELAB_PROPERTY_SLUG = import.meta.env.VITE_HYPELAB_PROPERTY_SLUG || '54b0b6e5b8';
export const HYPELAB_CARD_BANNER_PLACEMENT = import.meta.env.VITE_HYPELAB_CARD_BANNER_PLACEMENT || 'e912aafc0e';

export const hypelabConfig = {
  environment: 'production',
  propertySlug: HYPELAB_PROPERTY_SLUG,
  placements: {
    card_banner: HYPELAB_CARD_BANNER_PLACEMENT,
  },
};
