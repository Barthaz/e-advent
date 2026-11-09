import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './voice-product.css';
import SEOHead from '../../components/SEOHead';
import ProductHero from '../../components/product-page/ProductHero';
import ProductIntro from '../../components/product-page/ProductIntro';
import ProductHighlights from '../../components/product-page/ProductHighlights';
import ProductSteps from '../../components/product-page/ProductSteps';
import ProductStory from '../../components/product-page/ProductStory';
import ProductCrossSell from '../../components/product-page/ProductCrossSell';
import ProductFaq from '../../components/product-page/ProductFaq';
import { formatPrice, getProduct } from '../../config/products';
import { trackSantaEvent, trackViewItem } from '../../utils/analytics';
import SantaAudioPlayer from '../../santa-message/SantaAudioPlayer';
import { samplePath } from '../../santa-message/samples';

const SKU = 'voice-message';
const LETTER_PRICE = getProduct('santa-letter')?.basePrice ?? 29;

const HIGHLIGHTS = [
  { icon: 'far fa-heart', label: 'Z imieniem Twojego dziecka' },
  { icon: 'far fa-clock', label: 'Około 1,5 minuty ciepłych słów' },
  { icon: 'fas fa-headphones', label: 'Do słuchania wiele razy' },
];

const STEPS = [
  { title: 'Opowiadasz o dziecku', text: 'Imię, forma zwracania się i 2–5 krótkich zdań: sukcesy, z czego jesteście dumni, marzenia.' },
  { title: 'Sprawdzasz tekst', text: 'Widzisz dokładnie, co powie Mikołaj. Po zakupie raz jeszcze zatwierdzasz scenariusz.' },
  { title: 'Mikołaj nagrywa', text: 'Przygotowujemy nagranie ciepłym głosem Mikołaja — ok. 1,5 minuty, maks. 2 minuty.' },
  { title: 'Link na e-mail', text: 'Dostajesz prywatny link do odsłuchu i plik MP3 do pobrania — zwykle w ciągu 24 godzin.' },
];

const HEARS = [
  { text: 'Mikołaj wita dziecko po imieniu — w formie, którą wybierzesz („Witaj, Zosiu!”).' },
  { text: 'Opowiada, co przeczytał w liście od bliskich: sukcesy, odwagę, dobre serce.' },
  { text: 'Docenia wysiłek i zachęca — bez oceniania, straszenia i obiecywania prezentów.' },
  { text: 'Kończy ciepłymi życzeniami świątecznymi prosto z Laponii.' },
];

function buildFaq(standalone: number, addon: number) {
  return [
    { q: 'Czy to rozmowa na żywo?', a: 'Nie. To nagranie przygotowane automatycznie (synteza mowy) na podstawie tego, co napiszesz. Przed nagraniem zobaczysz i zatwierdzisz pełny tekst.' },
    { q: 'Jak otrzymam wiadomość?', a: 'Na adres e-mail podany w zamówieniu wyślemy prywatny link do strony odsłuchu. Tam możesz też pobrać plik MP3.' },
    { q: 'Ile to trwa?', a: 'Zwykle do 24 godzin od zatwierdzenia tekstu. W grudniu, w szczycie sezonu, może to potrwać nieco dłużej — napiszemy, gdyby coś się opóźniało.' },
    { q: 'Czy mogę poprawić tekst?', a: 'Tak. Przed zakupem możesz edytować wszystko dowolnie, a po zakupie — raz poprawić dane, zanim powstanie nagranie.' },
    { q: 'Dlaczego taniej z listem?', a: `Wiadomość jako dodatek do listu kosztuje ${formatPrice(addon)} zamiast ${formatPrice(standalone)}. Cena dodatku obowiązuje dla jednej wiadomości na każdy list w zamówieniu.` },
    { q: 'Co z danymi dziecka?', a: 'Zbieramy tylko to, co potrzebne do wiadomości. Dane są szyfrowane, link jest prywatny, a nagranie przechowujemy przez 12 miesięcy. Nie wpisuj danych o zdrowiu, szkole ani adresu.' },
  ];
}

