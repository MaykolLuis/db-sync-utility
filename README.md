# DB Sync Utility

Aplikace pro synchronizaci databázových souborů mezi různými umístěními.

## Přihlašovací údaje

### Výchozí přihlašovací údaje
- **Uživatelské jméno:** Technické oddělení
- **Heslo:** admin

### Změna hesla
Po prvním přihlášení doporučujeme změnit výchozí heslo:
1. Přihlaste se pomocí výchozího hesla "admin"
2. Přejděte na záložku "Nastavení"
3. V sekci "Změna hesla" zadejte nové heslo a potvrďte jej
4. Klikněte na tlačítko "Změnit heslo"

Nové heslo bude uloženo a použito při příštím přihlášení.

## Hlavní funkce

### Synchronizace databázových souborů
- Výběr zdrojového adresáře s databázovými soubory
- Správa cílových umístění pro synchronizaci
- Kontrola zamčení souborů před kopírováním
- Automatické vytváření záloh před přepsáním souborů
- Sledování změn ve zdrojových souborech

### Historie operací
- Automatické verzování kopírovaných souborů (v1, v2, atd.)
- Detailní historie všech operací kopírování
- Možnost exportu historie do CSV souboru
- Filtrování a vyhledávání v historii

### Bezpečnostní funkce
- Kontrola existence a dostupnosti databázových souborů
- Ověřování přístupových práv k adresářům
- Detekce zamčených souborů
- Automatické zálohování před přepsáním

## Technické informace

### Uložení dat
- Heslo je uloženo v souboru JSON v datovém adresáři aplikace
- Historie operací je uložena v JSON souboru
- Nastavení aplikace jsou uložena v samostatném souboru

### Systémové požadavky
- Windows 10/11
- 4 GB RAM
- 100 MB volného místa na disku

## Řešení problémů

### Zapomenuté heslo
Pokud zapomenete heslo, můžete jej resetovat odstraněním souboru `password.json` z datového adresáře aplikace:
```
%APPDATA%\db-sync-utility\data\password.json
```
Po odstranění souboru bude při příštím spuštění aplikace použito výchozí heslo "admin".

### Problémy s kopírováním souborů
- Ujistěte se, že máte dostatečná oprávnění pro čtení zdrojových souborů a zápis do cílových adresářů
- Zkontrolujte, zda nejsou soubory zamčeny jiným procesem
- Zkontrolujte, zda existují všechny potřebné databázové soubory (configurations.mv.db a configurations.trace.db)

## Kontakt

Pro technickou podporu kontaktujte TO oddělení.
