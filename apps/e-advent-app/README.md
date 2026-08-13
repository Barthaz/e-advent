# e-advent

Aplikacja React Native z Expo i TypeScript, przygotowana do kompilacji na Android i iOS.

## Wymagania

- Node.js (wersja 18 lub nowsza)
- npm lub yarn
- Expo CLI (zainstalowane globalnie lub używane przez npx)

## Instalacja

```bash
npm install
```

lub

```bash
yarn install
```

## Uruchomienie

### Rozwój (Development)

```bash
npm start
```

lub

```bash
yarn start
```

### Android

```bash
npm run android
```

lub

```bash
yarn android
```

### iOS

```bash
npm run ios
```

lub

```bash
yarn ios
```

## Kompilacja

### Android

```bash
eas build --platform android
```

### iOS

```bash
eas build --platform ios
```

## Struktura projektu

- `App.tsx` - Główny komponent aplikacji z ekranem powitalnym
- `app.json` - Konfiguracja Expo
- `tsconfig.json` - Konfiguracja TypeScript
- `babel.config.js` - Konfiguracja Babel

## Technologie

- React Native
- Expo
- TypeScript

