# Rozwiązywanie problemów z wdrożeniem

## Problem: Błędy MIME type i 404 dla plików CSS/JS

### Objawy:
- `Refused to apply style because its MIME type ('text/html') is not a supported stylesheet MIME type`
- `GET https://e-advent.pl/assets/index-XXXXX.js net::ERR_ABORTED 404 (Not Found)`

### Przyczyny:

1. **Pliki nie są w odpowiednim miejscu na serwerze**
2. **.htaccess przekierowuje pliki statyczne do index.html**
3. **Struktura folderów jest inna niż oczekiwana**

## ✅ Rozwiązanie krok po kroku:

### Krok 1: Sprawdź strukturę plików na serwerze

Upewnij się, że struktura wygląda tak:
```
public_html/ (lub odpowiedni folder główny)
├── .htaccess          ← MUSI być tutaj!
├── index.html         ← MUSI być tutaj!
├── favicon.png        ← MUSI być tutaj!
└── assets/           ← Folder assets
    ├── index-XXXXX.css
    ├── index-XXXXX.js
    ├── logo-XXXXX.png
    └── ... (pozostałe pliki)
```

**WAŻNE:** Wszystkie pliki z folderu `dist/` powinny być w tym samym katalogu co `index.html`!

### Krok 2: Sprawdź czy pliki istnieją

Otwórz w przeglądarce (zamień `XXXXX` na właściwe hashe):
- `https://e-advent.pl/assets/index-XXXXX.css` → Powinien pokazać kod CSS
- `https://e-advent.pl/assets/index-XXXXX.js` → Powinien pokazać kod JavaScript

**Jeśli widzisz 404 lub HTML:**
- Pliki nie zostały wgrane na serwer
- Albo są w złym folderze

### Krok 3: Sprawdź czy .htaccess działa

1. Sprawdź czy plik `.htaccess` jest w głównym katalogu (tam gdzie `index.html`)
2. Sprawdź czy serwer obsługuje `.htaccess` (może być wyłączone w niektórych konfiguracjach)
3. Sprawdź logi błędów serwera (error.log)

### Krok 4: Alternatywne rozwiązanie - prostszy .htaccess

Jeśli nadal masz problemy, spróbuj tej prostszej wersji:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Jeśli plik istnieje - użyj go (NIE przekierowuj)
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^ - [L]
  
  # Jeśli folder istnieje - użyj go (NIE przekierowuj)
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # Wszystko inne przekieruj do index.html
  RewriteRule ^ index.html [L]
</IfModule>

# Właściwe typy MIME
<IfModule mod_mime.c>
  AddType text/css .css
  AddType application/javascript .js
</IfModule>
```

### Krok 5: Sprawdź konfigurację serwera

Jeśli używasz cPanel lub innego panelu:
1. Upewnij się, że mod_rewrite jest włączony
2. Sprawdź czy nie ma konfliktów z innymi regułami .htaccess
3. Sprawdź czy folder `/assets/` nie ma własnego `.htaccess` który może kolidować

### Krok 6: Testowanie

1. Wyczyść cache przeglądarki (Ctrl+Shift+R)
2. Sprawdź w DevTools (F12) → Network:
   - Czy pliki CSS/JS są ładowane?
   - Jaki jest status code (powinien być 200)?
   - Jaki jest Content-Type (powinien być text/css dla CSS, application/javascript dla JS)?

## 🔍 Diagnostyka zaawansowana

### Sprawdź nagłówki HTTP:

W konsoli przeglądarki (F12 → Console) wykonaj:
```javascript
fetch('https://e-advent.pl/assets/index-XXXXX.css')
  .then(r => console.log('Status:', r.status, 'Content-Type:', r.headers.get('content-type')))
```

Powinno pokazać:
- Status: 200
- Content-Type: text/css

Jeśli pokazuje `text/html` - plik jest przekierowywany do index.html.

### Sprawdź czy pliki są dostępne bezpośrednio:

Otwórz w przeglądarce:
```
https://e-advent.pl/assets/index-XXXXX.css
https://e-advent.pl/assets/index-XXXXX.js
```

**Jeśli widzisz kod CSS/JS:** Pliki są OK, problem jest tylko z routingiem.

**Jeśli widzisz HTML:** Pliki są przekierowywane - problem z .htaccess.

**Jeśli widzisz 404:** Pliki nie istnieją na serwerze.

## ⚠️ Częste błędy:

1. **Wgranie tylko części plików** - upewnij się, że wgrasz CAŁĄ zawartość folderu `dist/`
2. **.htaccess w złym miejscu** - musi być w głównym katalogu (tam gdzie index.html)
3. **Konflikt z innymi .htaccess** - sprawdź czy nie ma innych plików .htaccess w podfolderach
4. **Cache przeglądarki** - wyczyść cache (Ctrl+Shift+Delete)

## 📞 Jeśli nadal nie działa:

Podaj:
1. Strukturę folderów na serwerze (gdzie jest index.html, gdzie assets/)
2. Status code dla CSS/JS z DevTools (Network tab)
3. Treść pliku .htaccess na serwerze
4. Informację o typie hostingu (cPanel, VPS, itp.)

