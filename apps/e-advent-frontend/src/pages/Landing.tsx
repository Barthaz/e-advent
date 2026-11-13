import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import ChristmasCountdown from '../components/ChristmasCountdown';
import SocialShare from '../components/SocialShare';
import SantaAudioPlayer from '../santa-message/SantaAudioPlayer';
import { formatPrice, getProduct, PRODUCT_FAMILIES } from '../config/products';
import { trackSantaEvent } from '../utils/analytics';
import calendar from '../assets/home/calendar.webp';
import letter from '../assets/list/list_1.webp';
import room from '../assets/home/christmas-room.webp';
import '../santa-message/santa-mail.css';
import './landing.css';

const LETTER_PRICE = getProduct('santa-letter')!.basePrice;
const CALENDAR_PRICE = PRODUCT_FAMILIES.find((family) => family.type === 'interactive')!.priceFrom;

const FAQ = [
  {
    question: 'Co dokładnie otrzymam po zamówieniu?',
    answer: 'Kalendarz online to prywatna strona z 24 okienkami — link otrzymasz e-mailem po płatności. Kalendarz zdrapka i zestaw do napisania listu to produkty fizyczne, które wyślemy do Ciebie kurierem. Wiadomość od Mikołaja to spersonalizowane nagranie głosowe ze stroną odsłuchu i możliwością pobrania MP3.',
  },
  {
    question: 'Czy wiadomość od Mikołaja jest rozmową na żywo?',
    answer: 'To nagranie przygotowane automatycznie z użyciem syntezy mowy, na podstawie informacji podanych przez rodzica. Mikołaj zwraca się do dziecka po imieniu i nawiązuje do jego małych sukcesów. Przykładowego głosu możesz posłuchać przed zakupem.',
  },
  {
    question: 'Kiedy dotrze moja przesyłka lub wiadomość?',
    answer: 'Link do kalendarza online jest dostępny po opłaceniu zamówienia. Produkty fizyczne przygotowujemy w ciągu 3–5 dni roboczych, do których należy doliczyć czas dostawy. Nagranie powstaje zwykle w ciągu 24 godzin od opłacenia zamówienia. W szczycie sezonu może to potrwać dłużej.',
  },
  {
    question: 'Jak działa zestaw list + wiadomość?',
    answer: 'Do papierowego zestawu do napisania listu dodajesz wiadomość głosową w cenie pakietowej. List dostarczymy przesyłką, a na e-mail wyślemy instrukcję personalizacji nagrania. Informacje o dziecku wpisujesz w formularzu — nie trzeba przesyłać zdjęcia napisanego listu.',
  },
  {
    question: 'Czy możemy wracać do nagrania?',
    answer: 'Tak. Prywatny link pozwala słuchać wiadomości wielokrotnie w okresie jej dostępności. Datę znajdziesz na stronie odsłuchu. Możesz też pobrać MP3 i zachować nagranie na swoim urządzeniu.',
  },
  {
    question: 'Czy kalendarz muszę wypełniać samodzielnie?',
    answer: 'W kalendarzu online możesz wpisać własne zadania albo skorzystać z gotowych propozycji. Kalendarz zdrapka zamawiasz z wybranym wzorem i zestawem zadań. Obie wersje znajdziesz w rozdziale „Kalendarze adwentowe”.',
  },
];

