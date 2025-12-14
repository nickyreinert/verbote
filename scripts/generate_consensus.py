import os
import json
import unicodedata
import difflib

RESULTS_DIR = 'results'
PROGRAMS_DIR = 'programs/txt'
OUTPUT_FILE = 'consensus_analysis.json'

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
        start_in_text = match.a
        # Check similarity of the found segment
        candidate = text[start_in_text : start_in_text + len(quote_short)]
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
                party = os.path.splitext(party_filename)[0].lower()
                
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
                        
            except ValueError:
                continue

    consensus_results = []

    print("Calculating consensus clusters...")
    for year in data_tree:
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
                continue
                
            try:
                with open(source_path, 'r', encoding='utf-8') as f:
                    text = f.read()
            except Exception as e:
                print(f"Error reading source {source_path}: {e}")
                continue

            models = [k for k in models_data.keys() if not k.startswith('_')]
            total_models = len(models)
            if total_models == 0:
                continue

            # Create voting array
            text_len = len(text)
            votes = [0] * text_len
            
            # Collect raw findings for frontend clustering
            raw_findings = []

            # Map findings to text
            for model in models:
                quotes = models_data[model]
                if not quotes:
                    continue
                
                covered_indices = set()
                for item in quotes:
                    q = item.get('originalQuote', '')
                    start, score = find_quote_position_fuzzy(text, q)
                    if start != -1 and score > 70: # Slightly looser threshold for clustering
                        length = len(q)
                        end_pos = min(start + length, text_len)
                        
                        # Add to raw findings
                        raw_findings.append({
                            "model": model,
                            "start": start,
                            "end": end_pos,
                            "text": text[start:end_pos],
                            "original_quote": q,
                            "category": item.get('category', ''),
                            "topic": item.get('topic', ''),
                            "classification": item.get('classification', '')
                        })

                        for i in range(start, end_pos):
                            covered_indices.add(i)
                
                for idx in covered_indices:
                    votes[idx] += 1
            
            # Generate Density Profile (100 bins)
            density_profile = []
            bin_size = max(1, text_len // 100)
            for i in range(100):
                start_idx = i * bin_size
                end_idx = min((i + 1) * bin_size, text_len)
                if start_idx >= text_len:
                    density_profile.append(0)
                    continue
                
                # Get max votes in this bin
                bin_votes = votes[start_idx:end_idx]
                max_v = max(bin_votes) if bin_votes else 0
                # Normalize to 0.0 - 1.0
                density_profile.append(max_v / total_models)

            # Extract clusters (regions where votes > 0)
            clusters = []
            current_start = -1
            current_max_votes = 0
            
            for i in range(text_len):
                if votes[i] > 0:
                    if current_start == -1:
                        current_start = i
                        current_max_votes = votes[i]
                    else:
                        current_max_votes = max(current_max_votes, votes[i])
                else:
                    if current_start != -1:
                        end = i
                        # Filter noise
                        if end - current_start > 10:
                            segment = text[current_start:end]
                            # Calculate confidence score (0.0 to 1.0)
                            confidence = current_max_votes / total_models
                            
                            clusters.append({
                                "text": segment,
                                "start": current_start,
                                "end": end,
                                "vote_count": current_max_votes,
                                "total_models": total_models,
                                "confidence": confidence
                            })
                        current_start = -1
                        current_max_votes = 0
            
            # Trailing cluster
            if current_start != -1:
                end = text_len
                if end - current_start > 10:
                    segment = text[current_start:end]
                    confidence = current_max_votes / total_models
                    clusters.append({
                        "text": segment,
                        "start": current_start,
                        "end": end,
                        "vote_count": current_max_votes,
                        "total_models": total_models,
                        "confidence": confidence
                    })

            if clusters:
                consensus_results.append({
                    "year": year,
                    "party": party,
                    "party_display": models_data.get('_sourceFile', party),
                    "total_clusters": len(clusters),
                    "total_models": total_models,
                    "models": models,
                    "density_profile": density_profile,
                    "items": clusters,
                    "raw_findings": raw_findings
                })

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(consensus_results, f, indent=2, ensure_ascii=False)
    
    print(f"Consensus analysis saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_consensus()
