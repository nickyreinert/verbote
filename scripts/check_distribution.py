import os
import json
import unicodedata
import difflib
from generate_config import PARTY_MAPPING

RESULTS_DIR = 'results'
PROGRAMS_DIR = 'programs/txt'
OUTPUT_FILE = 'distribution_analysis.json'

def normalize_filename(filename):
    # Normalize to NFC for consistent comparison
    if not isinstance(filename, str):
        return ""
    return unicodedata.normalize('NFC', filename)

def build_file_map(root_dir):
    file_map = {}
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.txt'):
                # Store both the original and normalized filename
                norm_name = normalize_filename(file)
                full_path = os.path.join(root, file)
                file_map[norm_name] = full_path
                # Also map without extension for easier lookup
                name_no_ext = os.path.splitext(norm_name)[0]
                file_map[name_no_ext] = full_path
    return file_map

def find_quote_position_fuzzy(text, quote):
    if not quote:
        return -1, 0
    
    # 1. Exact match
    index = text.find(quote)
    if index != -1:
        return index, 100
    
    # 2. Normalized whitespace match (simple fallback)
    quote_clean = quote.replace('\n', ' ').replace('\r', '')
    index = text.find(quote_clean)
    if index != -1:
        return index, 95 # Penalty for whitespace mismatch
        
    # 3. Fuzzy match using SequenceMatcher
    # Use autojunk=False to speed up for large texts
    s = difflib.SequenceMatcher(None, text, quote, autojunk=False)
    
    # Find the longest contiguous matching block
    match = s.find_longest_match(0, len(text), 0, len(quote))
    
    # If we found a significant chunk (e.g. > 20 chars or > 30% of quote)
    if match.size > 20: 
        # The match gives us:
        # match.a = position in text where match starts
        # match.b = position in quote where match starts  
        # match.size = length of match
        
        # If the match is at the beginning of the quote (match.b == 0),
        # then match.a is our position
        # If the match is in the middle of the quote, we need to estimate
        # where the quote starts by going backwards
        start_in_text = match.a - match.b
        
        # Extract the candidate text segment
        end_in_text = start_in_text + len(quote)
        
        # Bounds check
        start_in_text = max(0, start_in_text)
        end_in_text = min(len(text), end_in_text)
        
        candidate = text[start_in_text:end_in_text]
        
        # Calculate similarity score for the whole segment
        similarity = difflib.SequenceMatcher(None, candidate, quote, autojunk=False).ratio()
        score = int(similarity * 100)
        
        # If score is too low, it might be a false positive (just a common phrase)
        if score > 60:
            return start_in_text, score
            
    return -1, 0

def analyze_distribution():
    print("Building source file map...")
    source_file_map = build_file_map(PROGRAMS_DIR)
    
    results_data = []

    print("Processing result files...")
    for root, dirs, files in os.walk(RESULTS_DIR):
        for file in files:
            if not file.endswith('.json'):
                continue
                
            file_path = os.path.join(root, file)
            
            # Extract metadata from path
            parts = os.path.normpath(file_path).split(os.sep)
            try:
                res_idx = parts.index('results')
                if len(parts) < res_idx + 4:
                    continue
                year = parts[res_idx + 1]
                model = parts[res_idx + 2]
                party_filename = parts[res_idx + 3]
                
                # Use strict mapping
                party_key = os.path.splitext(party_filename)[0]
                if party_key in PARTY_MAPPING:
                    party = PARTY_MAPPING[party_key]
                else:
                    # Try lowercase match as fallback if strict key not found
                    found = False
                    for k, v in PARTY_MAPPING.items():
                        if k.lower() == party_key.lower():
                            party = v
                            found = True
                            break
                    if not found:
                        raise ValueError(f"Unknown party file: {party_filename} (key: {party_key}) in {file_path}")

            except ValueError as e:
                if "Unknown party" in str(e):
                    raise e
                continue

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
                continue

            source_filename = data.get('sourceFile')
            if not source_filename:
                # Strict validation
                raise ValueError(f"Missing sourceFile in {file_path}")

            # Normalize and try to find the file
            norm_source = normalize_filename(source_filename)
            
            # Try exact match
            source_path = source_file_map.get(norm_source)
            
            # If not found, try swapping extension to .txt
            if not source_path:
                name_no_ext = os.path.splitext(norm_source)[0]
                source_path = source_file_map.get(name_no_ext)

            if not source_path:
                # Strict validation
                raise FileNotFoundError(f"Source file '{source_filename}' (norm: '{norm_source}') not found for {file_path}")

            try:
                with open(source_path, 'r', encoding='utf-8') as f:
                    source_text = f.read()
            except Exception as e:
                raise IOError(f"Error reading source {source_path}: {e}")

            total_length = len(source_text)
            if total_length == 0:
                continue

            positions = []
            topics = data.get('topics', [])
            
            found_count = 0
            not_found_count = 0

            for topic in topics:
                quote = topic.get('originalQuote')
                index, score = find_quote_position_fuzzy(source_text, quote)

                if index != -1:
                    relative_pos = index / total_length
                    positions.append({
                        "pos": round(relative_pos, 4),
                        "score": score
                    })
                    found_count += 1
                else:
                    not_found_count += 1
            
            # Sort by position
            positions.sort(key=lambda x: x['pos'])

            results_data.append({
                "year": year,
                "model": model,
                "party": party,
                "sourceFile": source_filename,
                "totalLength": total_length,
                "foundQuotes": found_count,
                "notFoundQuotes": not_found_count,
                "positions": positions
            })

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results_data, f, indent=2, ensure_ascii=False)
    
    print(f"Analysis complete. Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    analyze_distribution()
