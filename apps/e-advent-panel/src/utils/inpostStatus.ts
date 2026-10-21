const LABELS: Record<string, string> = {
  not_created: 'Nieprzygotowana',
  create_pending: 'Tworzenie przesyłki…',
  create_rejected: 'Odrzucona przez InPost',
  created: 'Utworzona — czeka na oferty',
  offers_prepared: 'Oferty gotowe',
  offer_selected: 'Oferta wybrana',
  confirmed: 'Etykieta gotowa',
  dispatched_by_sender: 'Nadana w Paczkomacie',
  collected_from_sender: 'Odebrana przez kuriera',
  taken_by_courier: 'Odebrana przez kuriera',
  adopted_at_source_branch: 'Przyjęta w oddziale',
  sent_from_source_branch: 'W drodze',
  adopted_at_sorting_center: 'W sortowni',
  sent_from_sorting_center: 'W drodze',
  adopted_at_target_branch: 'W oddziale docelowym',
  out_for_delivery: 'Wydana do doręczenia',
  ready_to_pickup: 'Gotowa do odbioru',
  avizo: 'Awizo',
  delivered: 'Doręczona',
  claimed: 'Reklamacja',
  returned_to_sender: 'Zwrot do nadawcy',
  canceled: 'Anulowana',
};

export function getInpostStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return LABELS[status] ?? status;
}

export function inpostTrackingUrl(trackingNumber: string): string {
  return `https://inpost.pl/sledzenie-przesylek?number=${encodeURIComponent(trackingNumber)}`;
}
