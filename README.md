# Northbound TCG

Northbound TCG ist eine kleine, unabhängige Spielgruppe für das Trading Card Game Riftbound.

Wir spielen aus Spaß, testen gemeinsam Decks, tauschen uns über Strategien aus und besuchen gelegentlich lokale Events.

## Über das Projekt

Diese Website dient als öffentliche Teamseite von Northbound TCG.

Sie informiert über:

- unser Team
- unsere Spielgruppe
- unsere Aktivitäten
- Kontaktmöglichkeiten

Northbound TCG ist kein eingetragener Verein und verfolgt keine kommerziellen Interessen.

## Technologien

Die Website wurde mit folgenden Technologien erstellt:

- HTML
- CSS
- JavaScript
- Vite
- npm
- Git
- GitHub Pages

## Gemeinsamer Kalender (Node/MySQL)

Der Kalender verwendet jetzt `server.js`, Node und MySQL. Kopiere `.env.example` nach `.env`, trage dort die Zugangsdaten deiner Dev-Datenbank ein und erstelle den Admin-Hash mit `npm run hash-password -- DEIN_PASSWORT`.

Danach startest du lokal nur:

```bash
npm run dev
```

und öffnest `http://127.0.0.1:3000/admin.html`. Für Plesk muss die Node.js-Erweiterung aktiv sein; PHP/Laragon wird dafür nicht benötigt.

## Alte PHP-Anleitung (nicht verwenden)

Der Kalender nutzt auf Plesk die PHP-Endpunkte im Ordner `api/` und die MySQL-Tabelle aus `database/schema.sql`. Zugangsdaten gehören niemals in JavaScript oder ins Git-Repository.

1. `database/schema.sql` in Plesk/phpMyAdmin für die Datenbank `Northbound` importieren.
2. Auf dem Server `api/config.example.php` als `api/config.php` kopieren und dort das Datenbankpasswort eintragen.
3. Ein eigenes Admin-Passwort als Hash eintragen (Befehl steht als Kommentar in der Datei).
4. Website einschließlich des Ordners `api/` auf eine PHP-fähige Plesk-Domain hochladen und HTTPS aktivieren.

Lokal kann Vite allein keine PHP-Endpunkte ausführen. Für den gemeinsamen Kalender muss ein PHP-fähiger Webserver verwendet werden.

## Projekt lokal starten

Voraussetzungen:

- Node.js
- npm
- Git

Repository klonen:

```bash
git clone https://github.com/TheSandHawk/NBTCG.git
