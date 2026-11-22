import type { UUID } from './types';

// Faste id'er for eksempeldataens områder, så farveprikken følger området,
// også når ruten ændres.
export const SEED_ZONE_IDS = {
  frugt: '5e3d0001-0000-4000-8000-000000000001',
  brod: '5e3d0001-0000-4000-8000-000000000002',
  mejeri: '5e3d0001-0000-4000-8000-000000000003',
  paalaeg: '5e3d0001-0000-4000-8000-000000000004',
  koel: '5e3d0001-0000-4000-8000-000000000005',
  kod: '5e3d0001-0000-4000-8000-000000000006',
  kolonial: '5e3d0001-0000-4000-8000-000000000007',
  frost: '5e3d0001-0000-4000-8000-000000000008',
  drikke: '5e3d0001-0000-4000-8000-000000000009',
  hus: '5e3d0001-0000-4000-8000-000000000010',
} as const;

export type SeedZoneKey = keyof typeof SEED_ZONE_IDS;

const COLORS: Record<SeedZoneKey, string> = {
  frugt: '#6DBE45',
  brod: '#E0A43A',
  mejeri: '#7FB3E8',
  paalaeg: '#E58A8A',
  koel: '#5FC3B5',
  kod: '#D2604F',
  kolonial: '#C9A66B',
  frost: '#8FA8F0',
  drikke: '#4FA3D1',
  hus: '#A889D8',
};

const BY_ID = new Map<UUID, string>(
  (Object.keys(SEED_ZONE_IDS) as SeedZoneKey[]).map((k) => [SEED_ZONE_IDS[k], COLORS[k]]),
);

/** Reservefarver til områder, der ikke kommer fra eksempeldata. */
const SPARE = ['#F2B84B', '#7CC6A4', '#E79AC3', '#9DB4C0'];

export function zoneColor(zoneId: UUID, index: number): string {
  return BY_ID.get(zoneId) ?? SPARE[index % SPARE.length] ?? '#9DB4C0';
}
