import sys
import os

def split_file(input_path):
    print(f"Splitting {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    total_length = len(content)
    midpoint = total_length // 2
    
    # Find the nearest paragraph break (\n\n) around the midpoint
    # Search forward from midpoint
    split_index = -1
    
    # Try to find a double newline first
    search_range = 5000 # Look within 5000 chars
    
    # Look forward
    forward_search = content.find('\n\n', midpoint)
    if forward_search != -1 and forward_search - midpoint < search_range:
        split_index = forward_search + 2 # Split after the newlines
    else:
        # Look backward
        backward_search = content.rfind('\n\n', 0, midpoint)
        if backward_search != -1 and midpoint - backward_search < search_range:
            split_index = backward_search + 2
    
    # If no double newline found, try single newline
    if split_index == -1:
        print("No paragraph break found near middle, looking for line break...")
        forward_search = content.find('\n', midpoint)
        if forward_search != -1:
            split_index = forward_search + 1
        else:
            split_index = midpoint # Fallback to hard split
            
    part1 = content[:split_index]
    part2 = content[split_index:]
    
    base, ext = os.path.splitext(input_path)
    # Remove _compressed if it exists to avoid stacking
    if base.endswith('_compressed'):
        base = base[:-11]
        
    out1 = f"{base}_part1{ext}"
    out2 = f"{base}_part2{ext}"
    
    with open(out1, 'w', encoding='utf-8') as f:
        f.write(part1)
        
    with open(out2, 'w', encoding='utf-8') as f:
        f.write(part2)
        
    print(f"Total length: {total_length}")
    print(f"Split index: {split_index}")
    print(f"Part 1 length: {len(part1)}")
    print(f"Part 2 length: {len(part2)}")
    print(f"Saved to:\n{out1}\n{out2}")
    print(f"\nIMPORTANT: When merging results, add {len(part1)} to the indices of findings from Part 2.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python split_text.py <input_file>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    split_file(input_file)
