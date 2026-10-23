import type { RegistrationWithShooter } from '../types/scoring';

export function shooterName(registration: Pick<RegistrationWithShooter, 'first_name' | 'last_name'>) {
  return `${registration.first_name} ${registration.last_name}`;
}

export function groupRegistrationsBySquad(
  registrations: RegistrationWithShooter[],
): Record<number, RegistrationWithShooter[]> {
  const grouped: Record<number, RegistrationWithShooter[]> = {};
  for (const registration of registrations) {
    const squad = registration.squad ?? 0;
    if (!grouped[squad]) grouped[squad] = [];
    grouped[squad].push(registration);
  }
  for (const squad of Object.keys(grouped)) {
    grouped[Number(squad)].sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
  }
  return grouped;
}

export function sortedSquadNumbers(grouped: Record<number, RegistrationWithShooter[]>): number[] {
  return Object.keys(grouped)
    .map(Number)
    .filter((squad) => squad > 0)
    .sort((a, b) => a - b);
}

export function filterRegistrationsByName(
  registrations: RegistrationWithShooter[],
  query: string,
): RegistrationWithShooter[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return registrations;
  return registrations.filter((registration) => shooterName(registration).toLowerCase().includes(normalized));
}
