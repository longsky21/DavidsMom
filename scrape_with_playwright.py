from playwright.sync_api import sync_playwright
import time
import json
import csv
import re
import os

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi", ".flv", ".mkv", ".webm", ".ts"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma"}

def is_video_name(name):
    if not name:
        return False
    name = name.lower()
    return any(name.endswith(ext) for ext in VIDEO_EXTENSIONS)

def is_audio_name(name):
    if not name:
        return False
    name = name.lower()
    return any(name.endswith(ext) for ext in AUDIO_EXTENSIONS)

def extract_video_links(data):
    results = []
    seen = {}

    def add_item(name, url, extra=None, directory=None):
        key = (name or "", url or "")
        if key in seen:
            existing = seen[key]
            if extra and (not existing["extra"] or existing["extra"] == "FILE"):
                existing["extra"] = extra
            if directory and not existing["directory"]:
                existing["directory"] = directory
            return
        row = {
            "directory": directory or "",
            "name": name or "",
            "url": url or "",
            "extra": extra or ""
        }
        seen[key] = row
        results.append(row)

    def walk(obj):
        if isinstance(obj, dict):
            name = obj.get("name") or obj.get("fileName") or obj.get("filename") or obj.get("title")
            url = obj.get("url") or obj.get("fileUrl") or obj.get("playUrl") or obj.get("downloadUrl") or obj.get("link") or obj.get("ossPath")
            suffix = obj.get("suffix") or obj.get("ext") or obj.get("extension") or obj.get("fileExt")
            file_type = obj.get("fileType") or obj.get("type")
            path = obj.get("path") or obj.get("filePath")
            paths = obj.get("paths")
            directory = ""
            if isinstance(paths, list):
                directory = "/".join([str(p) for p in paths if p])
            elif isinstance(paths, str):
                directory = paths

            if suffix:
                if isinstance(suffix, str) and suffix.startswith("."):
                    suffix_check = suffix.lower()
                else:
                    suffix_check = f".{str(suffix).lower()}"
                if suffix_check in VIDEO_EXTENSIONS:
                    add_item(name, url or path, suffix_check, directory)

            if is_video_name(name):
                add_item(name, url or path, file_type, directory)

            for v in obj.values():
                walk(v)

        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(data)
    return results

