import requests

url = "https://yuyu-tei.jp/sell/opc/s/op05"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

print("Testing connection to Yuyutei...")
resp = requests.get(url, headers=headers)
print(f"Status Code: {resp.status_code}")
print(f"Page Length: {len(resp.text)} characters")

if "card_unit" in resp.text:
    print("✅ SUCCESS: Found card elements!")
elif "Forbidden" in resp.text or "Access Denied" in resp.text:
    print("❌ BLOCKED: Access Denied.")
else:
    print("⚠️ WARNING: Page loaded but no cards found. Saving HTML dump...")
    with open("debug_dump.html", "w", encoding="utf-8") as f:
        f.write(resp.text)
    print("Check debug_dump.html to see what the scraper saw.")