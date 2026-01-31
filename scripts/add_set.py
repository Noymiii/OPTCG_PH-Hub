
import json
import os
import sys
import argparse

# Add current dir to path to import scrape_cards
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrape_cards import scrape_set, build_flat_database, DATA_FILE

def add_set(set_code):
    set_code = set_code.lower()
    print(f"🔄 Updating/Adding Set: {set_code.upper()}")
    
    # 1. Scrape the new set
    new_data = scrape_set(set_code)
    if not new_data:
        print(f"❌ No data found for {set_code}")
        return

    # 2. Flatten properly
    # Note: scrape_set returns {code: [variants...]}
    # build_flat_database expects exactly that
    flat_new = build_flat_database(new_data)
    print(f"✅ Scraped {len(flat_new)} cards for {set_code.upper()}")

    # 3. Load existing DB
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            try:
                db = json.load(f)
            except:
                db = []
    else:
        db = []
    
    print(f"📉 Current DB size: {len(db)}")

    # 4. Remove existing entries for this set (to allow updating)
    # We filter out cards where 'set' matches or 'card_code' starts with set prefix
    # EB04-001 -> set is 'EB04' ideally.
    # Check flat record structure: 'set': set_id
    
    original_count = len(db)
    # Filter out by explicit set field match (case insensitive)
    db = [c for c in db if c.get('set', '').lower() != set_code]
    
    # Also double check by card_code prefix just in case set parsing was weird
    # But trusting 'set' field is safer if logic is sound.
    # scrape_cards.py line 234: set_id = code.split("-")[0]
    
    removed_count = original_count - len(db)
    if removed_count > 0:
        print(f"🗑️ Removed {removed_count} old entries for {set_code.upper()}")

    # 5. Append new
    db.extend(flat_new)
    
    # 6. Save
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
        
    print(f"🎉 Success! New DB size: {len(db)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add or Update a specific set")
    parser.add_argument("set_code", help="Set code to add, e.g. eb04")
    args = parser.parse_args()
    
    add_set(args.set_code)
