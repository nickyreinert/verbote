import os
import json
import unicodedata

# Configuration
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_DIR = os.path.join(WORKSPACE_ROOT, 'results')
PROGRAMS_PDF_DIR = os.path.join(WORKSPACE_ROOT, 'programs', 'pdf')
CONFIG_FILE = os.path.join(WORKSPACE_ROOT, 'config.json')

PARTY_MAPPING = {
    "afd": "AFD",
    "cducsu": "CDU/CSU",
    "fdp": "FDP",
    "grüne": "Bündnis 90/Die Grünen",
    "linke": "DIE LINKE",
    "partei": "Die Partei",
    "piraten": "Piraten",
    "spd": "SPD"
}

MODEL_MAPPING = {
    "mistral": "Mistral 7B Instruct",
    "grok": "grok-2.5-turbo",
    "gemini": "Gemini Thinking Modus 13.12.2025",
    "qwen": "Qwen"
}

def get_party_name(filename):
    name = os.path.splitext(filename)[0]
    if name in PARTY_MAPPING:
        return PARTY_MAPPING[name]
    
    # Strict validation: Error if party not in mapping
    # Check if it's already a mapped value (reverse check could be added, but let's be strict on keys)
    raise ValueError(f"Unknown party identifier: '{name}'. Please add it to PARTY_MAPPING in generate_config.py")

def get_model_name(folder_name):
    return MODEL_MAPPING.get(folder_name, folder_name)

def normalize_filename(filename):
    return unicodedata.normalize('NFC', filename) if isinstance(filename, str) else filename

def find_file_smart(directory, filename):
    if not os.path.exists(directory):
        return None
    
    norm_filename = normalize_filename(filename)
    
    # Walk through directory to find file recursively
    for root, dirs, files in os.walk(directory):
        # Normalize files in directory for comparison
        norm_files = {normalize_filename(f): f for f in files}
        
        # Try exact match (normalized)
        if norm_filename in norm_files:
            return os.path.join(root, norm_files[norm_filename])
            
        # Try fixing common encoding issues
        fixed_filename = filename.replace('Å', 'ü').replace('Ã¼', 'ü')
        norm_fixed = normalize_filename(fixed_filename)
        if norm_fixed in norm_files:
            return os.path.join(root, norm_files[norm_fixed])

        # Try case insensitive match
        for f in files:
            if normalize_filename(f).lower() == norm_filename.lower():
                return os.path.join(root, f)
            if normalize_filename(f).lower() == norm_fixed.lower():
                return os.path.join(root, f)
            
    return None

def main():
    # New structure: { "2017": { "gemini": [ ... ] }, "2021": ... }
    config = {}

    # Find all years in results
    if not os.path.exists(RESULTS_DIR):
        print(f"Results directory not found: {RESULTS_DIR}")
        return

    years = sorted([d for d in os.listdir(RESULTS_DIR) if d.isdigit() and os.path.isdir(os.path.join(RESULTS_DIR, d))])
    
    # Iterate over years
    for year in years:
        config[year] = {}
        year_dir = os.path.join(RESULTS_DIR, year)
        models = [d for d in os.listdir(year_dir) if os.path.isdir(os.path.join(year_dir, d))]
        
        for model in models:
            config[year][model] = []
            model_dir = os.path.join(year_dir, model)
            result_files = [f for f in os.listdir(model_dir) if f.endswith('.json')]
            
            for result_file in sorted(result_files):
                file_path = os.path.join(model_dir, result_file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        source_file = data.get('sourceFile')
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
                    continue

                party_name = get_party_name(result_file)
                
                # Determine original file path
                original_file_path = ""
                if source_file:
                    base_name = os.path.splitext(source_file)[0]
                    pdf_filename = base_name + ".pdf"
                    txt_filename = base_name + ".txt"
                    
                    # Check if it exists in programs/pdf/<year>
                    pdf_dir = os.path.join(WORKSPACE_ROOT, 'programs', 'pdf', year)
                    found_pdf_path = find_file_smart(pdf_dir, pdf_filename)
                    
                    if found_pdf_path:
                        original_file_path = os.path.relpath(found_pdf_path, WORKSPACE_ROOT)
                    else:
                        # Fallback to TXT if PDF not found
                        txt_dir = os.path.join(WORKSPACE_ROOT, 'programs', 'txt', year)
                        found_txt_path = find_file_smart(txt_dir, txt_filename)
                        
                        if found_txt_path:
                             original_file_path = os.path.relpath(found_txt_path, WORKSPACE_ROOT)
                        else:
                            # Strict validation: Error if neither PDF nor TXT found
                            raise FileNotFoundError(f"Source file not found for {source_file} (looked for {pdf_filename} in {pdf_dir} and {txt_filename} in {txt_dir})")

                entry = {
                    "party": party_name,
                    "file": os.path.relpath(file_path, WORKSPACE_ROOT),
                    "original_file": original_file_path,
                    "model_display_name": get_model_name(model)
                }
                
                config[year][model].append(entry)

    # Write config.json
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=4, ensure_ascii=False)
    
    print(f"Generated {CONFIG_FILE}")

if __name__ == "__main__":
    main()
