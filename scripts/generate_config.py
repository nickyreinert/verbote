import os
import json

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
    return PARTY_MAPPING.get(name, name.upper())

def get_model_name(folder_name):
    return MODEL_MAPPING.get(folder_name, folder_name)

def find_file_smart(directory, filename):
    if not os.path.exists(directory):
        return None
    
    # Try exact match first
    if os.path.exists(os.path.join(directory, filename)):
        return filename
        
    # Try fixing common encoding issues
    # "GrÅne" -> "Grüne"
    fixed_filename = filename.replace('Å', 'ü').replace('Ã¼', 'ü')
    if os.path.exists(os.path.join(directory, fixed_filename)):
        return fixed_filename

    # Try case insensitive match
    files = os.listdir(directory)
    for f in files:
        if f.lower() == filename.lower():
            return f
        if f.lower() == fixed_filename.lower():
            return f
            
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
                    # Assume sourceFile is .txt and we want .pdf in programs/pdf/<year>/
                    pdf_filename = os.path.splitext(source_file)[0] + ".pdf"
                    
                    # Check if it exists in programs/pdf/<year>
                    pdf_dir = os.path.join(WORKSPACE_ROOT, 'programs', 'pdf', year)
                    found_filename = find_file_smart(pdf_dir, pdf_filename)
                    
                    if found_filename:
                        original_file_path = os.path.join('programs', 'pdf', year, found_filename)
                    else:
                        # If not found, use the constructed path but warn
                        print(f"Warning: PDF not found for {source_file} (looked for {pdf_filename}) in {pdf_dir}")
                        original_file_path = os.path.join('programs', 'pdf', year, pdf_filename)

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
