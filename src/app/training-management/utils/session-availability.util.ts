import { TrainingSessionStatus } from '../models';

export type SessionAvailabilityKind =
  | 'available'
  | 'few'
  | 'full'
  | 'closed'
  | 'cancelled'
  | 'registered'
  | 'completed'
  | 'draft';

export interface SessionAvailabilityView {
  kind: SessionAvailabilityKind;
  labelHe: string;
  cssClass: string;
  icon: string;
  canShowRegister: boolean;
}

const FEW_PLACES_THRESHOLD = 3;

export function buildSessionAvailability(input: {
  Status: TrainingSessionStatus;
  AvailablePlaces: number;
  RegistrationCloseAt: string;
  IsRegisteredByCurrentEmployee?: boolean | null;
  CanRegister?: boolean | null;
  now?: Date;
}): SessionAvailabilityView {
  if (input.IsRegisteredByCurrentEmployee) {
    return {
      kind: 'registered',
      labelHe: 'כבר רשום',
      cssClass: 'avail-registered',
      icon: 'check_circle',
      canShowRegister: false,
    };
  }
  if (input.Status === TrainingSessionStatus.Cancelled) {
    return {
      kind: 'cancelled',
      labelHe: 'בוטל',
      cssClass: 'avail-danger',
      icon: 'cancel',
      canShowRegister: false,
    };
  }
  if (input.Status === TrainingSessionStatus.Completed) {
    return {
      kind: 'completed',
      labelHe: 'הושלם',
      cssClass: 'avail-neutral',
      icon: 'done_all',
      canShowRegister: false,
    };
  }
  if (input.Status === TrainingSessionStatus.Draft) {
    return {
      kind: 'draft',
      labelHe: 'טיוטה',
      cssClass: 'avail-neutral',
      icon: 'edit',
      canShowRegister: false,
    };
  }
  if (input.Status === TrainingSessionStatus.Closed || input.Status === TrainingSessionStatus.Full) {
    return {
      kind: input.Status === TrainingSessionStatus.Full ? 'full' : 'closed',
      labelHe: input.Status === TrainingSessionStatus.Full ? 'מלא' : 'סגור לרישום',
      cssClass: 'avail-danger',
      icon: 'block',
      canShowRegister: false,
    };
  }

  const now = input.now || new Date();
  const closeAt = input.RegistrationCloseAt ? new Date(input.RegistrationCloseAt) : null;
  if (closeAt && !Number.isNaN(closeAt.getTime()) && closeAt.getTime() <= now.getTime()) {
    return {
      kind: 'closed',
      labelHe: 'מועד הרישום הסתיים',
      cssClass: 'avail-danger',
      icon: 'schedule',
      canShowRegister: false,
    };
  }

  if (input.AvailablePlaces <= 0) {
    return {
      kind: 'full',
      labelHe: 'מלא',
      cssClass: 'avail-danger',
      icon: 'block',
      canShowRegister: false,
    };
  }

  const allow =
    input.CanRegister === false
      ? false
      : input.Status === TrainingSessionStatus.Open && input.AvailablePlaces > 0;

  if (input.AvailablePlaces <= FEW_PLACES_THRESHOLD) {
    return {
      kind: 'few',
      labelHe: 'מקומות אחרונים',
      cssClass: 'avail-warn',
      icon: 'warning',
      canShowRegister: allow,
    };
  }

  return {
    kind: 'available',
    labelHe: 'פנוי לרישום',
    cssClass: 'avail-ok',
    icon: 'event_available',
    canShowRegister: allow,
  };
}
