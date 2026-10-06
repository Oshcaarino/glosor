# Glosor

Plugga glosor direkt i webbläsaren: klistra in alla glosor i en ruta eller ladda upp en Excelfil (.xlsx eller .csv), dra en linje mellan språken och öva med kort eller genom att stava. Glosorna sparas i webbläsaren, och Excelfilen läses där också (egen läsare i `script.js`, inga bibliotek), så ingenting skickas till någon server. Bilder läses med [Tesseract.js](https://github.com/naptha/tesseract.js), som sidan hämtar från jsDelivr först när någon laddar upp en bild (versionen är fastlåst i `script.js`, konstanten `TESS`). Själva bilden skickas inte, men det krävs internet första gången.

Den här filen är till dig som äger repot. Användarguiden finns på sidan under knappen **Hjälp** (`hjalp.html`) och som [README-anvandare.md](README-anvandare.md).

## Publicera på GitHub Pages

1. Skapa ett nytt publikt repository på GitHub, till exempel `glosor`.
2. Ladda upp `index.html`, `hjalp.html`, `style.css`, `script.js`, `README.md` och `README-anvandare.md` till repots rot.
3. Gå till **Settings → Pages**.
4. Välj **Deploy from a branch**, branch `main` och mappen `/ (root)`, och spara.
5. Efter en minut ligger sidan på `https://oshcaarino.github.io/glosor/`.

## Ta bort filer i repot

**En fil, på github.com:**

1. Öppna repot och klicka på filen du vill ta bort.
2. Klicka på menyn med tre prickar uppe till höger och välj **Delete file**.
3. Skriv ett kort meddelande om vad du tog bort (eller behåll förslaget) och klicka **Commit changes**.

**En hel mapp:** öppna mappen, klicka på menyn med tre prickar uppe till höger och välj **Delete directory**. Kontrollera listan över filer som tas bort och klicka **Commit changes**.

**Flera filer:** ta bort dem en i taget på webben, eller använd Git på din dator:

```
git rm filnamn.html
git rm -r mappnamn
git commit -m "Ta bort gamla filer"
git push
```

Bra att veta:

- Sidan uppdateras efter någon minut. Tryck Ctrl+F5 (Cmd+Skift+R på Mac) om du fortfarande ser den gamla versionen.
- Ta inte bort `index.html`, `hjalp.html`, `style.css` eller `script.js`, då slutar sidan fungera. Tar du bort filen `CNAME` slutar din egen domän att fungera.
- En borttagen fil finns kvar i repots historik. Har filen innehållit något hemligt, till exempel ett lösenord, räcker det inte att ta bort den. Se GitHubs guide *Removing sensitive data from a repository*.

## Egen adress: glosor.nu

För att sidan ska öppnas när någon skriver `glosor.nu` måste du äga domänen. Kolla om den är ledig och registrera den hos en domänregistrator, till exempel Loopia, Binero eller One.com (det kostar en årsavgift). Stegen är desamma för andra domäner, byt bara ut `glosor.nu`.

1. **Lägg först till domänen på GitHub.** Gå till repot, **Settings → Pages**, skriv `glosor.nu` under **Custom domain** och klicka **Save**. GitHub lägger då till en fil som heter `CNAME` i repot. Ta inte bort den. GitHub rekommenderar också att du verifierar domänen, se *Verifying your custom domain for GitHub Pages* i GitHubs dokumentation.
2. **Ställ in DNS hos registratorn.** Ta bort eventuella standardposter som registratorn lagt in (till exempel en parkeringssida) och lägg till följande. Namnet `@` betyder själva domänen.

   | Typ | Namn | Värde |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153` och `185.199.111.153` (en post per adress) |
   | AAAA | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` och `2606:50c0:8003::153` (en post per adress) |
   | CNAME | `www` | `oshcaarino.github.io` (utan repots namn) |

   Använd inte jokertecken-poster som `*.glosor.nu`, de gör domänen sårbar för övertagande.
3. **Vänta.** DNS-ändringar kan ta upp till 24 timmar.
4. **Slå på HTTPS.** Under **Settings → Pages**, markera **Enforce HTTPS** när alternativet går att välja (det kan ta upp till 24 timmar).

Därefter öppnas sidan på `https://glosor.nu`, och `www.glosor.nu` skickas vidare dit. IP-adresserna ovan kommer från GitHubs dokumentation. Fungerar något inte, kontrollera dem där: *Managing a custom domain for your GitHub Pages site*.

### Adress med sökväg, som glosor.com/se

Vill du i stället ha en adress som `glosor.com/se` ska domänen läggas på ett repo som heter exakt `oshcaarino.github.io` (med en startsida i), och repot med glosorna döps om till `se` utan någon egen domän. Alla repon med Pages påslaget hamnar då under domänen, med repots namn som sökväg.
