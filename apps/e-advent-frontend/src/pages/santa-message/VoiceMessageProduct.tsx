import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageBackground from '../../components/PageBackground';
import ParchmentCard from '../../components/ParchmentCard';
import SEOHead from '../../components/SEOHead';
import logo from '@e-advent/assets/brand/eadvent-logo.png';
import { formatPrice, getProduct } from '../../config/products';
import { trackSantaEvent, trackViewItem } from '../../utils/analytics';
import SantaAudioPlayer from '../../santa-message/SantaAudioPlayer';
import { useVoiceConfig } from '../../santa-message/useVoiceConfig';

const SKU = 'voice-message';
const LETTER_PRICE = getProduct('santa-letter')?.basePrice ?? 29;

const STEPS = [
  { icon: 'fa-pen-fancy', title: 'Opowiadasz o dziecku', text: 'Imię, forma zwracania się i 2–5 krótkich zdań: sukcesy, z czego jesteście dumni, marzenia.' },
  { icon: 'fa-scroll', title: 'Sprawdzasz tekst', text: 'Widzisz dokładnie, co powie Mikołaj. Po zakupie raz jeszcze zatwierdzasz scenariusz.' },
  { icon: 'fa-microphone-alt', title: 'Mikołaj nagrywa', text: 'Przygotowujemy nagranie ciepłym głosem Mikołaja — ok. 1,5 minuty, maks. 2 minuty.' },
  { icon: 'fa-envelope-open-text', title: 'Link na e-mail', text: 'Dostajesz prywatny link do odsłuchu i plik MP3 do pobrania — zwykle w ciągu 24 godzin.' },
];

const HEARS = [
  'Mikołaj wita dziecko po imieniu — w formie, którą wybierzesz („Witaj, Zosiu!”).',
  'Opowiada, co przeczytał w liście od bliskich: sukcesy, odwagę, dobre serce.',
  'Docenia wysiłek i zachęca — bez oceniania, straszenia i obiecywania prezentów.',
  'Kończy ciepłymi życzeniami świątecznymi prosto z Laponii.',
];

const FAQ = [
  { q: 'Czy to rozmowa na żywo?', a: 'Nie. To nagranie przygotowane automatycznie (synteza mowy) na podstawie tego, co napiszesz. Przed nagraniem zobaczysz i zatwierdzisz pełny tekst.' },
  { q: 'Jak otrzymam wiadomość?', a: 'Na adres e-mail podany w zamówieniu wyślemy prywatny link do strony odsłuchu. Tam możesz też pobrać plik MP3.' },
  { q: 'Ile to trwa?', a: 'Zwykle do 24 godzin od zatwierdzenia tekstu. W grudniu, w szczycie sezonu, może to potrwać nieco dłużej — napiszemy, gdyby coś się opóźniało.' },
  { q: 'Czy mogę poprawić tekst?', a: 'Tak. Przed zakupem możesz edytować wszystko dowolnie, a po zakupie — raz poprawić dane, zanim powstanie nagranie.' },
  { q: 'Dlaczego taniej z listem?', a: `Wiadomość jako dodatek do Listu do Świętego Mikołaja kosztuje 14,90 zł zamiast 19,90 zł. Cena dodatku obowiązuje dla jednej wiadomości na każdy list w zamówieniu.` },
  { q: 'Co z danymi dziecka?', a: 'Zbieramy tylko to, co potrzebne do wiadomości. Dane są szyfrowane, link jest prywatny, a nagranie przechowujemy przez 12 miesięcy. Nie wpisuj danych o zdrowiu, szkole ani adresu.' },
];

