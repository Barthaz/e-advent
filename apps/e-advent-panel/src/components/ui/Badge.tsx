import type { PaymentStatus, FulfillmentStatus, DeliveryType, ProductType } from '../../types/order';

type BadgeVariant =
  | PaymentStatus
  | FulfillmentStatus
  | DeliveryType
  | ProductType
  | 'new'
  | string;

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  icon?: string;
}

const VARIANT_ICON: Record<string, string> = {
  pending: 'fa-clock',
  succeeded: 'fa-check-circle',
  failed: 'fa-times-circle',
  new: 'fa-star',
  processing: 'fa-gear',
  shipped: 'fa-truck',
  delivered: 'fa-box-open',
  cancelled: 'fa-ban',
  hold: 'fa-pause-circle',
  none: 'fa-laptop',
  pending_address: 'fa-location-dot',
  poczta_polska: 'fa-envelope',
  courier_inpost: 'fa-truck-fast',
  parcel_inpost: 'fa-box',
  interactive: 'fa-mobile-screen',
  scratch: 'fa-screwdriver-wrench',
  letter: 'fa-envelope-open-text',
};

export default function Badge({ variant, label, icon }: BadgeProps) {
  const iconClass = icon ?? VARIANT_ICON[variant] ?? 'fa-circle';
  const cssVariant = variant === 'new' ? 'new' : variant;

  return (
    <span className={`badge badge-${cssVariant}`}>
      <i className={`fa-solid ${iconClass} text-[0.65rem]`} />
      {label}
    </span>
  );
}
