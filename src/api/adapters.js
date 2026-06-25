/**
 * Adapters: backend DTOs -> the shapes the existing UI components expect.
 *
 * The dashboard UI was built against richer mock objects than the API returns.
 * Each adapter maps what the backend actually provides and fills the rest with
 * honest fallbacks. Fields marked PER-INVESTOR / PRESENTATIONAL are NOT in the
 * public catalogue and get wired in later steps (Investments) or stay static.
 */

// Deterministic placeholder image so cards still look alive until the backend
// exposes media. Indexed by a stable hash of the property id.
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
];

function pickImage(id = '') {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return PLACEHOLDER_IMAGES[sum % PLACEHOLDER_IMAGES.length];
}

function shortAddress(id = '') {
  const tail = id.replace(/-/g, '').slice(-4) || '0000';
  return `0xAtria...${tail}`;
}

/**
 * Map an API PropertyDto to the property card shape used by PropertiesList.
 *
 * Backend-fed:        id, name, description, tokenPrice, currency, totalTokens,
 *                     availableTokens, status (from isActive).
 * Derived:            currentValuation = totalTokens * tokenPrice.
 * PER-INVESTOR (0 until Investments are wired): ownershipPercentage,
 *                     totalInvested, tokensOwned.
 * PRESENTATIONAL (no API source yet): image, city, country, type,
 *                     completionYear, monthlyYield, roi, tokenAddress.
 */
export function mapPropertyDto(dto) {
  const tokenPrice = dto.tokenPrice ?? 0;
  const totalTokens = Number(dto.totalTokens ?? 0);

  return {
    id: dto.id,
    name: dto.name ?? 'Без названия',
    description: dto.description ?? null,

    tokenPrice,
    currency: dto.currency ?? 'USD',
    totalTokens,
    availableTokens: Number(dto.availableTokens ?? 0),

    // Total property value, not the investor's stake.
    currentValuation: totalTokens * tokenPrice,
    status: dto.isActive ? 'active' : 'exited',

    // PER-INVESTOR — filled from /investments/me later.
    ownershipPercentage: 0,
    totalInvested: 0,
    tokensOwned: 0,

    // PRESENTATIONAL placeholders.
    image: pickImage(dto.id),
    city: '—',
    country: '—',
    type: 'Токенизированный актив',
    completionYear: new Date().getFullYear(),
    monthlyYield: 0,
    roi: 0,
    tokenAddress: shortAddress(dto.id),
  };
}
