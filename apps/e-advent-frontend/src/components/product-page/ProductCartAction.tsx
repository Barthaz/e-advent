interface ProductCartActionProps {
  onClick: () => void;
  busy?: boolean;
  note?: string;
}

export default function ProductCartAction({
  onClick,
  busy = false,
  note = 'Realizacja 3–5 dni roboczych · Bezpieczna płatność',
}: ProductCartActionProps) {
  return (
    <>
      <div className="mb-4">
        <button type="button" onClick={onClick} className="btn-gold px-8 py-3.5 text-lg" disabled={busy}>
          <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-shopping-basket'}`} />
          {busy ? 'Dodawanie…' : 'Dodaj do koszyka'}
        </button>
      </div>
      {note && <p className="text-white/45 text-xs">{note}</p>}
    </>
  );
}
