import requests
import json

# Try cQcn... as API Key
API_KEY = "cQcnNhIFAgqqwZDhBRoD"
# Try c3FT... as Secret Key
SECRET_KEY = "c3FT_d65ej3rgi2kucl1ajs90"

def get_access_token():
    url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {
        "grant_type": "client_credentials",
        "client_id": API_KEY,
        "client_secret": SECRET_KEY
    }
    print(f"Requesting token with API_KEY={API_KEY}...")
    try:
        response = requests.post(url, params=params)
        print("Token Response:", response.text)
        return response.json().get("access_token")
    except Exception as e:
        print(f"Token Error: {e}")
        return None

if __name__ == "__main__":
    get_access_token()
