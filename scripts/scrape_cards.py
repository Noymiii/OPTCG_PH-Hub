import requests
from bs4 import BeautifulSoup
import json
import time
import os
import re
import sys

# -------------------- CONFIG --------------------
PROJECT_ROOT = os.getcwd()
DATA_FILE = os.path.join(PROJECT_ROOT, "src", "data", "cards.json")
YUYUTEI_BASE = "https://yuyu-tei.jp/sell/opc/s"

# ✅ ALL SETS
SETS = [
    "op01", "op02", "op03", "op04", "op05", "op06", "op07", 
    "op08", "op09", "op10", "op11", "op12", "op13", "op14",
    "eb01", "eb02", "eb03",
    "prb01", "prb02",
    "st01", "st02", "st03", "st04", "st05", "st06", "st07", "st08", "st09", "st10",
    "st11", "st12", "st13", "st14", "st15", "st16", "st17", "st18", "st19", "st20",
    "p"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# ✅ FIXED REGEX: 
# 1. Matches standard (OP01-001)
# 2. Matches Promos (P-001) by making the middle 2 digits optional (\d{0,2})
CODE_REGEX = re.compile(r"(OP|ST|EB|PRB|P)(\d{0,2})-(\d{3})", re.I)

PRICE_REGEX = re.compile(r"(\d{1,3}(?:,\d{3})*)\s*円")
RARITY_REGEX = re.compile(r"(P-SEC|P-SR|P-R|P-L|SEC|SR|R|L|SP|UC|C|DON!!)")

# -------------------- HELPERS --------------------
def find_product_container(tag):
    try:
        for parent in tag.parents:
            if getattr(parent, "name", None) not in ["div", "li"]: continue
            classes = parent.get("class") or []
            if "col-md-4" in classes or "card_unit" in classes: return parent
            if "円" in parent.get_text(" ", strip=True): return parent
    except: return None
    return None

def extract_price(text):
    m = PRICE_REGEX.search(text)
    if m:
        try: return int(m.group(1).replace(",", ""))
        except: pass
    return 0

def extract_rarity(text):
    # Check explicitly for DON first
    if "DON" in text or "ドン" in text:
        return "DON"
    m = RARITY_REGEX.search(text or "")
    return m.group(1) if m else None

# -------------------- KEYWORDS --------------------
VARIANTS = [
    ("スーパーパラレル", "Super Parallel (Manga)", 10),
    ("コミック", "Manga Rare (Comic)", 10),
    ("シリアル", "Serial Numbered", 10),
    ("ゴールデン", "Golden Manga", 10),
    ("SPパラレル", "SP Parallel", 9),
    ("手配書", "Wanted Poster (SP)", 9),
    ("SP", "SP Card", 9),
    ("サイン", "Signature / Signed", 9),
    ("書き下ろし", "Original Art / SP", 9),
    ("チャンピオン", "Championship Prize", 9),
    ("優勝", "Winner Prize", 9),
    ("フラッグシップ", "Flagship Battle Prize", 9),
    ("記念品", "Commemorative Promo", 9),
    ("ベスト8", "Top 8 Prize", 9),
    ("リーダーパラレル", "Leader Parallel", 8),
    ("P-L", "Leader Parallel", 8),
    ("箔押し", "Foil Stamped", 8),       
    ("刻印なし", "No Engraving", 8),     
    ("刻印", "Engraved", 8),             
    ("パラレル", "Parallel (AA)", 7),
    ("(パラレル)", "Parallel (AA)", 7),
    ("P-SEC", "SEC Parallel", 7),
    ("P-SR", "SR Parallel", 7),
    ("P-R", "Rare Parallel", 7),
    ("P-UC", "Uncommon Parallel", 7),
    ("P-C", "Common Parallel", 7),
    ("PRB", "Premium Booster Parallel", 7), 
    ("メモリアル", "Memorial Collection", 6),
    ("プレミアム", "Premium", 6),
    ("ジャンプ", "Jump Promo", 6),
    ("最強", "Saikyo Jump", 6),
    ("映画", "Film Promo", 6),
    ("特典", "Bonus / Benefit", 5),
    ("ドン!!", "DON!! Card", 4), # ✅ Added DON Keyword
    ("DON!!", "DON!! Card", 4), # ✅ Added DON Keyword
]

def classify_variant(text, price, index):
    label = "Base / Normal"
    rank = 0
    is_high = False
   
    for jp, en, r in VARIANTS:
        if jp in text:
            if r > rank:
                label = en
                rank = r
   
    if price >= 5000 and rank == 0:
        label = "High Value Variant (Unknown Type)"
        rank = 6
    elif price >= 1500 and rank == 0:
        label = "Parallel (Unmarked)"
        rank = 5

    if rank == 0 and index > 0:
        label = f"Variant #{index + 1}"

    if rank >= 5: is_high = True
    return label, rank, is_high

# -------------------- CORE SCRAPER --------------------
def scrape_set(set_code):
    print(f"🔍 Scraping {set_code.upper()}...")
    cards = {}
    code_counts = {}
    processed_containers_in_set = set()
    page = 1
    
    while True:
        if page > 40: break
        url = f"{YUYUTEI_BASE}/{set_code}?page={page}"
        print(f"   Using URL: {url}")
        
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code != 200: break
            soup = BeautifulSoup(r.text, "html.parser")
        except: break

        product_imgs = soup.find_all("img", attrs={"alt": True})
        if not product_imgs: break

        new_cards_found = 0

        for img in product_imgs:
            try:
                alt = (img.get("alt") or "").strip()
                
                # ✅ IMPROVED LOGIC: Match Code OR Match DON!!
                code_match = CODE_REGEX.search(alt)
                
                if code_match:
                    code = code_match.group(0).upper()
                elif "DON" in alt or "ドン" in alt:
                    # If it's a DON card with no code, generate a unique one
                    # Format: DON-SET-001
                    code = f"DON-{set_code.upper()}-{new_cards_found+1:03d}"
                else:
                    continue # Skip if not a card we recognize
                
                container = find_product_container(img) or img.parent
                if not container: continue
                
                container_sig = str(container)
                if container_sig in processed_containers_in_set: continue
                processed_containers_in_set.add(container_sig)

                container_text = container.get_text(" ", strip=True)
                price = extract_price(container_text) or extract_price(alt)
                
                code_counts[code] = code_counts.get(code, -1) + 1
                current_index = code_counts[code]

                rarity = extract_rarity(alt) or extract_rarity(container_text)
                label, rank, is_high = classify_variant(alt + " " + container_text, price, current_index)

                img_src = img.get("data-original") or img.get("src")
                
                # Extract Name
                name = None
                h4 = container.find("h4")
                if h4: name = h4.get_text(" ", strip=True)
                if not name: name = alt.replace(code, "").strip()

                if code not in cards: cards[code] = []
                
                cards[code].append({
                    "label": label,
                    "name": name, 
                    "rarity": rarity if rarity else "COMMON",
                    "price": price,
                    "rank": rank,
                    "is_high_rarity": is_high,
                    "image": img_src,
                    "source_url": url,
                })
                new_cards_found += 1
            except: continue
        
        if new_cards_found == 0: break
        page += 1
        time.sleep(1)

    return cards

# -------------------- FLATTENING LOGIC --------------------
def build_flat_database(master):
    flat_list = []
    
    for code, variants in master.items():
        variants.sort(key=lambda x: x["price"])
        set_id = code.split("-")[0]
        
        # If it's a generated DON card, keep it in the set it came from
        if code.startswith("DON"):
             # extract set from DON-OP01-001 -> OP01
             parts = code.split("-")
             if len(parts) > 1: set_id = parts[1]

        for i, v in enumerate(variants):
            record = {
                "card_code": code,
                "set": set_id, 
                "base_name": v.get("name"), 
                "variant_name": v.get('label') or "Normal",
                "rarity": (v.get("rarity") or "UNK").upper(),
                "price_jpy": v["price"],
                "image_url": v["image"],
                "finish": "Foil" if v["is_high_rarity"] else "Normal",
                "is_high_demand": v["is_high_rarity"],
                "unique_id": f"{code}-{v['price']}-{i}"
            }
            flat_list.append(record)
            
    return flat_list

def main():
    master = {}
    print(f"🚀 Starting MASS SCRAPER for {len(SETS)} Sets...")
    for s in SETS:
        new_data = scrape_set(s)
        if new_data:
            for k, v in new_data.items():
                if k in master: master[k].extend(v)
                else: master[k] = v
            print(f"   ✅ Processed {s}")
        time.sleep(1)

    db = build_flat_database(master)
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print(f"\n🎉 DONE — {len(db)} records saved to {DATA_FILE}")

if __name__ == "__main__":
    main()