import { useCallback, useState } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { RegistrationWithShooter } from '../types/scoring';

export function readDraggedRegistration(event: DragStartEvent | DragEndEvent) {
  return event.active?.data?.current?.registration as RegistrationWithShooter | undefined;
}

/** Drag-to-group wiring for the registration table. */
export function useRegistrationDnd(
  onGroup: (sourceId: string, targetId: string) => void,
  activationDistance = 8,
) {
  const [activeRegistration, setActiveRegistration] = useState<RegistrationWithShooter | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: activationDistance } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const registration = readDraggedRegistration(event);
    if (registration) setActiveRegistration(registration);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveRegistration(null);
    const source = readDraggedRegistration(event);
    const target = event.over?.data?.current?.registration as RegistrationWithShooter | undefined;
    if (!source || !target || source.id === target.id) return;
    onGroup(source.id, target.id);
  }, [onGroup]);

  return { activeRegistration, sensors, handleDragStart, handleDragEnd };
}

/** Drag-to-squad wiring for the squadding board. */
export function useSquadDnd(
  onMoveShooter: (shooterId: string, squad: number) => void,
  activationDistance = 5,
) {
  const [activeRegistration, setActiveRegistration] = useState<RegistrationWithShooter | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: activationDistance } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const registration = readDraggedRegistration(event);
    if (registration) setActiveRegistration(registration);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveRegistration(null);
    const shooterId = readDraggedRegistration(event)?.shooter_id;
    const overId = event.over?.id;
    if (!shooterId || typeof overId !== 'string' || !overId.startsWith('squad-')) return;
    const squad = Number.parseInt(overId.slice('squad-'.length), 10);
    if (Number.isInteger(squad)) onMoveShooter(shooterId, squad);
  }, [onMoveShooter]);

  return { activeRegistration, sensors, handleDragStart, handleDragEnd };
}
