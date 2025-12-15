import os
import json
import re
import glob

# Basic German Stopwords
STOPWORDS = {
    "der", "die", "das", "und", "in", "den", "von", "zu", "für", "mit", "auf", "nicht", "im", "ist", "es", "sich", "auch", "ein", "eine", "einer", "einem", "einen", "dem", "dass", "wir", "werden", "sie", "er", "sie", "es", "als", "um", "aber", "nach", "wie", "vor", "oder", "aus", "bei", "uns", "noch", "nur", "muss", "kann", "soll", "wird", "wollen", "hat", "haben", "keine", "kein", "mehr", "durch", "über", "unter", "zwischen", "gegen", "vom", "zum", "zur", "am", "sind", "war", "wäre", "würde", "diese", "dieser", "dieses", "alle", "alles", "nichts", "man", "ihre", "seine", "ihr", "sein", "doch", "mal", "hier", "da", "dort", "wo", "wann", "wer", "was", "warum", "wie", "weil", "wenn", "ob", "zwar", "zudem", "dabei", "damit", "darauf", "dazu", "daran", "darüber", "darunter", "davon", "davor", "dahinter", "daneben", "darum", "deshalb", "deswegen", "daher", "folglich", "somit", "also", "etwa", "bzw", "usw", "etc", "verbot", "verbieten", "untersagt", "zulässig", "nicht", "keine", "stopp", "ende", "abschaffung", "ausstieg", "verhindern", "unterlassen", "ablehnen", "ablehnung"
}

TOPIC_MAPPING = {
    "Rüstung & Waffen": ["waffen", "rüstung", "export", "drohnen", "kampf", "militär", "bundeswehr", "abrüstung", "krieg", "panzer"],
    "Umwelt & Klima": ["klima", "co2", "umwelt", "emissionen", "kohle", "atom", "energie", "fossile", "plastik", "diesel", "verbrenner", "naturschutz", "wald", "wasser", "luft"],
    "Verkehr & Mobilität": ["tempolimit", "auto", "verkehr", "flug", "bahn", "mobilität", "diesel", "pkw", "lkw", "autobahn", "straße", "radverkehr", "öpnv"],
    "Soziales & Arbeit": ["lohn", "arbeit", "rente", "hartz", "sozial", "mindestlohn", "leiharbeit", "befristung", "armut", "sicherung", "arbeitslos"],
    "Wirtschaft & Steuern": ["Steuer", "Wirtschaft", "Finanz", "Unternehmen", "Konzern", "Banken", "Schulden", "Haushalt", "Subvention", "Markt", "Handel"],
    "Digitales & Überwachung": ["Daten", "Überwachung", "Internet", "Digital", "Kamera", "Vorratsdatenspeicherung", "Uploadfilter", "Netz", "Cyber", "Künstliche Intelligenz"],
    "Migration & Asyl": ["Asyl", "Migration", "Flüchtling", "Grenze", "Abschiebung", "Einwanderung", "Integration"],
    "Gesundheit & Drogen": ["Drogen", "Cannabis", "Gesundheit", "Pflege", "Medizin", "Impfung", "Tabak", "Alkohol", "Krankenhaus", "Versicherung"],
    "Bildung & Forschung": ["Bildung", "Schule", "Uni", "Forschung", "Studium", "Kita", "Ausbildung", "Wissenschaft", "Lehrer"],
    "Wohnen & Miete": ["Miete", "Wohnen", "Immobilien", "Bau", "Spekulation", "Wohnraum", "Eigentum"],
    "Tierschutz & Landwirtschaft": ["Tier", "Landwirtschaft", "Fleisch", "Agrar", "Gentechnik", "Glyphosat", "Bauern", "Massentierhaltung"],
    "Demokratie & Recht": ["Demokratie", "Recht", "Wahl", "Lobby", "Korruption", "Partei", "Extremismus", "Verfassung", "Grundgesetz", "Justiz"],
    "Gleichstellung & Gesellschaft": ["Frauen", "Gleichstellung", "Gender", "Familie", "Kinder", "Jugend", "Diskriminierung", "Inklusion", "Vielfalt", "Queer"],
    "Europa & Außenpolitik": ["Europa", "EU", "Außenpolitik", "International", "Welt", "Frieden", "Menschenrechte"]
}

def clean_text(text):
    # Remove punctuation, normalize whitespace, and lowercase
    text = re.sub(r'[^\w\s]', '', text).lower()
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def get_classification(text):
    cleaned_text = clean_text(text)
    words = cleaned_text.split()
    word_set = set(words)
    padded_text = f" {cleaned_text} "
    
    # 1. Check against Topic Mapping
    for category, keywords in TOPIC_MAPPING.items():
        for keyword in keywords:
            # Case-sensitive check for German Nouns (capitalized in mapping)
            if keyword[0].isupper():
                # Check in original text (robust to punctuation)
                if re.search(r'\b' + re.escape(keyword) + r'\b', text):
                    return category
            else:
                # Case-insensitive check
                normalized_keyword = clean_text(keyword)
                if not normalized_keyword:
                    continue

                if ' ' in normalized_keyword:
                    if f" {normalized_keyword} " in padded_text:
                        return category
                else:
                    if normalized_keyword in word_set:
                        return category

    # 2. Fallback: Heuristic
    # Filter stopwords and short words
    meaningful_words = [w for w in words if w not in STOPWORDS and len(w) > 3]
    
    if not meaningful_words:
        return "SONSTIGES"
    
    # Heuristic: Take the longest word as it's likely the specific subject (compound noun in German)
    longest_word = max(meaningful_words, key=len)
    return longest_word.upper()

def process_files():
    base_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    pattern = os.path.join(base_dir, '**', '*.json')
    
    files = glob.glob(pattern, recursive=True)
    
    print(f"Found {len(files)} files to process.")
    
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if not content.strip():
                    continue
                data = json.loads(content)
            
            if 'topics' not in data:
                continue
                
            modified = False
            for item in data['topics']:
                if 'topic' in item:
                    classification = get_classification(item['topic'])
                    if 'classification' not in item or item['classification'] != classification:
                        item['classification'] = classification
                        modified = True
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"Updated {file_path}")
                
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    process_files()
