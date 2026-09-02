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

// Backend property lifecycle -> the UI status token PropertiesList renders.
//   draft     -> pending  ("Ожидается", not yet published)
//   open      -> active   ("Активен", can buy more / sell)
//   completed -> exited   ("Продан", offering closed)
const PROPERTY_STATUS = { draft: 'pending', open: 'active', completed: 'exited' };

/**
 * Derive the card status. Prefers the new `status` enum; falls back to the old
 * `isActive` bool for backwards compatibility with an un-migrated backend.
 */
function mapPropertyStatus(dto) {
  if (dto.status != null) {
    return PROPERTY_STATUS[String(dto.status).toLowerCase()] ?? 'active';
  }
  return dto.isActive ? 'active' : 'exited';
}

/**
 * Map an API PropertyDto to the property card shape used by PropertiesList.
 *
 * Backend-fed:        id, name, description, tokenPrice, currency, totalTokens,
 *                     availableTokens, minPurchaseTokens, minPurchaseAmount,
 *                     areaPerTokenSqM, status (draft/open/completed).
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

    // Порог входа приходит с бэкенда: у каждого выпуска он свой, и подставлять сюда
    // константу значило бы предлагать заявку, которую сервер отклонит.
    minPurchaseTokens: Math.max(1, Number(dto.minPurchaseTokens ?? 1)),
    minPurchaseAmount: Number(dto.minPurchaseAmount ?? 0),

    // Площадь на один токен. Токен — доля выпуска, а не квадратный метр; это расчётный
    // эквивалент для показа рядом с количеством, поэтому null, когда площадь неизвестна.
    areaPerTokenSqM:
      dto.areaPerTokenSqM === null || dto.areaPerTokenSqM === undefined
        ? null
        : Number(dto.areaPerTokenSqM),

    // Total property value, not the investor's stake.
    currentValuation: totalTokens * tokenPrice,
    status: mapPropertyStatus(dto),

    // PER-INVESTOR — filled from /investments/me later.
    ownershipPercentage: 0,
    totalInvested: 0,
    tokensOwned: 0,

    // Real object details from the backend catalogue.
    image: dto.images?.[0]?.url || pickImage(dto.id),
    images: (dto.images ?? []).map((im) => im.url).filter(Boolean),
    // Галерея с видом и подписью. Рендер обязан быть подписан как визуализация: это изображение
    // того, чего ещё нет, и по одному URL инвестор этого не поймёт.
    gallery: (dto.images ?? [])
      .filter((im) => im?.url)
      .map((im) => ({ url: im.url, kind: im.kind || 'photo', caption: im.caption || '' })),
    documents: (dto.documents ?? []).map((d) => ({
      id: d.id, url: d.url, fileName: d.fileName, contentType: d.contentType,
    })),
    address: dto.address ?? null,
    city: dto.city ?? null,
    country: null, // backend has no separate country field; address carries it
    propertyType: dto.propertyType ?? null,
    type: dto.propertyType || 'Токенизированный актив',
    completionYear: dto.yearBuilt ?? null,
    developer: dto.developer ?? null,
    floors: dto.floors ?? null,
    salesPaused: !!dto.salesPaused,

    // Земельный участок и строительная готовность. Инвестору это раскрытие, а не украшение:
    // без стадии участок на стадии проектирования читается как готовое здание.
    unitType: dto.unitType && dto.unitType !== 'unspecified' ? dto.unitType : null,
    landAreaHectares: dto.landAreaHectares ?? null,
    landPlotCode: dto.landPlotCode ?? null,
    cadastralNumber: dto.cadastralNumber ?? null,
    constructionStage:
      dto.constructionStage && dto.constructionStage !== 'unspecified' ? dto.constructionStage : null,
    plannedCompletionDate: dto.plannedCompletionDate ?? null,
    readinessPercent: dto.readinessPercent ?? null,

    // Описательные характеристики карточки. Полезная площадь идёт рядом с общей: инвестор
    // покупает долю выпуска, но сравнивает объекты именно по занимаемой площади.
    totalAreaSqM: dto.totalAreaSqM ?? null,
    usableAreaSqM: dto.usableAreaSqM ?? null,
    // Назначение по документам — не то же, что propertyType: тип это фильтр каталога, а здесь
    // то, что записано в правоустанавливающих, и расхождение инвестору важно видеть.
    documentedUse: dto.documentedUse ?? null,
    buildingClass: dto.buildingClass ?? null,
    wallMaterial: dto.wallMaterial ?? null,
    heating: dto.heating ?? null,
    elevator: dto.elevator ?? null,
    security: dto.security ?? null,
    parking: dto.parking ?? null,
    // Проверка Кадастра на обременения. null — не проверяли, и это НЕ «обременений нет»:
    // показывать чистоту объекта, которую никто не проверял, нельзя.
    isFreeOfEncumbrances:
      dto.isFreeOfEncumbrances === true || dto.isFreeOfEncumbrances === false
        ? dto.isFreeOfEncumbrances
        : null,
    encumbranceCheckedAtUtc: dto.encumbranceCheckedAtUtc ?? null,

    // Окно размещения. Дата закрытия — то, что инвестору нужно знать раньше всего: после неё
    // заявку уже не подать, и бэкенд её отклонит даже до того, как свип закроет объект.
    placementOpensAtUtc: dto.placementOpensAtUtc ?? null,
    placementClosesAtUtc: dto.placementClosesAtUtc ?? null,

    // Not exposed by the catalogue yet.
    monthlyYield: 0,
    roi: 0,
    tokenAddress: shortAddress(dto.id),
  };
}

// Backend InvestmentStatus -> the lowercase status tokens the UI uses. All five
// backend states are covered; there is no payment on the platform, so nothing
// maps to a "pending payment" any more.
const INVESTMENT_STATUS = {
  Reserved: 'reserved',
  Active: 'active',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
  Expired: 'expired',
};

/** Human-readable labels for the five application states. */
export const INVESTMENT_STATUS_LABELS = {
  reserved: 'Резерв',
  active: 'Активна',
  rejected: 'Отклонена',
  cancelled: 'Отменена',
  expired: 'Истекла',
  unknown: 'Неизвестно',
};

