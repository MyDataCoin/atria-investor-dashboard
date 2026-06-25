/** Properties feature endpoints. Public catalogue — no auth required. */
import { apiFetch } from './client';
import { mapPropertyDto } from './adapters';

/** GET /properties — full public catalogue, mapped to UI property shape. */
export async function fetchProperties({ signal } = {}) {
  const dtos = await apiFetch('/properties', { auth: false, signal });
  return (dtos ?? []).map(mapPropertyDto);
}

/** GET /properties/{id} — single property, mapped to UI property shape. */
export async function fetchProperty(id, { signal } = {}) {
  const dto = await apiFetch(`/properties/${id}`, { auth: false, signal });
  return mapPropertyDto(dto);
}
