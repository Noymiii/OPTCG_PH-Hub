import requests

URLS = [
    "https://card.yuyu-tei.jp/opc/100_140/op01/10150.jpg",
    "https://card.yuyu-tei.jp/opc/100_140/prb01/10022.jpg", # PRB01
    "https://card.yuyu-tei.jp/opc/100_140/op02/10001.jpg"  # Guessing OP02
]

print("--- Testing 200_280 Replacement ---")
for url in URLS:
    target = url.replace("100_140", "200_280")
    try:
        r = requests.head(target, timeout=3)
        print(f"[{r.status_code}] {target}")
    except Exception as e:
        print(f"[ERR] {target}: {e}")
