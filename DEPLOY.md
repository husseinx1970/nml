# Lägg upp Utby Snabb Bilservice på GitHub

Den här guiden gör att hemsidan körs **helt gratis på GitHub** — utan server, utan databas, utan att du behöver installera något på din dator. All data sparas i webbläsaren.

> Du behöver bara: ett **GitHub-konto** (gratis, skapas på <https://github.com>).

---

## Steg 1 — Skapa ett nytt repo på GitHub

1. Gå till <https://github.com/new>.
2. **Repository name:** välj ett kort namn, t.ex. `utby-bilservice` (små bokstäver, inga mellanslag).
3. Sätt det till **Public** (krävs för gratis GitHub Pages).
4. **Lägg INTE till** README, .gitignore eller licens — vi laddar upp egna filer.
5. Klicka **Create repository**.

## Steg 2 — Ladda upp filerna

1. Packa upp zip-filen `utby-bilservice-source.zip` på din dator. Du får då en mapp `utby-bilservice`.
2. På den nya repo-sidan, klicka **"uploading an existing file"** (eller dra och släpp).
3. **Markera alla filer och mappar inuti `utby-bilservice/`** (inklusive den dolda `.github`-mappen — kontrollera att den följer med).
4. Dra dem till uppladdningsrutan på GitHub.
5. Längst ned: skriv "Första uppladdning" som commit-meddelande och klicka **Commit changes**.

> Om du inte ser `.github`-mappen i filhanteraren: i Windows Utforskare → fliken **Visa** → bocka i **Dolda objekt**. På Mac → tryck **Cmd+Shift+.** i Finder.

## Steg 3 — Aktivera GitHub Pages

1. På repo-sidan, klicka **Settings** (kugghjulet uppe till höger).
2. I vänstermenyn → **Pages**.
3. Under **Build and deployment → Source**, välj **GitHub Actions**.
4. Klart. Inga andra inställningar behövs.

## Steg 4 — Vänta på att sidan byggs

1. Klicka på **Actions**-fliken längst upp.
2. Du ser ett bygge som heter "Deploy to GitHub Pages" — det tar 1–3 minuter.
3. När det är grönt: gå till **Settings → Pages** igen. Där står adressen till din sida, ungefär:

   `https://<ditt-användarnamn>.github.io/utby-bilservice/`

4. Öppna länken. Logga in med koden **`19701970hasan`**.

---

## Så ändrar du åtkomstkoden

Öppna filen `artifacts/workshop/src/lib/localApi.ts` på GitHub, klicka på pennan (Edit), och ändra raden:

```ts
const DEFAULT_ACCESS_CODE = "19701970hasan";
```

till din egen kod. Spara → sidan byggs om automatiskt på ca 2 minuter.

## Så fungerar datalagringen

- **All data (kunder, fordon, fakturor) sparas i webbläsaren** på den dator du använder.
- Data följer **inte** med mellan datorer eller webbläsare. Använder du Chrome hemma och Edge på jobbet ser du olika data.
- Om du rensar webbhistoriken / "site data" för sidan försvinner allt. **Backup**: öppna utvecklarkonsolen (F12) → fliken **Application** → **Local Storage** → kopiera värdet `utby.db.v1` och spara i en textfil. För att återställa: klistra tillbaka samma värde.

---

## Vill du istället köra lokalt på datorn (med fil-lagring)?

Det funkar också — då behöver du Node.js installerat:

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
```

Öppna sedan <http://localhost:8080>. Då lagras data i en lokal SQLite-fil på `artifacts/api-server/data/app.db`.
