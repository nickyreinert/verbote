
Aufgabe: Analysiere das bereitgestellte Dokument vollständig. 

Ziel: Erfasse alle Verbotsaussagen und kategorisiere sie strikt in zwei Klassen: 
1) „Explizites Verbot“ 
2) „Semantisches Verbot“ 

Definitionen (bindend): 

Explizites Verbot: Eine Aussage gilt als explizites Verbot, wenn sie eindeutig ein Verbot durch ein Verbotswort oder eine juristisch klare Negationsform ausdrückt, z. B.: - „verboten“ - „wir verbieten“ - „ist zu verbieten“ - „untersagt“ - „dürfen nicht“ - „wird verboten“ - „gehört verboten“ 
Semantisches Verbot: Eine Aussage gilt als semantisches Verbot, wenn sie inhaltlich dasselbe bewirkt wie ein Verbot, ohne ein explizites Verbotswort zu verwenden, z. B.: - „keine neuen …“ - „nicht zulässig“ - „wird verhindert“ - „soll unterbleiben“ - „wir lehnen … ab“ - „wir wollen … stoppen“ - „es darf nicht weiter …“ - „ist auszuschließen“ 

Vorgehen:
- Lies das Dokument vollständig. 
- Extrahiere jede einzelne Verbotsaussage. 
- Ordne jede Aussage exakt einer der beiden Kategorien zu. 
- Keine Zusammenfassungen, keine Bewertungen, keine Interpretation über den Text hinaus. 
- Mehrdeutige Fälle immer als „Semantisches Verbot“ klassifizieren. 

Ausgabeformat (verpflichtend, exakt einhalten): 
{ "sourceFile": "<Dateiname>", "topics": [ { "category": "explizites Verbot | semantisches Verbot", "topic": "<kurze, sachliche Beschreibung des Verbots>", "location": "<Seite, Kapitel oder Seitenbereich>", "originalQuote": "<ersten 100 Zeichen des wörtlichen Zitates aus dem Dokument>" } ] } 

Regeln: 
- Kategorienamen exakt wie angegeben verwenden. 
- originalQuote muss exakt aus dem Dokument stammen, nur die ersten 100 Zeichen. 
- Keine zusätzlichen Felder. 
- Keine erläuternden Texte außerhalb des JSON.
- Erzeuge ein Artefakt