def extract_audio_links(data):
    results = []
    seen = {}

    def add_item(name, url, extra=None, directory=None):
        key = (name or "", url or "")
        if key in seen:
            existing = seen[key]
            if extra and (not existing["extra"] or existing["extra"] == "FILE"):
                existing["extra"] = extra
            if directory and not existing["directory"]:
                existing["directory"] = directory
            return
        row = {
            "directory": directory or "",
            "name": name or "",
            "url": url or "",
            "extra": extra or ""
        }
        seen[key] = row
        results.append(row)

    def walk(obj):
        if isinstance(obj, dict):
            name = obj.get("name") or obj.get("fileName") or obj.get("filename") or obj.get("title")
            url = obj.get("url") or obj.get("fileUrl") or obj.get("playUrl") or obj.get("downloadUrl") or obj.get("link") or obj.get("ossPath")
            suffix = obj.get("suffix") or obj.get("ext") or obj.get("extension") or obj.get("fileExt")
            file_type = obj.get("fileType") or obj.get("type")
            path = obj.get("path") or obj.get("filePath")
            paths = obj.get("paths")
            directory = ""
            if isinstance(paths, list):
                directory = "/".join([str(p) for p in paths if p])
            elif isinstance(paths, str):
                directory = paths

            if suffix:
                if isinstance(suffix, str) and suffix.startswith("."):
                    suffix_check = suffix.lower()
                else:
                    suffix_check = f".{str(suffix).lower()}"
                if suffix_check in AUDIO_EXTENSIONS:
                    add_item(name, url or path, suffix_check, directory)

            if is_audio_name(name):
                add_item(name, url or path, file_type, directory)

            for v in obj.values():
                walk(v)

        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(data)
    return results

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        list_requests = []
        def handle_request(request):
            if "/api/userFile/list" in request.url:
                try:
                    list_requests.append({
                        "url": request.url,
                        "post_data": request.post_data
                    })
                except Exception:
                    pass
        page.on("request", handle_request)
        
        print("Navigating to https://toolkit.diegodad.com/ ...")
        page.goto("https://toolkit.diegodad.com/", wait_until="domcontentloaded", timeout=60000)
        
        print("Waiting for login inputs...")
        
        try:
            page.wait_for_selector("input")
            
            inputs = page.locator("input").all()
            print(f"Found {len(inputs)} inputs.")
            
            phone_input = None
            password_input = None
            
            for inp in inputs:
                placeholder = inp.get_attribute("placeholder")
                type_attr = inp.get_attribute("type")
                print(f"Input: type={type_attr}, placeholder={placeholder}")
                
                if "手机" in str(placeholder) or "phone" in str(placeholder).lower() or type_attr == "tel":
                    phone_input = inp
                elif "密码" in str(placeholder) or "password" in str(placeholder).lower() or type_attr == "password":
                    password_input = inp
            
            if not phone_input and len(inputs) >= 2:
                phone_input = inputs[0]
            if not password_input and len(inputs) >= 2:
                password_input = inputs[1]

            if phone_input and password_input:
                print("Filling credentials...")
                phone = os.getenv("DIEGODAD_PHONE")
                password = os.getenv("DIEGODAD_PASSWORD")
                if not phone or not password:
                    raise SystemExit("Missing DIEGODAD_PHONE or DIEGODAD_PASSWORD in environment variables.")
                phone_input.fill(phone)
                password_input.fill(password)

                checkbox = page.locator("input[type='checkbox']")
                if checkbox.count() > 0:
                    try:
                        if not checkbox.first.is_checked():
                            checkbox.first.click()
                    except:
                        checkbox.first.click()
                else:
                    consent_text = page.locator("text=《用户注册协议》")
                    if consent_text.count() > 0:
                        consent_text.first.click()
                print("Scanning for buttons...")
                buttons = page.locator("button, input[type='submit'], .el-button, div[role='button']").all()
                clicked = False
                for btn in buttons:
                    text = btn.text_content() or btn.get_attribute("value") or "No Text"
                    normalized = re.sub(r"\s+", "", text)
                    print(f"Button candidate: text='{text}', class='{btn.get_attribute('class')}'")
                    
                    if "登录" in normalized or "Login" in text:
                        print(f"Found login button: {text}")
                        clicked = True
                        btn.click()
                        break
                if not clicked:
                    print("No explicit login button found in candidates.")
                
                try:
                    page.wait_for_function("() => !window.location.href.includes('/login')", timeout=8000)
                except:
                    print("URL didn't change to /dashboard, checking page content...")
                
                time.sleep(5)
                
                print(f"Current URL: {page.url}")
                print(f"Page Title: {page.title()}")
                
                page.screenshot(path="login_result.png")

                token = page.evaluate("() => localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('Authorization')")
                print(f"Token present: {bool(token)}")

                async_code = """
                async (token) => {
                    const headers = {};
                    if (token) {
                        headers['token'] = token;
                        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                    }
                    const endpoints = [
                        { url: '/client/api/userFile/dirTree', method: 'GET' },
                        { url: '/client/api/userFile/list', method: 'GET' },
                        { url: '/client/api/userFile/list?parentId=0', method: 'GET' },
                        { url: '/client/api/userFile/list?dirId=0', method: 'GET' },
                        { url: '/client/api/userFile/list?parent_id=0', method: 'GET' }
                    ];
                    const results = [];
                    for (const ep of endpoints) {
                        try {
                            const res = await fetch(ep.url, { method: ep.method, credentials: 'include', headers });
                            const text = await res.text();
                            results.push({ url: ep.url, status: res.status, text });
                        } catch (e) {
                            results.push({ url: ep.url, status: 0, text: String(e) });
                        }
                    }
                    return results;
                }
                """

                api_results = page.evaluate(async_code, token)
                raw_payloads = []
                for item in api_results:
                    print(f"API {item['url']} status {item['status']}")
                    raw_payloads.append(item)

                if list_requests:
                    print(f"Captured list requests: {len(list_requests)}")
                    for req in list_requests[:5]:
                        print(req)

                video_links = []
                audio_links = []
                for payload in raw_payloads:
                    try:
                        parsed = json.loads(payload["text"])
                    except Exception:
                        continue
                    video_links.extend(extract_video_links(parsed))
                    audio_links.extend(extract_audio_links(parsed))

                if len(video_links) == 0:
                    for payload in raw_payloads:
                        if "dirTree" in payload["url"]:
                            print("dirTree payload preview:")
                            print(payload["text"][:2000])

                dir_tree_nodes = []
                for payload in raw_payloads:
                    if "dirTree" in payload["url"]:
                        try:
                            parsed = json.loads(payload["text"])
                            if isinstance(parsed, list):
                                dir_tree_nodes.extend(parsed)
                        except Exception:
                            pass

                if dir_tree_nodes:
                    post_code = """
                    async ({ token, payload }) => {
                        const headers = { 'Content-Type': 'application/json' };
                        if (token) {
                            headers['token'] = token;
                            headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                        }
                        const res = await fetch('/client/api/userFile/list', {
                            method: 'POST',
                            credentials: 'include',
                            headers,
                            body: JSON.stringify(payload)
                        });
                        const text = await res.text();
                        return { status: res.status, text };
                    }
                    """

                    def gather_candidates(nodes):
                        items = []
                        stack = list(nodes)
                        while stack:
                            node = stack.pop()
                            if isinstance(node, dict):
                                items.append(node)
                                children = node.get("children")
                                if isinstance(children, list):
                                    stack.extend(children)
                        return items

                    candidates = gather_candidates(dir_tree_nodes)
                    list_payloads = []
                    for node in candidates:
                        tree_code = node.get("treeCode")
                        file_id = node.get("fileId")
                        if tree_code:
                            list_payloads.append({"treeCode": tree_code})
                            list_payloads.append({"parentTreeCode": tree_code})
                        if file_id:
                            list_payloads.append({"fileId": file_id})
                            list_payloads.append({"parentId": file_id})

                    list_results = []
                    for payload in list_payloads[:200]:
                        result = page.evaluate(post_code, {"token": token, "payload": payload})
                        result["payload"] = payload
                        list_results.append(result)

                    for result in list_results:
                        if result.get("status") == 200:
                            preview = result.get("text", "")[:1000]
                            print("List response preview:", preview)
                        try:
                            parsed = json.loads(result["text"])
                        except Exception:
                            continue
                        if isinstance(parsed, dict) and "data" in parsed and isinstance(parsed["data"], list) and parsed["data"]:
                            sample = parsed["data"][0]
                            print("Sample list item keys:", list(sample.keys()))
                            print("Sample list item:", sample)
                        video_links.extend(extract_video_links(parsed))
                        audio_links.extend(extract_audio_links(parsed))

                for link in video_links:
                    if link["url"] and not link["url"].startswith("http"):
                        link["url"] = "https://toolkit.diegodad.com" + link["url"]

                csv_path = "video_links.csv"
                with open(csv_path, "w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=["directory", "name", "url", "extra"])
                    writer.writeheader()
                    for row in video_links:
                        writer.writerow(row)

                print(f"Saved {len(video_links)} video links to {csv_path}")

                audio_csv_path = "audio_links.csv"
                with open(audio_csv_path, "w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=["directory", "name", "url", "extra"])
                    writer.writeheader()
                    for row in audio_links:
                        writer.writerow(row)

                print(f"Saved {len(audio_links)} audio links to {audio_csv_path}")
            else:
                print("Could not identify phone/password inputs.")
                
        except Exception as e:
            print(f"Error during login: {e}")
            page.screenshot(path="error.png")

        browser.close()

if __name__ == "__main__":
    run()
