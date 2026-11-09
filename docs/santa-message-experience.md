# Wiadomość od Mikołaja — oprawa odsłuchu

Widok `/od-mikolaja/:token` ma trzy etapy: otrzymanie i otwarcie przesyłki, odsłuch, podziękowanie z ponownym odsłuchem i pobraniem MP3. Nie generuje certyfikatów PDF.

`/od-mikolaja/przyklad` pokazuje wyłącznie odsłuch próbki i odnośnik do kreatora. Nie otwiera koperty ani nie pokazuje zakończenia zamówionej wiadomości.

Odtwarzacz pozostaje zamontowany między etapami. Odtwarzanie zaczyna się w obsłudze kliknięcia; finał uruchamia zdarzenie `ended`, nie procent postępu. Fala korzysta z Web Audio AnalyserNode; przy braku analizatora lub ograniczonym ruchu pozostaje statyczna. Zmiana tokena usuwa stan poprzedniej wiadomości.

Pobieranie MP3 odświeża podpisany adres i zapisuje plik przez Blob, także gdy API działa na innej domenie. Dane osobowe nie są dodawane do zdarzeń analitycznych. Pole `childName` w odpowiedzi playback uzupełnia istniejący wołacz `childVocative`.

## Grafiki

Wygenerowane wbudowanym narzędziem imagegen, następnie zapisane jako WebP quality 88:

- `apps/e-advent-frontend/public/assets/santa-mail/north-pole-post.webp` — otrzymanie i zakończenie.
- `apps/e-advent-frontend/public/assets/santa-mail/santa-reading.webp` — odsłuch, demo i grafika produktu.

Koperta, lak, pergamin, ozdobniki i drobinki są elementami HTML/CSS, aby mogły się animować i skalować. Tekst oraz personalizacja pozostają prawdziwym tekstem.

### Prompt — pracownia i odsłuch

Use case: illustration-story. Create one cinematic photographic Christmas artwork for the e-Advent website, landscape 1536x1024. A kind, authentic elderly Santa Claus with round spectacles and richly textured red velvet clothing is seated at his wooden writing desk, reading a cream handwritten letter. Santa's face and upper body occupy the RIGHT half; the LEFT half shows a softly blurred atmospheric dark evergreen workshop with a snowy arched window. Warm amber lantern light, tiny golden Christmas tree lights, deep forest green shadows, burgundy, antique gold. Foreground at bottom: aged paper envelopes with a red wax snowflake seal, fir branches, brass lantern, subtle golden dust. Premium magical realism, intimate and reassuring for children, exquisitely detailed but uncluttered, natural face and hands. Allow dark quiet space in left half for website text; Santa face upper right remains unobstructed. Single continuous scene, NO text, NO lettering, NO UI, NO panels, NO watermark. Inspired by a magical North Pole postal workshop.

### Prompt — przesyłka

Use case: illustration-story. Asset: cinematic Christmas website background, landscape 1536x1024. Magical North Pole postal workshop in premium photographic realism, deep forest greens, antique gold, dark burgundy, warm amber lantern light. Foreground RIGHT half: a beautiful large aged cream envelope tied with red-white string and sealed with deep red wax snowflake, on a rustic wooden desk, fir branches, brass lantern, quill, two small wrapped gifts. In the upper RIGHT background a kind Santa Claus in red velvet and spectacles quietly working at his desk, softly out of focus but recognizable. Snowy arched window, Christmas tree bokeh. LEFT half is darker softly defocused negative space for website text. Rich real materials, elegant intimate storybook atmosphere, subtle golden dust, natural lighting. Match a cinematic e-Advent Christmas workshop, not cartoon. NO text, NO UI, NO watermark, NO panels. Single continuous full bleed scene.

