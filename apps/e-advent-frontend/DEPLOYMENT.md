# Instrukcje wdrożenia e-Advent

## Problem: Strona działa na telefonie, ale nie na laptopie

To **NAJCZĘSTSZY** problem z aplikacjami React Router (SPA). Wymagają one specjalnej konfiguracji serwera.

---

## 🔧 Rozwiązanie: Konfiguracja serwera dla SPA

### Opcja 1: Apache (hosting współdzielony, cPanel)

1. **Skopiuj plik `.htaccess`** (już utworzony) do głównego katalogu z plikami `dist/`
2. Upewnij się, że mod_rewrite jest włączony na serwerze
3. Jeśli używasz subdomeny, upewnij się, że `.htaccess` jest w odpowiednim folderze

**WAŻNE:** Plik `.htaccess` musi być w tym samym folderze co `index.html`

### Opcja 2: Nginx

1. **Skopiuj konfigurację** z `nginx.conf` do swojej konfiguracji Nginx
2. Zmień:
   - `server_name` na swoją domenę
   - `root` na ścieżkę do folderu `dist`
3. Przeładuj Nginx: `sudo nginx -s reload`

### Opcja 3: Vercel / Netlify

Pliki `vercel.json` lub `netlify.toml` są już przygotowane. Po prostu wgraj pliki na platformę.

---

## 📋 Kroki wdrożenia

### 1. Zbuduj aplikację lokalnie:
```bash
npm run build
```

### 2. Wgraj zawartość folderu `dist/` na serwer:
- Cały folder `dist/` → główny katalog strony (lub odpowiedni folder)
- **Razem z plikiem `.htaccess`** (jeśli używasz Apache)

### 3. Struktura na serwerze powinna wyglądać tak:
```
public_html/ (lub odpowiedni folder)
├── .htaccess
├── index.html
├── favicon.png
└── assets/
    ├── index-*.js
    ├── index-*.css
    └── ... (pozostałe pliki)
```

---

## 🔍 Diagnostyka problemu

### Sprawdź w konsoli przeglądarki (F12):
1. **Błędy 404** - oznacza, że serwer nie przekierowuje ścieżek do `index.html`
2. **Błędy CORS** - problem z konfiguracją serwera
3. **Błędy ładowania plików** - sprawdź ścieżki do `assets/`

### Sprawdź w Network (F12 → Network):
- Czy wszystkie pliki są ładowane (status 200)?
- Czy są jakieś błędy 404 dla ścieżek jak `/stworz-kalendarz`?

### Test na laptopie:
1. Otwórz DevTools (F12)
2. Przejdź do zakładki **Network**
3. Spróbuj otworzyć stronę
4. Sprawdź, które żądania kończą się błędem

---

## 🚨 Najczęstsze błędy i rozwiązania

### Błąd: "Cannot GET /stworz-kalendarz"
**Przyczyna:** Serwer nie przekierowuje ścieżek do `index.html`  
**Rozwiązanie:** Dodaj `.htaccess` (Apache) lub skonfiguruj Nginx zgodnie z `nginx.conf`

### Błąd: "Failed to load resource" (pliki CSS/JS)
**Przyczyna:** Nieprawidłowe ścieżki do plików  
**Rozwiązanie:** Upewnij się, że `index.html` jest w głównym katalogu, a nie w podfolderze

### Działa na telefonie, nie na laptopie
**Możliwe przyczyny:**
1. **Cache przeglądarki** - wyczyść cache (Ctrl+Shift+Delete)
2. **User-Agent blocking** - sprawdź konfigurację serwera
3. **CORS** - dodaj odpowiednie nagłówki
4. **Firewall** - sprawdź, czy serwer nie blokuje laptopa

---

## ✅ Sprawdzenie po wdrożeniu

1. Otwórz stronę główną: `https://twoja-domena.pl/`
2. Sprawdź routing:
   - `https://twoja-domena.pl/stworz-kalendarz`
   - `https://twoja-domena.pl/platnosc`
   - `https://twoja-domena.pl/polityka-prywatnosci`
3. Wszystkie powinny działać bez błędów 404

---

## 📞 Potrzebujesz pomocy?

Jeśli nadal nie działa:
1. Sprawdź logi serwera (error.log, access.log)
2. Podaj:
   - Typ serwera (Apache/Nginx/Inny)
   - Błąd z konsoli przeglądarki
   - Status kod odpowiedzi HTTP dla problematycznej ścieżki

---

**Data aktualizacji:** 2025-01-29