export default function VoiceMessageProduct() {
  const standalone = getProduct(SKU)!.basePrice;
  const addon = getProduct('voice-message-addon')!.basePrice;

  useEffect(() => {
    trackViewItem({ sku: SKU, name: getProduct(SKU)?.name ?? 'Wiadomość od Świętego Mikołaja', price: standalone, category: 'santa_message' });
  }, [standalone]);

  const cta = (location: string, mode: 'standalone' | 'letter_addon') => () =>
    trackSantaEvent('santa_product_cta_click', { cta_location: location, purchase_mode: mode });

  const listenCard = (
    <div className="voice-listen-card">
      <div className="voice-photo"><img src="/assets/santa-mail/santa-reading.webp" alt="Święty Mikołaj czyta list przy biurku w świątecznej pracowni" width={1536} height={1024} fetchPriority="high" /><span>Chwila ciszy. Mikołaj ma coś do powiedzenia.</span></div>
      <div className="voice-sample">
        <div className="voice-sample-heading"><div><p className="voice-sample-kicker">Usłysz, zanim zamówisz</p><h2>Posłuchaj Mikołaja</h2></div><span>Próbka głosu</span></div>
        <SantaAudioPlayer variant="wave" src="/assets/santa_sample.mp3" size={400} durationHint={24} onFirstPlay={() => trackSantaEvent('santa_audio_play', { source: 'demo' })} onProgress={mark => trackSantaEvent('santa_audio_progress', { progress_percent: mark, source: 'demo' })} onError={kind => trackSantaEvent('santa_player_error', { error_type: kind, source: 'demo' })} />
        <Link to={samplePath()} className="voice-sample-link">Przykładowy odsłuch — wiadomość dla Feliksa <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <SEOHead title="Wiadomość głosowa od Świętego Mikołaja z imieniem dziecka | e-Advent" description="Osobista wiadomość od Świętego Mikołaja. Imię dziecka, małe sukcesy i ciepłe życzenia. Prywatny odsłuch i MP3 na pamiątkę." canonical="https://e-advent.pl/wiadomosc-od-mikolaja" ogImage="https://e-advent.pl/assets/santa-mail/santa-reading.webp" />

      <ProductHero media={listenCard}>
        <ProductIntro
          eyebrow="Z pracowni Świętego Mikołaja"
          title={<>Ten głos. To imię.<br /><em>Ta radość.</em></>}
          description="Osobista wiadomość głosowa od Mikołaja, w której najważniejsze jest Twoje dziecko — jego małe sukcesy, wielkie marzenia i to, z czego jesteście dumni."
          price={formatPrice(standalone)}
          priceHint="Bez kosztów dostawy · prywatny link i MP3"
          priceNote="Jedna wiadomość. Tylko dla Was."
          features={['Imię dziecka i jego małe sukcesy', 'Tekst sprawdzisz przed nagraniem', 'Ciepłe słowa na pamiątkę po świętach', 'Prywatny link i plik MP3']}
        />
        <div className="mb-4">
          <Link to="/wiadomosc-od-mikolaja/kreator" onClick={cta('product_hero', 'standalone')} className="btn-gold px-8 py-3.5 text-lg">
            Stwórz wiadomość <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>
        <Link className="mb-4 inline-block text-sm text-christmas-gold-light underline underline-offset-4 hover:text-white" to="/list-do-swietego-mikolaja?wiadomosc=1" onClick={cta('product_hero_bundle', 'letter_addon')}>
          Z listem wiadomość kosztuje {formatPrice(addon)} <i className="fas fa-arrow-right ml-1 text-[0.65rem]" aria-hidden="true" />
        </Link>
        <p className="text-white/45 text-xs">Tekst sprawdzisz przed nagraniem. Gotową wiadomość otrzymasz zwykle w ciągu 24 godzin od akceptacji.</p>
      </ProductHero>

      <ProductHighlights items={HIGHLIGHTS} />
      <ProductSteps kicker="Od kilku zdań do wielkiego uśmiechu" title={<>Ty znasz dziecko.<br /><em>Mikołaj ubierze to w słowa.</em></>} steps={STEPS} />
      <ProductStory
        kicker="Co usłyszy dziecko?"
        title={<>„Witaj, Zosiu.<br /><em>Słyszałem o Tobie<br />tyle dobrego…”</em></>}
        description="Najpiękniejsze słowa dotyczą rzeczy naprawdę ważnych dla Waszej rodziny."
        items={HEARS}
      />
      <ProductCrossSell
        kicker="Dwie części jednej opowieści"
        title={<>Najpierw list.<br /><em>Potem głos Mikołaja.</em></>}
        text="Papierowy list do wspólnego wypełnienia i wiadomość głosowa przygotowana na podstawie Twoich słów. Mały świąteczny rytuał od początku do końca."
        price={formatPrice(LETTER_PRICE + addon)}
        priceNote={<>list + wiadomość<br /><small>+ koszt dostawy listu</small></>}
        cta={{ label: 'Wybierz zestaw', to: '/list-do-swietego-mikolaja?wiadomosc=1', onClick: cta('product_bundle_section', 'letter_addon') }}
      />
      <ProductFaq
        items={buildFaq(standalone, addon)}
        note={<>Nagranie jest treścią cyfrową przygotowaną na indywidualne zamówienie. Szczegóły znajdziesz w <Link to="/regulamin">regulaminie</Link> i <Link to="/polityka-prywatnosci">polityce prywatności</Link>.</>}
      />
    </div>
  );
}
