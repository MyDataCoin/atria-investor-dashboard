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

// Backend InvestmentStatus -> the lowercase status tokens the UI uses.
const INVESTMENT_STATUS = {
  PendingPayment: 'pending',
  Active: 'active',
  Failed: 'failed',
  Cancelled: 'cancelled',
};

/**
 * Map an API InvestmentDto to the shape the dashboard consumes.
 *
 * Backend-fed: id, propertyId, amount, currency, createdAtUtc.
 * Derived:     status (lowercase UI token, `pending` when unknown).
 */
export function mapInvestmentDto(dto) {
  return {
    id: dto.id,
    propertyId: dto.propertyId,
    amount: Number(dto.amount ?? 0),
    currency: dto.currency ?? 'USD',
    status: INVESTMENT_STATUS[dto.status] ?? 'pending',
    createdAtUtc: dto.createdAtUtc ?? null,
  };
}

/**
 * Map an API PortfolioDto to the aggregated portfolio shape.
 *
 * Backend-fed: totalInvested, activeCount, investments[] (each mapped).
 */
export function mapPortfolioDto(dto) {
  return {
    totalInvested: Number(dto?.totalInvested ?? 0),
    activeCount: Number(dto?.activeCount ?? 0),
    investments: (dto?.investments ?? []).map(mapInvestmentDto),
  };
}

/**
 * Map an API PaymentSessionDto to what the client needs to redirect the payer.
 */
export function mapPaymentSessionDto(dto) {
  return {
    sessionId: dto?.sessionId ?? null,
    paymentUrl: dto?.paymentUrl ?? null,
  };
}

/**
 * Merge the investor's holdings into the public property catalogue.
 *
 * Only `active` investments (confirmed payment) count as holdings. For each
 * property we sum the invested amount and derive tokensOwned / ownership from
 * the property's own tokenPrice and totalTokens. Properties the investor has no
 * active stake in keep the zero per-investor fields set by `mapPropertyDto`.
 *
 * @param {Array} properties  catalogue items from `mapPropertyDto`.
 * @param {Array} investments investor investments from `mapInvestmentDto`.
 */
export function applyInvestmentsToProperties(properties, investments) {
  const investedByProperty = new Map();
  for (const inv of investments) {
    if (inv.status !== 'active') continue;
    investedByProperty.set(
      inv.propertyId,
      (investedByProperty.get(inv.propertyId) ?? 0) + inv.amount,
    );
  }

  return properties.map((prop) => {
    const invested = investedByProperty.get(prop.id);
    if (!invested) return prop;

    const tokensOwned = prop.tokenPrice > 0 ? Math.round(invested / prop.tokenPrice) : 0;
    const ownershipPercentage =
      prop.totalTokens > 0 ? (tokensOwned / prop.totalTokens) * 100 : 0;

    return { ...prop, totalInvested: invested, tokensOwned, ownershipPercentage };
  });
}

/**
 * Derive the Overview/Header stats block from a mapped PortfolioDto.
 *
 * Backend-fed: totalInvested. currentAssetValue is shown at cost (no valuation
 * feed yet). Yield, ROI and distribution figures have no API source and stay 0
 * until the backend exposes them — honest zeros over invented numbers.
 */
export function derivePortfolioStats(portfolio) {
  const totalInvested = Number(portfolio?.totalInvested ?? 0);
  return {
    totalInvested,
    currentAssetValue: totalInvested,
    monthlyIncome: 0,
    averageRoi: 0,
    portfolioGrowthPct: 0,
    unrealizedGains: 0,
    cashDistributions: 0,
  };
}

// Palette for the capital-allocation chart, cycled per property.
const ALLOCATION_PALETTE = ['#c4862f', '#e6a951', '#a96a26', '#6f7d6f', '#8a5a2b', '#b9985f'];

/**
 * Build the capital-allocation breakdown from properties the investor holds.
 *
 * Each slice is one property, sized by the invested amount (already merged in by
 * `applyInvestmentsToProperties`). Percentages are of the total held capital.
 * Returns an empty array when the investor has no holdings.
 */
export function buildAssetAllocation(properties) {
  const held = (properties ?? []).filter((p) => p.totalInvested > 0);
  const total = held.reduce((sum, p) => sum + p.totalInvested, 0);

  return held.map((p, i) => ({
    name: p.name,
    value: p.totalInvested,
    percentage: total > 0 ? Number(((p.totalInvested / total) * 100).toFixed(1)) : 0,
    color: ALLOCATION_PALETTE[i % ALLOCATION_PALETTE.length],
  }));
}

/**
 * Build the activity timeline from real investments (one `purchase` entry each),
 * newest first. Property names are resolved from the catalogue when available.
 */
export function buildActivitiesFromInvestments(investments, properties) {
  const nameById = new Map((properties ?? []).map((p) => [p.id, p.name]));

  return (investments ?? [])
    .map((inv) => {
      const timestamp = inv.createdAtUtc ? new Date(inv.createdAtUtc) : new Date();
      const propertyName = nameById.get(inv.propertyId) ?? 'Объект недвижимости';
      return {
        id: `inv-${inv.id}`,
        type: 'purchase',
        title: `Инвестиция в «${propertyName}»`,
        propertyName,
        amount: inv.amount,
        date: timestamp.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        timestamp,
        status: 'completed',
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}