export default function Landing() {
  const standalone = getProduct('voice-message')!.basePrice;
  const addon = getProduct('voice-message-addon')!.basePrice;
  const bundle = LETTER_PRICE + addon;
  const savings = Math.max(0, standalone - addon);
  const chapters = [
    {
      number: '01', title: 'List do Mikołaja', line: 'Daj marzeniom miejsce na papierze.',
      text: 'Usiądźcie przy stole. Przygotujcie kredki. Niech małe i wielkie życzenia wyruszą w swoją najważniejszą podróż.',
      image: letter, alt: 'Papierowy zestaw do napisania listu do Świętego Mikołaja',
      to: '/list-do-swietego-mikolaja', cta: 'Poznaj zestaw do listu', price: `od ${formatPrice(LETTER_PRICE)}`, detail: 'Papierowy zestaw · wysyłka',
    },
    {
      number: '02', title: 'Kalendarze adwentowe', line: 'Zacznij od wspólnego odliczania.',
      text: 'Jedno okienko, jeden mały powód, żeby pobyć razem. Przez 24 grudniowe dni — online lub na papierowej zdrapce.',
      image: calendar, alt: 'Kalendarz online e-Advent z 24 okienkami',
      to: '/kalendarze-adwentowe', cta: 'Odkryj kalendarze', price: `od ${formatPrice(CALENDAR_PRICE)}`, detail: 'Online lub zdrapka',
    },
    {
      number: '03', title: 'Wiadomość od Mikołaja', line: 'A potem usłysz coś tylko dla siebie.',
      text: 'Spersonalizowane nagranie. Mikołaj zwraca się po imieniu i mówi o tym, co dla Twojego dziecka naprawdę ważne.',
      image: '/assets/santa-mail/santa-reading.webp', alt: 'Święty Mikołaj czyta list w swojej pracowni',
      to: '/wiadomosc-od-mikolaja', cta: 'Poznaj wiadomość', price: formatPrice(standalone), detail: 'Nagranie z imieniem dziecka · link i MP3',
    },
  ];

  return (
    <>
      <SEOHead
        title="Kalendarze adwentowe i prezenty od Mikołaja | e-Advent"
        description="Zaproś bliskich do świątecznej przygody. Personalizowane kalendarze adwentowe, zestawy do napisania listu i wiadomości głosowe od Świętego Mikołaja."
        canonical="https://e-advent.pl/"
      />
      <div className="home-story">
        <section className="story-hero" aria-labelledby="home-title">
          <div className="story-hero-photo"><img src={room} alt="" width={853} height={1844} fetchPriority="high" /></div>
          <div className="story-hero-shade" />
          <div className="story-container story-hero-content">
            <p className="story-kicker">Twój dom. Wasi bliscy. Wasze święta.</p>
            <h1 id="home-title">Kalendarze adwentowe<br /><em>i prezenty od Mikołaja</em></h1>
            <ChristmasCountdown />
            <p className="story-hero-copy">W czekaniu na pierwsze okienko. W liście pisanym z przejęciem. W głosie Mikołaja, który zna Twoje imię.</p>
            <p className="story-hero-invitation">Małe rytuały, do których wraca się po latach.</p>
            <a className="btn-red story-cta" href="#rozdzialy">Rozpocznij świąteczną przygodę <i className="fas fa-arrow-down" aria-hidden="true" /></a>
            <Link className="story-return" to="/kalendarz">Masz już kalendarz? <span>Otwórz swoje okienko <i className="fas fa-arrow-right" aria-hidden="true" /></span></Link>
          </div>
          <p className="story-hero-caption">Najpiękniejsze święta zaczynają się od bycia razem.</p>
        </section>

        <section id="rozdzialy" className="story-section story-chapters" aria-labelledby="chapters-title">
          <div className="story-container">
            <header className="story-section-heading">
              <p className="story-kicker">Jeden świąteczny świat</p>
              <h2 id="chapters-title">Trzy rozdziały magii świąt</h2>
              <p>Każda rodzina ma swoje tradycje. Tu znajdziesz początek kolejnej.</p>
            </header>
            <div className="story-chapter-grid">
              {chapters.map((chapter) => (
                <article className="story-chapter" key={chapter.number}>
                  <Link className={`story-chapter-image story-chapter-image--${chapter.number}`} to={chapter.to} aria-label={chapter.title}>
                    <img src={chapter.image} alt={chapter.alt} loading="lazy" width={600} height={450} />
                    <span>Rozdział {chapter.number}</span>
                  </Link>
                  <div className="story-chapter-copy">
                    <p className="story-chapter-detail">{chapter.detail}</p>
                    <h3>{chapter.title}</h3>
                    <p className="story-chapter-line">{chapter.line}</p>
                    <p className="story-chapter-description">{chapter.text}</p>
                    <div className="story-chapter-bottom"><span>{chapter.price}</span><Link className="btn-green" to={chapter.to}>{chapter.cta}<i className="fas fa-arrow-right" aria-hidden="true" /></Link></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="story-voice" aria-labelledby="voice-title">
          <div className="story-voice-photo"><img src="/assets/santa-mail/santa-reading.webp" alt="Święty Mikołaj przy biurku, gotowy do nagrania wiadomości" /></div>
          <div className="story-container story-voice-layout">
            <div className="story-voice-copy">
              <p className="story-kicker">Nowy rozdział w e-Advent</p>
              <h2 id="voice-title">Mikołaj<br /><em>ma wiadomość.</em></h2>
              <p>Przykład poniżej to tylko głos. Własną wiadomość układasz pod dziecko: Mikołaj wypowie jego imię, wspomni mały sukces i powie kilka słów tylko dla niego.</p>
              <ul className="story-voice-points">
                <li>Po zakupie wpisujesz imię i to, z czego dziecko jest dumne</li>
                <li>Na e-mail przychodzi prywatny link i plik MP3</li>
              </ul>
              <div className="story-sample">
                <p className="story-sample-label"><span /> Posłuchaj, jak to brzmi</p>
                <SantaAudioPlayer src="/assets/santa_sample.mp3" variant="wave" size={400} durationHint={24}
                  onFirstPlay={() => trackSantaEvent('santa_audio_play', { source: 'demo' })}
                  onProgress={(mark) => trackSantaEvent('santa_audio_progress', { progress_percent: mark, source: 'demo' })}
                  onError={(kind) => trackSantaEvent('santa_player_error', { error_type: kind, source: 'demo' })}
                />
              </div>
              <Link className="btn-red story-cta" to="/wiadomosc-od-mikolaja/kreator" onClick={() => trackSantaEvent('santa_product_cta_click', { cta_location: 'landing_voice', purchase_mode: 'standalone' })}>
                Stwórz wiadomość dla dziecka<i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="story-section story-bundle" aria-labelledby="bundle-title">
          <div className="story-container story-bundle-layout">
            <div className="story-bundle-image"><img src={letter} alt="Zestaw do napisania listu z kopertą i świątecznymi dodatkami" loading="lazy" width={900} height={1125} /><span className="story-bundle-note">Najpierw list.<br /><em>Potem ten głos.</em></span></div>
            <div className="story-bundle-copy">
              <p className="story-kicker">Dwa rozdziały, jedna opowieść</p>
              <h2 id="bundle-title">Od „Drogi Mikołaju…”<br />do „Witaj, <em>maluchu!</em>”</h2>
              <p>Najpierw wspólnie zapisujecie marzenia. Później dziecko słyszy Mikołaja, który zwraca się właśnie do niego. Połącz papierowy list z osobistą wiadomością głosową.</p>
              <ul className="story-bundle-includes"><li><i className="far fa-envelope" aria-hidden="true" /> Zestaw do napisania listu — przesyłka do domu</li><li><i className="fas fa-headphones" aria-hidden="true" /> Spersonalizowane nagranie — prywatny link i MP3</li></ul>
              <div className="story-bundle-price"><span>List + wiadomość</span><strong>{formatPrice(bundle)}</strong><p>Osobno: {formatPrice(LETTER_PRICE + standalone)}{savings > 0 && <> · W zestawie oszczędzasz {formatPrice(savings)}</>}</p><small>+ koszt dostawy</small></div>
              <Link className="btn-green story-cta" to="/list-do-swietego-mikolaja?wiadomosc=1" onClick={() => trackSantaEvent('santa_product_cta_click', { cta_location: 'landing_bundle', purchase_mode: 'letter_addon' })}>
                Wybierz magiczny zestaw<i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="story-section story-how" aria-labelledby="how-title">
          <div className="story-container">
            <header className="story-section-heading"><p className="story-kicker">Dla rodziców — po prostu</p><h2 id="how-title">Ty wybierasz chwilę.<br />My pomagamy ją przygotować.</h2><p>Każdy produkt ma własną drogę do Waszego domu. Wszystko wyjaśniamy przed zakupem.</p></header>
            <ol className="story-steps">
              <li><span>01</span><h3>Wybierz swój rozdział</h3><p>Kalendarz, papierowy list, nagranie — albo zestaw. Na stronie produktu zobaczysz jego zawartość i cenę.</p></li>
              <li><span>02</span><h3>Dodaj coś od siebie</h3><p>W kreatorze kalendarza wybierzesz zadania. W kreatorze wiadomości opowiesz Mikołajowi o dziecku.</p></li>
              <li><span>03</span><h3>Odbierz i cieszcie się razem</h3><p>Produkty cyfrowe otrzymasz e-mailem. List i zdrapkę wyślemy do Ciebie kurierem. Pozostaje znaleźć Waszą wspólną chwilę.</p></li>
            </ol>
            <div className="story-delivery-note"><i className="fas fa-box-open" aria-hidden="true" /><p><strong>List i zdrapka:</strong> realizacja 3–5 dni roboczych + dostawa.<br /><strong>Nagranie:</strong> zwykle do 24 godzin od opłacenia zamówienia.</p><Link to="/dostawa-i-zwroty">O dostawie i zwrotach <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div>
          </div>
        </section>

        <section className="story-section story-trust" aria-labelledby="trust-title">
          <div className="story-container story-trust-layout">
            <div className="story-trust-intro">
              <p className="story-kicker">Żeby spokojnie czekać na święta</p>
              <h2 id="trust-title">Magia dla dzieci.<br /><em>Jasne zasady dla Ciebie.</em></h2>
              <p>Chcemy, żeby niespodzianka czekała na dziecko. Ty możesz wcześniej poznać produkty, posłuchać głosu i sprawdzić, co zamawiasz.</p>
              <ul><li>Próbka nagrania dostępna przed zakupem.</li><li>Prywatne linki do produktów cyfrowych.</li><li>Zawartość zestawu i koszty pokazane przy zamówieniu.</li></ul>
              <p className="story-contact">Potrzebujesz pomocy w wyborze?<a href="mailto:kontakt@e-advent.pl">kontakt@e-advent.pl <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /></a></p>
            </div>
            <div className="story-faq"><h3>O co najczęściej pytają klienci?</h3>{FAQ.map((item) => <details key={item.question}><summary>{item.question}<i className="fas fa-plus" aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
          </div>
        </section>

        <section className="story-ending" aria-labelledby="ending-title">
          <img src={room} alt="" />
          <div className="story-container"><p className="story-kicker">To właśnie te chwile</p><h2 id="ending-title">Święta mijają.<br /><em>Magia zostaje.</em></h2><p>Nie zawsze pamiętamy, co było pod choinką.<br />Pamiętamy za to, z kim przeżywaliśmy święta.<br />I jak się wtedy czuliśmy.</p><a className="btn-red story-cta" href="#rozdzialy">Wybierz Wasz świąteczny rozdział<i className="fas fa-arrow-up" aria-hidden="true" /></a><span className="story-signature">Do zobaczenia w Waszych wspomnieniach, e-Advent</span></div>
        </section>

        <section className="story-share" aria-label="Udostępnij e-Advent">
          <div className="story-container"><p className="story-kicker">Podziel się magią świąt z bliskimi</p><SocialShare /></div>
        </section>
      </div>
    </>
  );
}
