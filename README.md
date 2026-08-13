# Aurum Motors — Gestionale Concessionario FiveM

Gestionale web per il team di Aurum Motors: autenticazione, ruoli, stato di servizio, vendite, catalogo veicoli, documenti e registro attività.

## Funzionalità

- Ruoli: Proprietario, Direttore, Vice Direttore, Dipendente e In prova.
- Stato di servizio con aggiornamenti in tempo reale e notifiche Discord opzionali.
- Inserimento, modifica e consultazione delle vendite del concessionario.
- Ricerca dei veicoli dal catalogo e calcolo di sconti e commissioni.
- Gestione documenti, profili, attività e fatturato del personale.

## Configurazione

1. Crea un progetto Supabase e configura l'autenticazione email.
2. Crea un file `.env` con:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
# Opzionale: notifiche sullo stato di servizio
VITE_DISCORD_WEBHOOK_URL=<discord-webhook-url>
```

3. Per un database nuovo esegui `supabase-setup.sql` nel SQL Editor di Supabase. Per un database già in uso esegui anche la migrazione più recente in `supabase/migrations`.
4. Installa e avvia l'applicazione:

```bash
npm install
npm run dev
```

## Tabelle principali

- `users`: profili, ruoli e stato di servizio.
- `sales`: vendite registrate dal concessionario.
- `vehicles`: catalogo veicoli.
- `activity_logs`: registro delle attività.

## Verifica e distribuzione

```bash
npm run lint
npm run build
```

Prima di distribuire, rimuovi manualmente da Supabase eventuali account storici che non devono più avere accesso.

<!-- deploy trigger: presence statuses -->
