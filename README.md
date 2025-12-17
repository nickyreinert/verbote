Die Wahlprogramme stammen von [PsychArchives.org](https://psycharchives.org/en/item/253905e9-e7c7-4a88-86ec-dee9191c894f)[1]. Dort befinden sich die Programme der Wahlperiode von 2003 bis 2021. *(Eine zusätzliche Quelle für noch ältere Wahlprogramme befindet sich unter [manifesto-project.wzb.eu](https://visuals.manifesto-project.wzb.eu/mpdb-shiny/cmp_dashboard_dataset/), nicht nur für Deutschland).*

Die folgenden Modelle habe ich für die Auswertung verwendet. Es handelt sich ausschließlich um "**kostenlose Zugänge**". Grundsätzlich habe ich immer den **einfachsten Modus** gewählt, da die Erkennnung von "Verboten" nicht sehr aufwändig sein sollte. Außerdem fand jede Analyse, wenn möglich, in einer neuen **anonymen Konversation** oder mindestens einer **neuen Sitzung** statt, um den Einfluss vorheriger Eingaben zu vermeiden. Die Wahlprogramme stehen als **DOCX**, **PDF** und **Textdatei** zur Verfügung - für die Auswertung sollte die Text-Datei ausreichen, zumal diese auch kleiner sind. 

## Verwendete Modelle

Nur mit drei Modellen konte ich den gesamten Zeitraum abdecken: Qwen, Grok und Gemini. Mit den anderen Modellen habe ich 2021 komplett untersuchen können, die anderen Jahre nur teilweise.

### Deepseek
*[click](https://chat.deepseek)*

Das Token-Limit des normalen Modus ist sehr streng, deswegen habe ich es mit "Deep Thinking" probiert. Selbst dann führte das Modell die Aufgabe nicht immer vollständig aus. Für die "Linke" musste ich das Wahlprogramm in zwei Teilen auswerten, da es zu lang war.

### OpenAI **ChatGPT-4**
*[click](https://chat.openai.com)*

ChatGPT funktioniert stabil, erlaubt aber nur 3 Uploads innerhalb von 24 Stunden. Mehr kann man dazu gar nicht sagen.

### Microsoft **Copilot** 
*[click](https://copilot.microsoft.com)*
Obowohl ich mit Copilot bisher relativ gute Erfahrung gemacht hab, enttäuscht Microsofts Chatbot hier auf ganzer Linie: Die **Auswertung wurde komplett abgelehnt**. Die Begründung ist zunächst eher **irritierend** und **widersprüchlich**:

> Das von dir bereitgestellte Dokument ist blockiert und ich habe keinen Zugriff auf seinen Inhalt. Daher kann ich die geforderte Analyse nicht direkt durchführen. 
**Wenn du möchtest, kannst du den relevanten Textabschnitt (oder das gesamte Dokument) hier im Chat einfügen**. Dann kann ich jede Verbotsaussage extrahieren, sie strikt in „Explizites Verbot“ oder „Semantisches Verbot“ einordnen und das Ergebnis im geforderten JSON-Format ausgeben.

Also was jetzt, Copilot - blockiert oder nicht blockiert? Erst auf Nachfrage erfahre ich, was "blockiert" genau heißt: 

> *Was soll das bedeuten? Warum kannst du das Text Dokument nicht verarbeiten?*
> Das von dir hochgeladene Dokument wurde durch ein Inhalts‑Filter blockiert. [...]
-
> *Aber wenn ich es direkt in den Chat kopiere, funktioniert es?*
> Ja, genau 👍 — wenn du den Text direkt hier in den Chat einfügst, kann ich ihn ohne Blockade verarbeiten.

Das ist natürlich völliger Unsinn. Auch wenn ich den gesamten Korpus in den Chat kopiere, erhalte ich die gleiche Meldung. Danke für nichts, Microsoft.

### Claude Sonnnet 4.5
*[click](https://claude.ai)*
Claude ist als Coding Agent ein wertvoller begleiter geworden, selbst mit dem eingeschränkten konstenlosen Kontingent. Bei dieser Auswertung tut Claude sich aber etwas schwer, da das zulässige Kontextwindow zu klein ist. Außerdem liefert ausgerechnet Claude mitunter fehlerhaftes JSON zurück (nicht escape'te oder kodierte Anführungszeichen). Das Wahlprogramm der Grünen war zu groß, weshalb ich es in zwei Durchläufen ausgewertet und manuell verbunden habe.

Die Wahlprogramme der "Linken" und "Grünen" musste ich jeweils in zwei Teilen auswerten, da sie zu lang waren.

### Gemini
*[click](https://gemini.google.com)*

**Gemini** gehört zu den wenigen Agenten, die ihre Arbeit nicht nur zuverlässig ausgeführt haben, sondern auch durch ein wirklich großzügiges Token-Limit verfügen. Das Angebot wird nur noch von **Grok** und **Qwen** übertroffen. Nur einmal reichte der "Fast-Modus" nicht aus, für das Parteiprogramm der SPD von 2021 musste ich den "Thinking-Modus mit 3 Pro" einsetzen. 

Gemimi hat übrigens konsquent die Vorgabe ignoriert, nur die ersten 100 Zeichen des Zitates zu liefern. 

### Grok 4.1
*[click](https://grok.com)*

Auch Musk's AI ist sehr großzügig, wenn es um das Verarbeiten vieler Daten geht. Die Ergebnisse sind zuverlässig, allerdings scheitert Grok daran, ein vernünftiges JSON-Artefakt zu liefern. Syntaktisch korrekt, aber nicht korrekt formatiert. Nur ein Hygiene-Problem, aber dennoch ärgerlich. Was mir bei Grok vor allem auffällt: Es ist irrsinnig schnell. Das kann auch Zufall oder subjektives Empfinden sein, ich habe das nicht weiter dokumentiert, aber oft hat das LLM die Auswertung sofort zurückgeliefert, während andere Modelle noch am "Denken" waren. 

### Qwen3-Max
*[click](https://chat.qwen.ai/)*

Bei **Qwen3-Max** gibt es gefühlt keine Grenze für Anfragen. Das ist sehr erstaunlich. Ich konnte ohne Pause alle Wahlprogramme für 5 Wahlperioden hintereinander verarbeiten. 

### Mistral
*[click](https://chat.mistral.ai)*
Auch Mistral verfügt über ein kostenloses Angebot, so ganz zufriedenstellend ist das Ergebnis aber inhaltlich auf den ersten Blick nicht. Die Ergebnisse für einige Parteien wirken unvollständig. 

## Methodik

### Verbote identifizieren
Jedes Modell soll die Wahlprogramme nach expliziten oder semantischen Verboten durchsuchen. Ein explizites Verbot zeichnet sich durch bestimmte Signalwörter aus, wie "verboten" oder "untersagt". Semantische Verbote egeben sich aus dem Kontext - hier dürfte es auf die Interpretationsfähigkeit des Modells ankommen. Das Ergebnis sieht jeweils so aus:

```json
    {
      "category": "semantisches Verbot",
      "topic": "Keine pauschalen Zuwanderungskontingente und Umverteilungsquoten",
      "location": "Kapitel 9 - Migration, Asyl und Integration",
      "originalQuote": "Keine pauschalen Zuwanderungskontingente und Umverteilungsquoten, egal ob im nationalstaatlichen",
      "classification": "ZUWANDERUNGSKONTINGENTE"
    }
```

### Verbots-Kategorien

Die Clustering der Verbote erfolgte ausschließlich algorithmisch (`classify_topics.py`). Im Prinzip könnte man das noch mit einem LLM verfeinern, der Mehrwert ist aber zu gering.

Das Script arbeitet in zwei Schritten:

1. **Keyword-Mapping**: Zunächst wird geprüft, ob der Text Schlagwörter aus einer vordefinierten Liste enthält:

```json
TOPIC_MAPPING = {
    "Rüstung & Waffen": ["waffen", "rüstung", "export", "drohnen", "kampf", "militär", "bundeswehr", "abrüstung", "krieg", "panzer"],
    "Umwelt & Klima": ["klima", "co2", "umwelt", "emissionen", "kohle", "atom", "energie", "fossile", "plastik", "diesel", "verbrenner", "naturschutz", "wald", "wasser", "luft"],
    "Verkehr & Mobilität": ["tempolimit", "auto", "verkehr", "flug", "bahn", "mobilität", "diesel", "pkw", "lkw", "autobahn", "straße", "radverkehr", "öpnv"],
    "Soziales & Arbeit": ["lohn", "arbeit", "rente", "hartz", "sozial", "mindestlohn", "leiharbeit", "befristung", "armut", "sicherung", "arbeitslos"],
    "Wirtschaft & Steuern": ["steuer", "wirtschaft", "finanz", "unternehmen", "konzern", "banken", "schulden", "haushalt", "subvention", "markt", "handel"],
    "Digitales & Überwachung": ["daten", "überwachung", "internet", "digital", "kamera", "vorratsdatenspeicherung", "uploadfilter", "netz", "cyber", "künstliche intelligenz"],
    "Migration & Asyl": ["asyl", "migration", "flüchtling", "grenze", "abschiebung", "einwanderung", "integration"],
    "Gesundheit & Drogen": ["drogen", "cannabis", "gesundheit", "pflege", "medizin", "impfung", "tabak", "alkohol", "krankenhaus", "versicherung"],
    "Bildung & Forschung": ["bildung", "schule", "uni", "forschung", "studium", "kita", "ausbildung", "wissenschaft", "lehrer"],
    "Wohnen & Miete": ["miete", "wohnen", "immobilien", "bau", "spekulation", "wohnraum", "eigentum"],
    "Tierschutz & Landwirtschaft": ["tier", "landwirtschaft", "fleisch", "agrar", "gentechnik", "glyphosat", "bauern", "massentierhaltung"],
    "Demokratie & Recht": ["demokratie", "recht", "wahl", "lobby", "korruption", "partei", "extremismus", "verfassung", "grundgesetz", "justiz"],
    "Gleichstellung & Gesellschaft": ["frauen", "gleichstellung", "gender", "familie", "kinder", "jugend", "diskriminierung", "inklusion", "vielfalt", "queer"],
    "Europa & Außenpolitik": ["europa", "eu", "außenpolitik", "international", "welt", "frieden", "menschenrechte"]
}
```

2. **Heuristik**: Greift keine der Kategorien, werden Stoppwörter und kurze Begriffe entfernt. Das längste verbleibende Wort wird dann als Kategorie angenommen (basierend auf der Annahme, dass im Deutschen das längste Wort oft das spezifische Substantiv/Kompositum ist). 

## Konsens

Hier stelle ich dar, ob es Überlappungen bei der Erkennung spezifischer Verbote gibt. Dazu wird erst ermittelt, an welcher Position sich ein Verbot befindet (anhand des Zitats in `originalQuote`). Finden anderen Modelle an der exakt selben Stelle ein Verbot, wird das als Übereinstimmung gewertet.

Zusätzlich berechne ich die Konsens-Rate: Je meher Modelle an dieser Stelle ein Verbot erkennen, desto höher ist die Rate. Gleichzeitig lässt sich daraus auch ein Korrobations-Score ableiten: Haben andere Modelle an der gleichen Stelle ein Verbot erkannt?

Über den Regler `Toleranz-Radius`lässt sich die Toleranz einstellen. Je niedriger der Wert, desto mehr "individuelle Verbote" werden erfasst. Erhöht man den Wert, werden "naheliegende" Verbote zusammengefasst und die Anzahl der gesamten Verbote einer Partei sinkt. 

[1] M. Voit, L. J. E. Köhler, K. Fischer, and M. Gollwitzer, “Repository - German Election Programs (2002-2021)”. PsychArchives, Feb. 19, 2024. doi: 10.23668/psycharchives.14179.