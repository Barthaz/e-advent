'use strict';

/**
 * Deterministic script template (MVP). Parent text is quoted verbatim as the content
 * of the family's letter, so nothing is invented, no gift is promised and form input
 * cannot steer the text. A generator model can replace this behind the same contract.
 */
const SCRIPT_TEMPLATE_VERSION = 'template-1';
const WORDS_PER_SECOND = 2.2;
const DEFAULT_MAX_SECONDS = 120;

const FORMS = {
  male: {
    brave: 'To pokazuje, jaki jesteś dzielny.',
    independent: 'Z listu wynika, że z roku na rok stajesz się coraz bardziej samodzielny.',
  },
  female: {
    brave: 'To pokazuje, jaka jesteś dzielna.',
    independent: 'Z listu wynika, że z roku na rok stajesz się coraz bardziej samodzielna.',
  },
  neutral: {
    brave: 'To pokazuje, ile masz w sobie odwagi.',
    independent: 'Z listu wynika, że z roku na rok radzisz sobie z coraz większą liczbą spraw.',
  },
};

function quote(text) {
  const trimmed = String(text).trim().replace(/[„”"]/g, '');
  return `„${trimmed.replace(/[.!?…]+$/u, '')}”`;
}

function countWords(text) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** `compact` drops decorative sentences so long parent answers still fit the time limit. */
function compose(p, compact) {
  const forms = FORMS[p.addressForm] || FORMS.neutral;
  const voc = p.childVocative;
  const used = ['childVocative', 'addressForm', 'achievement', 'proudOf'];
  const paragraphs = [];

  const intro = [`Ho, ho, ho! Witaj, ${voc}! Tu Święty Mikołaj.`, 'Nagrywam tę wiadomość specjalnie dla Ciebie, prosto z mojej pracowni w Laponii.'];
  if (!compact) intro.push('Za oknem pada puszysty śnieg, renifery odpoczywają po porannym treningu, a elfy pakują paczki i nucą świąteczne piosenki.');
  if (p.ageBand === '2-3') {
    intro.push('Rudolf macha do Ciebie kopytkiem!');
    used.push('ageBand');
  }
  paragraphs.push(intro.join(' '));

  const bridge = ['Twoi bliscy napisali do mnie list i opowiedzieli mi o Tobie wiele dobrego.'];
  if (!compact) bridge.push('Przeczytałem go przy kominku, z kubkiem gorącego kakao.');
  if (p.ageBand === '10+') {
    bridge.push(forms.independent);
    used.push('ageBand');
  }
  paragraphs.push(bridge.join(' '));

  paragraphs.push(compact
    ? `Najpierw przeczytałem: ${quote(p.achievement)}. Wspaniale! ${forms.brave}`
    : `Najpierw przeczytałem: ${quote(p.achievement)}. Wspaniale! Wiem, że takie rzeczy wymagają cierpliwości i wysiłku. ${forms.brave}`);
  paragraphs.push(compact
    ? `A potem: ${quote(p.proudOf)}. Jestem z Ciebie naprawdę dumny!`
    : `A potem znalazłem w liście takie słowa: ${quote(p.proudOf)}. Kiedy to przeczytałem, zrobiło mi się ciepło na sercu. Jestem z Ciebie naprawdę dumny!`);

  if (p.workingOn) {
    used.push('workingOn');
    paragraphs.push(compact
      ? `Wiem też, nad czym teraz pracujesz: ${quote(p.workingOn)}. Liczy się to, że próbujesz — trzymam za Ciebie kciuki.`
      : `Wiem też, nad czym teraz pracujesz: ${quote(p.workingOn)}. Każdy czasem się czegoś uczy — nawet ja, choć mam już bardzo długą brodę! Liczy się to, że próbujesz, a ja trzymam za Ciebie kciuki.`);
  }
  if (p.siblingsNote) {
    used.push('siblingsNote');
    paragraphs.push(compact
      ? `Bliscy wspomnieli mi też: ${quote(p.siblingsNote)}.`
      : `Bliscy wspomnieli mi też: ${quote(p.siblingsNote)}. To piękne, że w Waszym domu jest tyle ciepła.`);
  }
  if (p.wishes) {
    used.push('wishes');
    paragraphs.push(compact
      ? `W liście były też Twoje świąteczne marzenia: ${quote(p.wishes)}. Nigdy nie przestawaj marzyć.`
      : `W liście były też Twoje świąteczne marzenia: ${quote(p.wishes)}. Marzenia są bardzo ważne — dbaj o nie i nigdy nie przestawaj marzyć.`);
  }

  paragraphs.push(compact
    ? `${voc}, pamiętaj, że jesteś kimś wyjątkowym. Wesołych, ciepłych Świąt! Ho, ho, ho! Twój Święty Mikołaj.`
    : `${voc}, pamiętaj, że jesteś kimś wyjątkowym. Życzę Ci cudownych, spokojnych świąt, pełnych uśmiechu, pierników i rodzinnego ciepła. Muszę już wracać do pracy, bo renifery niecierpliwie przebierają kopytami. Ho, ho, ho! Wesołych Świąt! Twój Święty Mikołaj.`);

  const spokenText = paragraphs.join('\n\n');
  const wordCount = countWords(spokenText);
  return {
    spokenText,
    usedFields: [...new Set(used)],
    wordCount,
    estimatedSeconds: Math.round(wordCount / WORDS_PER_SECOND),
    version: compact ? `${SCRIPT_TEMPLATE_VERSION}-compact` : SCRIPT_TEMPLATE_VERSION,
  };
}

/**
 * @param {object} p validated personalization
 * @param {{ maxSeconds?: number }} [options]
 * @returns {{ spokenText: string, usedFields: string[], wordCount: number, estimatedSeconds: number, version: string }}
 */
function buildSantaScript(p, { maxSeconds = DEFAULT_MAX_SECONDS } = {}) {
  const full = compose(p, false);
  return full.estimatedSeconds <= maxSeconds ? full : compose(p, true);
}

module.exports = { buildSantaScript, countWords, WORDS_PER_SECOND, SCRIPT_TEMPLATE_VERSION };
