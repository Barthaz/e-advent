import { useState } from 'react';

interface SocialShareProps {
  url?: string;
  title?: string;
  description?: string;
}

export default function SocialShare({
  url,
  title = 'e-Advent — Niezapomniane chwile świąt',
  description = 'Przeżywaj grudzień w cieple — personalizowany kalendarz adwentowy, list do Mikołaja i magia oczekiwania na święta.',
}: SocialShareProps) {
  const [instagramHint, setInstagramHint] = useState(false);
  const shareUrl = url ?? window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const shareText = `${title}\n${description}\n${shareUrl}`;

  const openShare = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const shareInstagram = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setInstagramHint(true);
      window.setTimeout(() => setInstagramHint(false), 4000);
    } catch {
      setInstagramHint(false);
    }
    openShare('https://www.instagram.com/');
  };

  return (
    <div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600 mr-2">Udostępnij:</span>
        <button
          type="button"
          onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
          className="bg-[#1877F2] text-white px-4 py-2 rounded-lg hover:bg-[#166FE5] transition-colors flex items-center gap-2"
          aria-label="Udostępnij na Facebook"
        >
          <i className="fab fa-facebook-f" aria-hidden="true" />
          <span className="hidden sm:inline">Facebook</span>
        </button>
        <button
          type="button"
          onClick={() => openShare(`https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`)}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2"
          aria-label="Udostępnij na X"
        >
          <i className="fab fa-x-twitter" aria-hidden="true" />
          <span className="hidden sm:inline">X</span>
        </button>
        <button
          type="button"
          onClick={() => void shareInstagram()}
          className="bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          aria-label="Udostępnij na Instagram"
        >
          <i className="fab fa-instagram" aria-hidden="true" />
          <span className="hidden sm:inline">Instagram</span>
        </button>
        <button
          type="button"
          onClick={() => openShare(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`)}
          className="bg-[#25D366] text-white px-4 py-2 rounded-lg hover:bg-[#20ba5a] transition-colors flex items-center gap-2"
          aria-label="Udostępnij na WhatsApp"
        >
          <i className="fab fa-whatsapp" aria-hidden="true" />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>
      </div>
      {instagramHint && (
        <p className="mt-2 text-center text-sm text-parchment-muted" role="status">
          Link skopiowany — wklej go w Instagramie.
        </p>
      )}
    </div>
  );
}
