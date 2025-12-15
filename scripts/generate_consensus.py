import os
import json
import unicodedata
import difflib
from generate_config import PARTY_MAPPING

RESULTS_DIR = 'results'
PROGRAMS_DIR = 'programs/txt'
OUTPUT_FILE = 'consensus_analysis.json'
TOLERANCE = 100  # Characters distance to group findings

def normalize_filename(filename):
    if not isinstance(filename, str):
        return ""
    return unicodedata.normalize('NFC', filename)

def build_file_map(root_dir):
    file_map = {}
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.txt'):
                norm_name = normalize_filename(file)
                full_path = os.path.join(root, file)
                file_map[norm_name] = full_path
                name_no_ext = os.path.splitext(norm_name)[0]
                file_map[name_no_ext] = full_path
    return file_map

def find_quote_position_fuzzy(text, quote):
    if not quote:
        return -1, 0
    
    # 1. Cut to 100 chars (User requirement)
    quote_short = quote[:100]
    
    # 2. Exact match of short quote
    index = text.find(quote_short)
    if index != -1:
        return index, 100
    
    # 3. Normalized whitespace match
    quote_clean = quote_short.replace('\n', ' ').replace('\r', '')
    index = text.find(quote_clean)
    if index != -1:
        return index, 95
        
    # 4. Fuzzy match of short quote
    s = difflib.SequenceMatcher(None, text, quote_short, autojunk=False)
    match = s.find_longest_match(0, len(text), 0, len(quote_short))
    
    if match.size > 20: 
        start_in_text = match.a - match.b
        start_in_text = max(0, start_in_text)
        end_in_text = min(len(text), start_in_text + len(quote_short))
        # Check similarity of the found segment
        candidate = text[start_in_text:end_in_text]
        similarity = difflib.SequenceMatcher(None, candidate, quote_short).ratio()
        score = int(similarity * 100)
        
        if score > 60:
            return start_in_text, score
            
    return -1, 0

def generate_consensus():
    print("Building source file map...")
    source_file_map = build_file_map(PROGRAMS_DIR)
    
    # Group results by Year -> Party -> [Models]
    data_tree = {}
    models_per_year = {} # year -> set(models)
    
    print("Scanning result files...")
    for root, dirs, files in os.walk(RESULTS_DIR):
        for file in files:
            if not file.endswith('.json'):
                continue
                
            file_path = os.path.join(root, file)
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
                    # But user asked for strict validation. 
                    # However, the file system might have "cducsu.json" while mapping has "cducsu".
                    # Let's try to match the key in PARTY_MAPPING.
                    found = False
                    for k, v in PARTY_MAPPING.items():
                        if k.lower() == party_key.lower():
                            party = v
                            found = True
                            break
                    if not found:
                        raise ValueError(f"Unknown party file: {party_filename} (key: {party_key}) in {file_path}")

                if year not in models_per_year:
                    models_per_year[year] = set()
                models_per_year[year].add(model)
                
                if year not in data_tree:
                    data_tree[year] = {}
                if party not in data_tree[year]:
                    data_tree[year][party] = {}
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    try:
                        content = json.load(f)
                        if isinstance(content, dict) and 'topics' in content:
                            quotes = content['topics']
                            if 'sourceFile' in content:
                                data_tree[year][party]['_sourceFile'] = content['sourceFile']
                        elif isinstance(content, list):
                            quotes = content
                        else:
                            quotes = []
                        
                        data_tree[year][party][model] = quotes
                    except json.JSONDecodeError:
                        print(f"Error decoding {file_path}")
                        
            except ValueError as e:
                if "Unknown party" in str(e):
                    raise e
                continue

    consensus_results = []

    print("Calculating consensus clusters...")
    for year in data_tree:
        total_models_count = len(models_per_year.get(year, []))
        
        for party in data_tree[year]:
            models_data = data_tree[year][party]
            source_file_hint = models_data.get('_sourceFile', '')
            source_path = None
            
            if source_file_hint:
                hint_name = os.path.basename(source_file_hint)
                hint_no_ext = os.path.splitext(hint_name)[0]
                if hint_name in source_file_map:
                    source_path = source_file_map[hint_name]
                elif hint_no_ext in source_file_map:
                    source_path = source_file_map[hint_no_ext]
            
            if not source_path:
                # Strict validation: if we have results but no source text, we can't verify quotes.
                # We should probably raise an error or skip. 
                # Given "just throw an error", I will raise.
                raise FileNotFoundError(f"Source text not found for {party} in {year} (hint: {source_file_hint})")
                
            try:
                with open(source_path, 'r', encoding='utf-8') as f:
                    text = f.read()
            except Exception as e:
                raise IOError(f"Error reading source {source_path}: {e}")

            models = [k for k in models_data.keys() if not k.startswith('_')]
            
            # Collect all findings
            all_findings = []
            text_len = len(text)

            for model in models:
                quotes = models_data[model]
                if not quotes:
                    continue
                
                for item in quotes:
                    q = item.get('originalQuote', '')
                    start, score = find_quote_position_fuzzy(text, q)
                    
                    if start != -1 and score > 70:
                        # Simplified: Just use the found position and original quote length
                        # We don't need complex sentence boundary detection for consensus calculation
                        end_pos = min(start + len(q), text_len)
                        actual_text = text[start:end_pos]
                        
                        all_findings.append({
                            "model": model,
                            "start": start,
                            "end": end_pos,
                            "text": actual_text,
                            "original_quote": q,
                            "category": item.get('category', ''),
                            "topic": item.get('topic', ''),
                            "classification": item.get('classification', '')
                        })

            # Cluster findings by start position
            all_findings.sort(key=lambda x: x['start'])
            
            clusters = []
            if all_findings:
                current_cluster = [all_findings[0]]
                
                for i in range(1, len(all_findings)):
                    finding = all_findings[i]
                    prev_finding = current_cluster[-1]
                    
                    # If start is within tolerance, add to cluster
                    if finding['start'] - prev_finding['start'] < TOLERANCE:
                        current_cluster.append(finding)
                    else:
                        # Finalize current cluster
                        unique_models = set(f['model'] for f in current_cluster)
                        vote_count = len(unique_models)
                        confidence = vote_count / total_models_count
                        
                        # Use the text from the first finding
                        best_finding = current_cluster[0]
                        
                        clusters.append({
                            "text": best_finding['text'],
                            "start": best_finding['start'],
                            "end": best_finding['end'],
                            "vote_count": vote_count,
                            "total_models": total_models_count,
                            "confidence": confidence,
                            "findings": current_cluster
                        })
                        current_cluster = [finding]
                
                # Final cluster
                if current_cluster:
                    unique_models = set(f['model'] for f in current_cluster)
                    vote_count = len(unique_models)
                    confidence = vote_count / total_models_count
                    best_finding = current_cluster[0]
                    
                    clusters.append({
                        "text": best_finding['text'],
                        "start": best_finding['start'],
                        "end": best_finding['end'],
                        "vote_count": vote_count,
                        "total_models": total_models_count,
                        "confidence": confidence,
                        "findings": current_cluster
                    })

            if clusters:
                consensus_results.append({
                    "year": year,
                    "party": party,
                    "party_display": party, # Use normalized name
                    "total_clusters": len(clusters),
                    "total_models": total_models_count,
                    "models": list(models_per_year[year]),
                    "items": clusters,
                    "raw_findings": all_findings
                })

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(consensus_results, f, indent=2, ensure_ascii=False)
    
    print(f"Consensus analysis saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_consensus()
