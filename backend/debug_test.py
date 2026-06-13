import urllib.request
import json

url = "http://localhost:8000/api/run"
payload = json.dumps({"dataset_size": "small", "num_workers": 4, "mode": "compare"}).encode()
req = urllib.request.Request(
    url, data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    r = urllib.request.urlopen(req, timeout=120)
    result = json.loads(r.read())
    print("SUCCESS")
    print(result)
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print("HTTP Error", e.code)
    print(body)
except Exception as ex:
    print("Error:", ex)
