import requests
import json
import os

BASE_URL = "https://toolkit.diegodad.com/client"

def login(phone, password):
    url = f"{BASE_URL}/api/loginByPassword"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # Attempt 1: POST JSON
    print(f"Attempting login (POST JSON) with phone: {phone}")
    try:
        payload = {"phone": phone, "password": password}
        response = requests.post(url, json=payload, headers=headers)
        print(f"POST JSON Status: {response.status_code}")
        if response.status_code != 200:
             print(f"Response: {response.text}")
        if response.status_code == 200:
            return response.json(), response.cookies
    except Exception as e:
        print(f"POST JSON failed: {e}")

    # Attempt 1.1: POST JSON with mobile
    print(f"Attempting login (POST JSON mobile) with phone: {phone}")
    try:
        payload = {"mobile": phone, "password": password}
        response = requests.post(url, json=payload, headers=headers)
        print(f"POST JSON mobile Status: {response.status_code}")
        if response.status_code != 200:
             print(f"Response: {response.text}")
        if response.status_code == 200:
            return response.json(), response.cookies
    except Exception as e:
        print(f"POST JSON mobile failed: {e}")

    # Attempt 1.2: POST JSON with username
    print(f"Attempting login (POST JSON username) with phone: {phone}")
    try:
        payload = {"username": phone, "password": password}
        response = requests.post(url, json=payload, headers=headers)
        print(f"POST JSON username Status: {response.status_code}")
        if response.status_code != 200:
             print(f"Response: {response.text}")
        if response.status_code == 200:
            return response.json(), response.cookies
    except Exception as e:
        print(f"POST JSON username failed: {e}")

    # Attempt 1.3: POST JSON with random
    print(f"Attempting login (POST JSON random) with phone: {phone}")
    try:
        payload = {"foo": "bar", "password": password}
        response = requests.post(url, json=payload, headers=headers)
        print(f"POST JSON random Status: {response.status_code}")
        if response.status_code != 200:
             print(f"Response: {response.text}")
        if response.status_code == 200:
            return response.json(), response.cookies
    except Exception as e:
        print(f"POST JSON random failed: {e}")

    # Attempt 2: POST Form Data
    print(f"Attempting login (POST Form) with phone: {phone}")
    try:
        data = {"phone": phone, "password": password}
        response = requests.post(url, data=data, headers=headers)
        print(f"POST Form Status: {response.status_code}")
        if response.status_code != 200:
             print(f"Response: {response.text}")
        if response.status_code == 200:
            return response.json(), response.cookies
    except Exception as e:
        print(f"POST Form failed: {e}")

    # Attempt 3: GET
    print(f"Attempting login (GET) with phone: {phone}")
    try:
        params = {"phone": phone, "password": password}
        response = requests.get(url, params=params, headers=headers)
        print(f"GET Status: {response.status_code}")
        if response.status_code == 200:
            return response.json(), response.cookies
    except Exception as e:
        print(f"GET failed: {e}")

    return None, None

def get_files(cookies, token=None):
    # Try dirTree first
    url = f"{BASE_URL}/api/userFile/dirTree"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    if token:
        headers["Authorization"] = token
        headers["token"] = token # Try both standard Auth header and custom token header

    print("Fetching directory tree...")
    try:
        response = requests.get(url, headers=headers, cookies=cookies)
        print(f"DirTree Status: {response.status_code}")
        if response.status_code == 200:
            return response.json()
        
        # If dirTree fails or returns empty, try list
        print("Fetching file list...")
        url_list = f"{BASE_URL}/api/userFile/list"
        # parameters might be needed like parentId=0 or similar
        response = requests.get(url_list, headers=headers, cookies=cookies)
        print(f"List Status: {response.status_code}")
        return response.json()

    except requests.exceptions.RequestException as e:
        print(f"Fetch files failed: {e}")
        return None

if __name__ == "__main__":
    phone = os.getenv("DIEGODAD_PHONE")
    password = os.getenv("DIEGODAD_PASSWORD")
    if not phone or not password:
        raise SystemExit("Missing DIEGODAD_PHONE or DIEGODAD_PASSWORD in environment variables.")
    
    login_data, cookies = login(phone, password)
    
    if login_data:
        # Check for token in response
        token = None
        if 'data' in login_data and isinstance(login_data['data'], dict):
             token = login_data['data'].get('token')
        elif 'token' in login_data:
             token = login_data['token']
             
        if not token:
             print("Warning: No token found in login response. Relying on cookies.")

        files_data = get_files(cookies, token)
        if files_data:
            print("Files data:", json.dumps(files_data, indent=2))
    else:
        print("Login failed, cannot proceed.")
