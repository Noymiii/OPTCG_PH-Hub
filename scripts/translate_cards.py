
import json
import os
import time
from deep_translator import GoogleTranslator

# Config
FILE_PATH = r'c:\Users\Noemi\OneDrive\Desktop\Projects\OPTCG\optcg-ph-hub\src\data\cards.json'
CACHE_PATH = r'c:\Users\Noemi\OneDrive\Desktop\Projects\OPTCG\optcg-ph-hub\scripts\translation_cache.json'

def load_json(path):
    if not os.path.exists(path): return []
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def main():
    print("Loading cards...")
    cards = load_json(FILE_PATH)
    if not cards:
        print("No cards found.")
        return

    # Load cache
    translation_cache = {}
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                translation_cache = json.load(f)
        except:
             translation_cache = {}
            
    print(f"Loaded {len(translation_cache)} cached translations.")

    # Identify unique names needing translation
    unique_names = set()
    for card in cards:
        # Check if name contains Japanese characters (basic range check)
        name = card.get('base_name', '')
        if not name: continue
        
        # Simple heuristic: if it has non-ascii, assume it needs translation
        # (or specifically checked against cache)
        if name not in translation_cache:
            if any(ord(c) > 128 for c in name):
                unique_names.add(name)

    print(f"Found {len(unique_names)} new unique names to translate.")
    
    if not unique_names:
        print("All names are already translated or cached.")
    else:
        translator = GoogleTranslator(source='ja', target='en')
        names_list = list(unique_names)
        
        # Deep translator handles batching internally for some, but let's be safe with manual batching
        # GoogleTranslator usually accepts a list
        batch_size = 20 
        
        for i in range(0, len(names_list), batch_size):
            batch = names_list[i:i+batch_size]
            print(f"Translating batch {i//batch_size + 1}/{(len(names_list)//batch_size) + 1}...")
            
            try:
                # deep-translator translate_batch
                translations = translator.translate_batch(batch)
                
                for original, translated in zip(batch, translations):
                    translation_cache[original] = translated
                    
                # Save cache periodically
                with open(CACHE_PATH, 'w', encoding='utf-8') as f:
                    json.dump(translation_cache, f, indent=2, ensure_ascii=False)
                    
                time.sleep(1) # Rate limit politeness
            except Exception as e:
                print(f"Error in batch: {e}")
                time.sleep(5) 
                continue

    # Apply translations
    print("Applying translations to cards...")
    applied_count = 0
    for card in cards:
        original = card.get('base_name', '')
        if original in translation_cache:
            card['base_name'] = translation_cache[original]
            applied_count += 1
            
    save_json(cards, FILE_PATH)
    print(f"Done. Updated {applied_count} cards.")

if __name__ == "__main__":
    main()
