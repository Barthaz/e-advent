interface SocialShareProps {
  url?: string;
  title?: string;
  description?: string;
}

export default function SocialShare({ 
  url = window.location.href, 
  title = 'e-Advent — Niezapomniane chwile świąt',
  description = 'Przeżywaj grudzień w cieple — personalizowany kalendarz adwentowy, list do Mikołaja i magia oczekiwania na święta.'
}: SocialShareProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    const shareUrl = shareLinks[platform];
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <span className="text-sm text-gray-600 mr-2">Udostępnij:</span>
      <button
        onClick={() => handleShare('facebook')}
        className="bg-[#1877F2] text-white px-4 py-2 rounded-lg hover:bg-[#166FE5] transition-colors flex items-center gap-2"
        aria-label="Udostępnij na Facebook"
      >
        <i className="fab fa-facebook-f"></i>
        <span className="hidden sm:inline">Facebook</span>
      </button>
      <button
        onClick={() => handleShare('twitter')}
        className="bg-[#1DA1F2] text-white px-4 py-2 rounded-lg hover:bg-[#1a91da] transition-colors flex items-center gap-2"
        aria-label="Udostępnij na Twitter"
      >
        <i className="fab fa-twitter"></i>
        <span className="hidden sm:inline">Twitter</span>
      </button>
      <button
        onClick={() => handleShare('whatsapp')}
        className="bg-[#25D366] text-white px-4 py-2 rounded-lg hover:bg-[#20ba5a] transition-colors flex items-center gap-2"
        aria-label="Udostępnij na WhatsApp"
      >
        <i className="fab fa-whatsapp"></i>
        <span className="hidden sm:inline">WhatsApp</span>
      </button>
      <button
        onClick={() => handleShare('email')}
        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
        aria-label="Udostępnij przez email"
      >
        <i className="fas fa-envelope"></i>
        <span className="hidden sm:inline">Email</span>
      </button>
    </div>
  );
}