/**
 * Map an API InvestmentDto to the shape the dashboard consumes.
 *
 * Backend-fed: id, propertyId, tokenCount, amount, currency, createdAtUtc,
 *              reservedUntilUtc, rejectionReason.
 * Derived:     status (lowercase UI token).
 *
 * An unrecognised status becomes `unknown`, never a waiting state: the previous
 * default made a rejected application look as though it were still pending.
 */
export function mapInvestmentDto(dto) {
  return {
    id: dto.id,
    propertyId: dto.propertyId,
    tokenCount: Number(dto.tokenCount ?? 0),
    amount: Number(dto.amount ?? 0),
    currency: dto.currency ?? 'USD',
    status: INVESTMENT_STATUS[dto.status] ?? 'unknown',
    reservedUntilUtc: dto.reservedUntilUtc ?? null,
    rejectionReason: dto.rejectionReason ?? null,
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
 * Merge the investor's holdings into the public property catalogue.
 *
 * Only `active` investments (approved by an operator) count as holdings. For each
 * property we sum the tokens and the money straight off the investments, and take
 * ownership as a share of the property's own totalTokens. Properties the investor
 * has no active stake in keep the zero per-investor fields set by `mapPropertyDto`.
 *
 * Токены СУММИРУЮТСЯ, а не выводятся из денег делением на цену: количество — целое и
 * уже записано в заявке, а цена в ней снята на момент подачи. Пересчёт из суммы дал бы
 * другое число на любом выпуске, где цена с тех пор изменилась.
 *
 * @param {Array} properties  catalogue items from `mapPropertyDto`.
 * @param {Array} investments investor investments from `mapInvestmentDto`.
 */
export function applyInvestmentsToProperties(properties, investments) {
  const investedByProperty = new Map();
  for (const inv of investments) {
    if (inv.status !== 'active') continue;
    const running = investedByProperty.get(inv.propertyId) ?? { tokens: 0, amount: 0 };
    investedByProperty.set(inv.propertyId, {
      tokens: running.tokens + inv.tokenCount,
      amount: running.amount + inv.amount,
    });
  }

  return properties.map((prop) => {
    const invested = investedByProperty.get(prop.id);
    if (!invested) return prop;

    const ownershipPercentage =
      prop.totalTokens > 0 ? (invested.tokens / prop.totalTokens) * 100 : 0;

    // Площадь — расчётный эквивалент доли, а не единица учёта: подписывается как эквивалент.
    const areaOwnedSqM =
      prop.areaPerTokenSqM === null ? null : prop.areaPerTokenSqM * invested.tokens;

    return {
      ...prop,
      totalInvested: invested.amount,
      tokensOwned: invested.tokens,
      ownershipPercentage,
      areaOwnedSqM,
    };
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

// How each application state reads in the chronicle. A rejected or lapsed
// application is not a completed purchase and must not be shown as one.
const ACTIVITY_BY_STATUS = {
  reserved: { title: 'Заявка в резерве', status: 'pending' },
  active: { title: 'Инвестиция', status: 'completed' },
  rejected: { title: 'Заявка отклонена', status: 'failed' },
  cancelled: { title: 'Заявка отменена', status: 'failed' },
  expired: { title: 'Резерв по заявке истёк', status: 'failed' },
  unknown: { title: 'Заявка', status: 'pending' },
};

/**
 * Build the activity timeline from real investments (one entry each), newest
 * first. Property names are resolved from the catalogue when available.
 */
export function buildActivitiesFromInvestments(investments, properties) {
  const nameById = new Map((properties ?? []).map((p) => [p.id, p.name]));

  return (investments ?? [])
    .map((inv) => {
      const timestamp = inv.createdAtUtc ? new Date(inv.createdAtUtc) : new Date();
      const propertyName = nameById.get(inv.propertyId) ?? 'Объект недвижимости';
      const shape = ACTIVITY_BY_STATUS[inv.status] ?? ACTIVITY_BY_STATUS.unknown;
      return {
        id: `inv-${inv.id}`,
        type: inv.status === 'active' ? 'purchase' : 'application',
        title: `${shape.title}: «${propertyName}»`,
        propertyName,
        amount: inv.amount,
        date: fmtActivityDate(timestamp),
        timestamp,
        status: shape.status,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

function fmtActivityDate(timestamp) {
  return timestamp.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Build support-related timeline entries from the investor's tickets:
 *  - one `ticket` entry when a ticket is created (its first investor message),
 *  - one `ticket-reply` entry for every reply from support/admin.
 * Newest first. Works with both backend and localStorage ticket shapes.
 */
export function buildActivitiesFromTickets(tickets) {
  const acts = [];

  for (const t of tickets ?? []) {
    const messages = t.messages ?? [];

    const created = messages[0]?.createdAtUtc ?? t.createdAtUtc;
    if (created) {
      const timestamp = new Date(created);
      acts.push({
        id: `ticket-${t.id}`,
        type: 'ticket',
        title: `Создано обращение: «${t.subject}»`,
        date: fmtActivityDate(timestamp),
        timestamp,
        status: 'completed',
      });
    }

    for (const m of messages) {
      if (m.author !== 'support') continue;
      const timestamp = new Date(m.createdAtUtc);
      acts.push({
        id: `ticket-reply-${m.id}`,
        type: 'ticket-reply',
        title: `Ответ поддержки по обращению «${t.subject}»`,
        date: fmtActivityDate(timestamp),
        timestamp,
        status: 'completed',
      });
    }
  }

  return acts.sort((a, b) => b.timestamp - a.timestamp);
}

// Backend OnChainStatus -> the tokens the UI branches on. `none` is a real
// answer, not a missing one: it means the shares have not been written to the
// chain yet, which is what an approved-but-unminted allocation looks like.
const ON_CHAIN_STATUS = {
  None: 'none',
  Pending: 'pending',
  Confirmed: 'confirmed',
  Failed: 'failed',
};

/** What each on-chain state means for the holder, in their words. */
export const ON_CHAIN_STATUS_LABELS = {
  none: 'Не выпущено в сети',
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждено в сети',
  failed: 'Ошибка выпуска',
  unknown: 'Неизвестно',
};

/**
 * Map an API InvestmentChainRecordDto to the shape the chain panel consumes.
 *
 * Everything here is backend-fed, including the explorer links: which explorer
 * serves a network is configured next to that network's RPC endpoint, so the
 * dashboard never composes those URLs itself and cannot keep pointing at the
 * testnet explorer after an issue moves to mainnet.
 */
export function mapChainRecordDto(dto) {
  return {
    investmentId: dto.investmentId,
    propertyId: dto.propertyId,
    tokenCount: Number(dto.tokenCount ?? 0),
    status: ON_CHAIN_STATUS[dto.status] ?? 'unknown',
    walletAddress: dto.walletAddress ?? null,
    tokenContractAddress: dto.tokenContractAddress ?? null,
    transactionHash: dto.transactionHash ?? null,
    chainTag: dto.chainTag ?? null,
    chainId: dto.chainId ?? null,
    confirmationsRequired: Number(dto.confirmationsRequired ?? 0),
    transactionUrl: dto.transactionUrl ?? null,
    walletUrl: dto.walletUrl ?? null,
    contractUrl: dto.contractUrl ?? null,
  };
}

// Backend PayoutItemStatus -> the tokens the UI branches on.
const PAYOUT_STATUS = {
  Pending: 'pending',
  Paid: 'paid',
  Failed: 'failed',
};

/** What each payout state means to the holder. */
export const PAYOUT_STATUS_LABELS = {
  pending: 'Ожидает перечисления',
  paid: 'Выплачено',
  failed: 'Не доставлено',
  unknown: 'Неизвестно',
};

/** Кind and method, in the holder's words. */
export const PAYOUT_KIND_LABELS = { Dividend: 'Доход', CapitalReturn: 'Возврат капитала' };
export const PAYOUT_METHOD_LABELS = { BankTransfer: 'Банковский перевод', Wallet: 'На кошелёк' };

/**
 * Map an API MyPayoutDto to the shape the payouts panel consumes.
 *
 * The amount is backend-computed against the frozen register: the dashboard must never divide a
 * declared total itself, or the holder would see a number the payment does not follow.
 */
export function mapMyPayoutDto(dto) {
  return {
    runId: dto.runId,
    propertyId: dto.propertyId,
    kind: dto.kind ?? null,
    method: dto.method ?? null,
    snapshotAtUtc: dto.snapshotAtUtc ?? null,
    tokenCount: Number(dto.tokenCount ?? 0),
    amount: Number(dto.amount ?? 0),
    currency: dto.currency ?? 'KGS',
    status: PAYOUT_STATUS[dto.status] ?? 'unknown',
    settlementReference: dto.settlementReference ?? null,
    paidAtUtc: dto.paidAtUtc ?? null,
  };
}
