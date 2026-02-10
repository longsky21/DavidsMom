import requests
import os
import edge_tts
import asyncio
import uuid
import hashlib
import random
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Define static audio directory relative to this file
# api/services/word_service.py -> public/static/audio
STATIC_AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "static", "audio")
if not os.path.exists(STATIC_AUDIO_DIR):
    os.makedirs(STATIC_AUDIO_DIR)

async def generate_audio(word: str, voice: str = "en-US-AriaNeural") -> str:
    """
    Generate TTS audio using edge-tts and save to static folder.
    Returns the relative URL.
    """
    try:
        # Sanitize filename
        safe_word = "".join([c for c in word if c.isalpha() or c.isdigit()]).lower()
        filename = f"{safe_word}_{voice.split('-')[1]}.mp3"
        filepath = os.path.join(STATIC_AUDIO_DIR, filename)
        
        # Check if exists to avoid regenerating
        if not os.path.exists(filepath):
            communicate = edge_tts.Communicate(word, voice)
            await communicate.save(filepath)
            
        return f"/static/audio/{filename}"
    except Exception as e:
        print(f"Error generating audio: {e}")
        return ""

def fetch_baidu_translation(word: str) -> str:
    """
    Fetch Chinese meaning from Baidu Translate API.
    """
    appid = os.getenv("BAIDU_APP_ID")
    secret_key = os.getenv("BAIDU_SECRET_KEY")
    
    if not appid or not secret_key:
        print("Baidu API credentials missing")
        return ""

    endpoint = "http://api.fanyi.baidu.com/api/trans/vip/translate"
    salt = str(random.randint(32768, 65536))
    sign_str = appid + word + salt + secret_key
    sign = hashlib.md5(sign_str.encode("utf-8")).hexdigest()
    
    params = {
        "q": word,
        "from": "en",
        "to": "zh",
        "appid": appid,
        "salt": salt,
        "sign": sign
    }
    
    try:
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        response = requests.post(endpoint, data=params, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "error_code" in data:
                print(f"Baidu API Error: {data['error_code']} - {data.get('error_msg')}")
                return ""
            
            if "trans_result" in data and len(data["trans_result"]) > 0:
                return data["trans_result"][0]["dst"]
    except Exception as e:
        print(f"Error fetching Baidu translation: {e}")
    
    return ""

def fetch_youdao_meaning(word: str) -> str:
    """
    Fallback: Fetch Chinese meaning from Youdao Suggest API.
    """
    try:
        url = f"http://dict.youdao.com/suggest?num=1&doctype=json&q={word}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "entries" in data and len(data["entries"]) > 0:
                entry = data["entries"][0]
                return entry.get("explain", "")
    except Exception as e:
        print(f"Error fetching Youdao translation: {e}")
    return ""

def get_pollinations_image(word: str) -> str:
    """
    Get image URL from Pollinations.ai
    """
    prompt = f"cartoon illustration of {word}, cute, simple, for children learning english"
    return f"https://image.pollinations.ai/prompt/{prompt}?width=240&height=240&nologo=true"

async def fetch_word_info(word: str):
    info = {
        "word": word,
        "phonetic_us": "",
        "phonetic_uk": "",
        "meaning": "",
        "example": "",
        "audio_us_url": "",
        "audio_uk_url": "",
        "image_url": ""
    }
    
    # 1. Fetch from DictionaryAPI.dev (for Phonetics & Example)
    try:
        response = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}", timeout=5)
        if response.status_code == 200:
            data = response.json()[0]
            
            # Phonetics
            for phon in data.get("phonetics", []):
                audio = phon.get("audio", "")
                text = phon.get("text", "")
                
                if "us" in audio:
                    if not info["phonetic_us"]:
                        info["phonetic_us"] = text
                    if not info["audio_us_url"]:
                        info["audio_us_url"] = audio
                
                if "uk" in audio:
                    if not info["phonetic_uk"]:
                        info["phonetic_uk"] = text
                    if not info["audio_uk_url"]:
                        info["audio_uk_url"] = audio

                if not info["phonetic_us"] and text:
                    info["phonetic_us"] = text
            
            # Example
            if data.get("meanings"):
                first = data["meanings"][0]
                if first.get("definitions"):
                    info["example"] = first["definitions"][0].get("example", "")
    except Exception as e:
        print(f"DictionaryAPI error: {e}")

    # 2. Fetch Chinese Meaning (Override English meaning or fill if empty)
    # Use Baidu Translate first, fallback to Youdao
    cn_meaning = fetch_baidu_translation(word)
    if not cn_meaning:
        cn_meaning = fetch_youdao_meaning(word)
        
    if cn_meaning:
        info["meaning"] = cn_meaning
    elif not info["meaning"]:
        # Fallback to DictionaryAPI meaning if no Chinese
        if 'data' in locals() and data.get("meanings"):
             info["meaning"] = data["meanings"][0]["definitions"][0].get("definition", "")

    # 3. Generate Audio (Local) using edge-tts
    # Only if DictionaryAPI didn't provide it
    if not info["audio_us_url"]:
        info["audio_us_url"] = await generate_audio(word, "en-US-AriaNeural")
        
    if not info["audio_uk_url"]:
        info["audio_uk_url"] = await generate_audio(word, "en-GB-SoniaNeural")
    
    # 4. Image
    info["image_url"] = get_pollinations_image(word)
    
    return info
