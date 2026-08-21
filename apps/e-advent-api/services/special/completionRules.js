'use strict';

function canCompleteEngine({ engine, completionRule, payload }) {
  if (payload.manualComplete === true) {
    return { canComplete: true };
  }

  switch (engine) {
    case 'QUIZ':
      return payload.finished === true
        ? { canComplete: true }
        : { canComplete: false, reason: 'Ukończ quiz' };

    case 'CHECKLIST': {
      if (Array.isArray(payload.houses)) {
        const scored = payload.houses.filter((house) => house && Number(house.points) > 0).length;
        if (scored >= (completionRule?.minItems ?? 1)) {
          return { canComplete: true };
        }
        return { canComplete: false, reason: 'Przyznaj punkty przynajmniej jednemu domowi' };
      }
      const checked = payload.checked || {};
      const count = Object.values(checked).filter(Boolean).length;
      if (completionRule?.type === 'BINGO_LINE_OR_MANUAL' && payload.bingoLine === true) {
        return { canComplete: true };
      }
      if (count >= (completionRule?.minItems ?? 1)) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Zaznacz wymagane pozycje' };
    }

    case 'CARD_FORM': {
      const fields = payload.fields || {};
      const required = completionRule?.requiredFields ?? [];
      const missing = required.filter((f) => !String(fields[f] ?? '').trim());
      if (missing.length === 0 && Object.keys(fields).length > 0) {
        return { canComplete: true };
      }
      if (required.length === 0 && Object.keys(fields).length > 0) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Wypełnij wymagane pola' };
    }

    case 'PLANNER':
    case 'MONTH_PLANNER': {
      const rows = payload.rows || [];
      if (rows.length >= (completionRule?.minItems ?? 1)) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Dodaj co najmniej jedną pozycję' };
    }

    case 'SCORECARD': {
      const scores = payload.scores || {};
      if (Object.keys(scores).length >= (completionRule?.minItems ?? 1)) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Oceń wymagane pozycje' };
    }

    case 'SORTABLE_LIST': {
      const items = payload.items || [];
      if (items.length >= (completionRule?.minItems ?? 3)) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Ustaw wymaganą liczbę pozycji' };
    }

    case 'OPTION_CONFIGURATOR': {
      const selections =
        payload.selections && typeof payload.selections === 'object' && !Array.isArray(payload.selections)
          ? payload.selections
          : {};
      const required = completionRule?.requiredFields ?? [];
      if (required.length) {
        const missing = required.filter((key) => !String(selections[key] ?? '').trim());
        if (missing.length) {
          return { canComplete: false, reason: 'Wybierz opcje we wszystkich sekcjach' };
        }
        return { canComplete: true };
      }
      if (Object.keys(selections).length > 0 || payload.started === true) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Wybierz przynajmniej jedną opcję' };
    }

    case 'TEMPLATE_PERSONALIZER': {
      const fields =
        payload.fields && typeof payload.fields === 'object' && !Array.isArray(payload.fields)
          ? payload.fields
          : {};
      const filled = Object.values(fields).filter((v) => String(v ?? '').trim()).length;
      if (filled >= (completionRule?.minItems ?? 1) || payload.started === true) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Uzupełnij pola personalizacji' };
    }

    case 'TURN_BASED_GAME': {
      if (payload.roundFinished === true || payload.finished === true || payload.started === true) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Rozpocznij rundę' };
    }

    case 'DOCUMENT':
    case 'RANDOMIZER_TIMER':
    case 'RECIPE':
      return payload.started === true
        ? { canComplete: true }
        : { canComplete: false, reason: 'Rozpocznij interakcję' };

    case 'IMAGE_CARD': {
      const photos = payload.photos && typeof payload.photos === 'object' ? payload.photos : {};
      const filled = Object.values(photos).filter((item) => {
        if (!item) return false;
        if (typeof item === 'string') return item.trim() !== '';
        if (typeof item !== 'object') return false;
        return !!(item.url || item.dataUrl);
      }).length;
      if (filled >= 2 || payload.imageDataUrl) {
        return { canComplete: true };
      }
      if (payload.started === true && filled >= 1) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Dodaj zdjęcia' };
    }

    default:
      return payload.started === true
        ? { canComplete: true }
        : { canComplete: false, reason: 'Rozpocznij interakcję' };
  }
}

module.exports = { canCompleteEngine };
