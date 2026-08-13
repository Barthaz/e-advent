interface AndroidPromoProps {
  label?: string;
  className?: string;
  analyticsLabel?: string;
}

export default function AndroidPromo({
  label = 'Pobierz na Androida',
  className = '',
  analyticsLabel = 'generic',
}: AndroidPromoProps) {
  return (
    <div className={`android-promo ${className}`}>
      <div className="flex items-center justify-center mb-3">
        <i className="fab fa-android text-christmas-gold-light text-2xl mr-2" />
        <h3 className="text-lg font-semibold">Pobierz aplikację na Androida</h3>
      </div>
      <p className="text-white/75 text-sm text-center mb-3">
        Korzystaj z kalendarza jeszcze wygodniej na swoim telefonie
      </p>
      <div className="flex justify-center">
        <a
          href="https://e-advent.pl/download/e-advent.apk"
          className="btn-gold px-5 py-2 text-sm"
          onClick={() => {
            if (typeof window !== 'undefined' && window.gtag) {
              window.gtag('event', 'android_app_downloaded', {
                event_category: 'engagement',
                event_label: analyticsLabel,
              });
            }
          }}
        >
          <i className="fab fa-android" />
          {label}
        </a>
      </div>
    </div>
  );
}