export default function VoiceMessageProduct() {
  const { config, loading } = useVoiceConfig();
  const standalone = config?.prices.standalone ?? getProduct(SKU)?.basePrice ?? 19.9;
  const addon = config?.prices.letterAddon ?? getProduct('voice-message-addon')?.basePrice ?? 14.9;
  const canBuy = Boolean(config?.standaloneEnabled);
  const canBundle = Boolean(config?.letterAddonEnabled);

  useEffect(() => {
    if (!canBuy) return;
    trackViewItem({ sku: SKU, name: getProduct(SKU)?.name ?? 'Wiadomość od Świętego Mikołaja', price: standalone, category: 'santa_message' });
  }, [canBuy, standalone]);

  const cta = (location: string, mode: 'standalone' | 'letter_addon') => () =>
    trackSantaEvent('santa_product_cta_click', { cta_location: location, purchase_mode: mode });

  return (
    <>
      <SEOHead
        title="Wiadomość głosowa od Świętego Mikołaja z imieniem dziecka | e-Advent"
        description="Osobista wiadomość głosowa od Świętego Mikołaja: imię dziecka, jego sukcesy i świąteczne życzenia. Link do odsłuchu i MP3 na e-mail. 19,90 zł lub 14,90 zł z listem."
        keywords="wiadomość od mikołaja, nagranie od świętego mikołaja, głos mikołaja z imieniem dziecka, personalizowana wiadomość mikołaj"
        canonical="https://e-advent.pl/wiadomosc-od-mikolaja"
        ogImage="https://e-advent.pl/assets/santa.png"
      />

      <PageBackground className="py-8 md:py-12" showSnow overlayOpacity="medium">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6 flex justify-center">
            <Link to="/">
              <img src={logo} alt="e-Advent" className="h-16 md:h-20 w-auto drop-shadow-xl" />
            </Link>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="relative rounded-3xl overflow-hidden border border-christmas-gold/30 shadow-2xl bg-[#13281d]">
              <img
                src="/assets/santa.png"
                alt="Święty Mikołaj w pracowni w Laponii"
                className="w-full aspect-[16/10] object-cover object-left"
                width={1672}
                height={941}
                decoding="async"
              />
              <div className="p-4 sm:p-3 sm:absolute sm:inset-y-0 sm:right-0 sm:w-[46%] flex items-center justify-center">
                <div className="santa-glass w-full py-4 px-2 flex flex-col items-center">
                  <p className="text-[0.65rem] tracking-[0.2em] uppercase text-christmas-gold mb-1">Posłuchaj przykładu</p>
                  <SantaAudioPlayer
                    src="/assets/santa_sample.mp3"
                    size={150}
                    durationHint={24}
                    onFirstPlay={() => trackSantaEvent('santa_audio_play', { source: 'demo' })}
                    onProgress={(mark) => trackSantaEvent('santa_audio_progress', { progress_percent: mark, source: 'demo' })}
                    onError={(kind) => trackSantaEvent('santa_player_error', { error_type: kind, source: 'demo' })}
                  />
                </div>
              </div>
            </div>

            <div className="text-white">
              <p className="text-christmas-gold text-sm tracking-[0.2em] uppercase mb-3">
                Nowość <span className="hero-action-badge">NOWE</span>
              </p>
              <h1 className="font-display text-3xl md:text-5xl font-semibold text-christmas-gold-light mb-4 leading-tight">
                Wiadomość głosowa od Świętego Mikołaja
              </h1>
              <p className="text-white/80 text-base md:text-lg leading-relaxed mb-6">
                Mikołaj zwraca się do dziecka po imieniu, wspomina jego tegoroczne sukcesy i to, z czego jesteście dumni.
                Nagranie ok. 1,5 minuty — link do odsłuchu i MP3 przychodzą na e-mail.
              </p>

              <div className="mb-6">
                <p className="font-display text-4xl font-semibold text-christmas-gold-light">{formatPrice(standalone)}</p>
                <p className="text-white/70 text-sm mt-2">
                  lub <strong className="text-christmas-gold-light">{formatPrice(addon)}</strong> jako dodatek do Listu do Świętego Mikołaja
                </p>
                <p className="text-white/50 text-xs mt-1">Produkt cyfrowy — bez kosztów dostawy</p>
              </div>

              {loading ? (
                <p className="text-white/70" role="status"><i className="fas fa-snowflake fa-spin mr-2" aria-hidden="true" />Sprawdzamy dostępność…</p>
              ) : canBuy || canBundle ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  {canBuy && (
                    <Link to="/wiadomosc-od-mikolaja/kreator" onClick={cta('product_hero', 'standalone')} className="btn-gold px-7 py-3.5 text-lg">
                      <i className="fas fa-microphone-alt" aria-hidden="true" /> Stwórz wiadomość
                    </Link>
                  )}
                  {canBundle && (
                    <Link to="/list-do-swietego-mikolaja?wiadomosc=1" onClick={cta('product_hero_bundle', 'letter_addon')} className="btn-outline-gold px-6 py-3.5">
                      List + wiadomość za {formatPrice(LETTER_PRICE + addon)}
                    </Link>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-christmas-gold/40 bg-black/20 px-4 py-3 text-white/85">
                  Wkrótce w sprzedaży — elfy kończą przygotowania.
                </p>
              )}
              <p className="text-white/50 text-xs mt-4">
                <Link to="/od-mikolaja/przyklad" className="underline underline-offset-4 hover:text-white">Zobacz, jak wygląda strona odsłuchu</Link>
              </p>
            </div>
          </div>
        </div>
      </PageBackground>

      <section className="section-cream py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="section-title mb-4 text-center">Jak powstaje wiadomość?</h2>
          <div className="gold-divider mb-10" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <ParchmentCard key={step.title} padding="md" className="h-full text-center">
                <div className="icon-circle mx-auto mb-3"><i className={`fas ${step.icon} text-parchment-text`} aria-hidden="true" /></div>
                <p className="text-xs text-parchment-muted mb-1">Krok {i + 1}</p>
                <h3 className="font-display text-xl font-semibold text-parchment-text mb-2">{step.title}</h3>
                <p className="text-parchment-muted text-sm leading-relaxed">{step.text}</p>
              </ParchmentCard>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="section-title mb-4 text-center">Co usłyszy dziecko?</h2>
          <div className="gold-divider mb-10" />
          <ParchmentCard padding="lg">
            <ul className="space-y-3">
              {HEARS.map((line) => (
                <li key={line} className="flex gap-3 text-parchment-text leading-relaxed">
                  <i className="fas fa-star text-christmas-gold mt-1.5 text-xs" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </ParchmentCard>
        </div>
      </section>

      {canBundle && (
        <section className="section-cream py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <ParchmentCard padding="lg" className="md:flex md:items-center md:gap-8">
              <div className="flex-1">
                <p className="text-xs tracking-[0.2em] uppercase text-christmas-gold mb-2">Zestaw świąteczny</p>
                <h2 className="font-display text-3xl font-semibold text-parchment-text mb-3">List do Mikołaja + odpowiedź głosem Mikołaja</h2>
                <p className="text-parchment-muted leading-relaxed">
                  Dziecko wysyła papierowy list, a potem słyszy, że Mikołaj naprawdę go przeczytał.
                  Wiadomość do listu kosztuje tylko {formatPrice(addon)} zamiast {formatPrice(standalone)}.
                </p>
              </div>
              <div className="mt-6 md:mt-0 text-center shrink-0">
                <p className="font-display text-3xl font-semibold text-parchment-text">{formatPrice(LETTER_PRICE + addon)}</p>
                <p className="text-xs text-parchment-muted mb-3">list {formatPrice(LETTER_PRICE)} + wiadomość {formatPrice(addon)} + dostawa listu</p>
                <Link to="/list-do-swietego-mikolaja?wiadomosc=1" onClick={cta('product_bundle_section', 'letter_addon')} className="btn-gold px-6 py-3">
                  Wybierz zestaw
                </Link>
              </div>
            </ParchmentCard>
          </div>
        </section>
      )}

      <section className={`${canBundle ? 'bg-white' : 'section-cream'} py-16 md:py-20`}>
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="section-title mb-4 text-center">Najczęstsze pytania</h2>
          <div className="gold-divider mb-10" />
          <div className="space-y-4">
            {FAQ.map((item) => (
              <ParchmentCard key={item.q} padding="md">
                <h3 className="font-display text-lg md:text-xl font-semibold text-parchment-text mb-2">{item.q}</h3>
                <p className="text-parchment-muted text-sm leading-relaxed">{item.a}</p>
              </ParchmentCard>
            ))}
          </div>
          <p className="text-xs text-parchment-muted text-center mt-8 leading-relaxed">
            Nagranie jest treścią cyfrową przygotowaną na indywidualne zamówienie. Szczegóły realizacji, odstąpienia i reklamacji
            znajdziesz w <Link to="/regulamin" className="underline">regulaminie</Link> i{' '}
            <Link to="/polityka-prywatnosci" className="underline">polityce prywatności</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
