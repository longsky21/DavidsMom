import requests
import os
import uuid
import hashlib
import random
import re
from dotenv import load_dotenv
from pathlib import Path
from PIL import Image
from io import BytesIO

# Load environment variables
load_dotenv()

# Define static root (assuming this file is in api/services/)
# Base project root is two levels up from api/services
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
STATIC_ROOT = PROJECT_ROOT / "public" / "static"
IMAGES_ROOT = STATIC_ROOT / "images" / "words"

def download_and_process_image(url: str, word: str) -> str:
    """
    Download image from URL, resize to 300x300, save as JPG in local static directory.
    Returns the relative URL path (e.g. /static/images/words/a/apple.jpg).
    """
    if not url:
        return ""
        
    try:
        # 1. Prepare directory
        clean_word = word.strip().lower()
        if not clean_word:
            return ""
            
        first_letter = clean_word[0]
        if not first_letter.isalpha():
            first_letter = "other"
            
        save_dir = IMAGES_ROOT / first_letter
        save_dir.mkdir(parents=True, exist_ok=True)
        
        # 2. Download image
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"Failed to download image: {response.status_code}")
            return ""
            
        # 3. Process image with Pillow
        img = Image.open(BytesIO(response.content))
        
        # Convert to RGB (in case of PNG/RGBA)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Resize to 300x300 (using LANCZOS for high quality downsampling)
        img = img.resize((300, 300), Image.Resampling.LANCZOS)
        
        # 4. Save file
        filename = f"{clean_word}.jpg"
        file_path = save_dir / filename
        
        # Save with quality optimization
        img.save(file_path, "JPEG", quality=85)
        
        # 5. Return URL path
        # URL should match the mount path in main.py: app.mount("/static", ...)
        return f"/static/images/words/{first_letter}/{filename}"
        
    except Exception as e:
        print(f"Error processing image for {word}: {e}")
        return ""

def get_audio_url(word: str, type_id: int = 2) -> str:
    """
    Get audio URL from Youdao Dict.
    type_id: 1 for UK, 2 for US
    """
    return f"http://dict.youdao.com/dictvoice?audio={word}&type={type_id}"

def format_meaning_text(text: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return ""

    pos_patterns = [
        "adj.comb",
        "adj",
        "adv",
        "prep",
        "pron",
        "conj",
        "int",
        "num",
        "art",
        "aux",
        "modal",
        "comb",
        "vt",
        "vi",
        "v",
        "n"
    ]
    escaped_patterns = [re.escape(p) for p in pos_patterns]
    pos_regex = re.compile(rf"(?im)(?:(?<=^)|(?<=[\s;；]))((?:{'|'.join(escaped_patterns)}))\.?")
    split_parts = pos_regex.split(raw)

    def truncate_content(value: str, limit: int = 20) -> str:
        content = value.strip()
        if len(content) <= limit:
            return content.rstrip(" ,，。；;、.:：!?！？")
        boundary_chars = set(" ,，。；;、.:：!?！？\t\n")
        cut_index = None
        for idx in range(limit, len(content)):
            if content[idx] in boundary_chars:
                cut_index = idx
                break
        if cut_index is None:
            truncated = content[:limit]
        else:
            truncated = content[:cut_index]
        return truncated.rstrip(" ,，。；;、.:：!?！？")

    if len(split_parts) < 3:
        return truncate_content(raw)

    parts = []
    for idx in range(1, len(split_parts), 2):
        pos_token = split_parts[idx]
        content = split_parts[idx + 1] if idx + 1 < len(split_parts) else ""
        if not content:
            continue
        content = content.strip()
        content = content.lstrip(" ;；")
        content = truncate_content(content)
        if not content:
            continue
        parts.append(f"{pos_token.lower()}. {content}".strip())

    if not parts:
        return truncate_content(raw)
    return "\n".join(parts)

def fetch_youdao_info(word: str) -> dict:
    """
    Fetch word info (phonetics, meaning, example) from Youdao Dictionary API (XML/JSON)
    """
    info = {
        "word": word,
        "phonetic_us": "",
        "phonetic_uk": "",
        "meaning": "",
        "example": "",
        "audio_us_url": get_audio_url(word, 2),
        "audio_uk_url": get_audio_url(word, 1)
    }
    
    try:
        # Use Youdao JSON API (Mobile version often provides JSON)
        # Or standard XML API: http://dict.youdao.com/suggest?q={word}&num=1&doctype=json
        # Better JSON API: http://dict.youdao.com/jsonapi?q={word}
        
        url = f"http://dict.youdao.com/jsonapi?q={word.lower()}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for return-phrase to get correct casing (e.g. "january" -> "January")
            # If "simple" or "ec" not found, word likely doesn't exist
            if "simple" in data and "word" in data["simple"]:
                simple = data["simple"]["word"][0]
                if "return-phrase" in simple:
                    info["word"] = simple["return-phrase"] # Use canonical form
                
                if "ukphone" in simple:
                    info["phonetic_uk"] = f"/{simple['ukphone']}/"
                if "usphone" in simple:
                    info["phonetic_us"] = f"/{simple['usphone']}/"
            
            elif "ec" in data and "word" in data["ec"]:
                # Fallback if simple dict not present but EC exists
                ec = data["ec"]["word"][0]
                if "return-phrase" in ec:
                    info["word"] = ec["return-phrase"]
            else:
                # No dictionary entry found
                return None

            if "ec" in data and "word" in data["ec"]:
                ec = data["ec"]["word"][0]
                # Meaning
                if "trs" in ec:
                    meanings = []
                    for tr in ec["trs"]:
                         if "tr" in tr and len(tr["tr"]) > 0 and "l" in tr["tr"][0]:
                             meanings.append(tr["tr"][0]["l"]["i"][0])
                    info["meaning"] = "; ".join(meanings)
                
                # Phonetics fallback
                if not info["phonetic_uk"] and "ukphone" in ec:
                    info["phonetic_uk"] = f"/{ec['ukphone']}/"
                if not info["phonetic_us"] and "usphone" in ec:
                    info["phonetic_us"] = f"/{ec['usphone']}/"

            # Example sentences (blng_sents_part)
            if "blng_sents_part" in data and "sentence-pair" in data["blng_sents_part"]:
                pairs = data["blng_sents_part"]["sentence-pair"]
                if len(pairs) > 0:
                    info["example"] = pairs[0]["sentence"]
                    # pairs[0]["sentence-translation"] is the CN translation
            
            # Image (pic_dict)
            if "pic_dict" in data and "pic" in data["pic_dict"]:
                pics = data["pic_dict"]["pic"]
                if len(pics) > 0 and "image" in pics[0]:
                    info["image_url"] = pics[0]["image"]

    except Exception as e:
        print(f"Error fetching Youdao info: {e}")
        
    return info

def get_word_suggestions(prefix: str):
    """
    Get word suggestions from Youdao Suggest API
    """
    try:
        url = f"http://dict.youdao.com/suggest?q={prefix}&num=5&doctype=json"
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            data = response.json()
            if "data" in data and "entries" in data["data"]:
                return [entry["entry"] for entry in data["data"]["entries"]]
    except Exception as e:
        print(f"Error fetching suggestions: {e}")
    return []

async def fetch_word_info(word: str):
    # 1. Fetch all text info from Youdao
    info = fetch_youdao_info(word)
    
    if info and info.get("meaning"):
        info["meaning"] = format_meaning_text(info["meaning"])

    # 2. Image Generation (Fallback to DashScope if Youdao has no image)
    if not info.get("image_url"):
        print(f"No image found for {word}, generating with DashScope...")
        img_url = get_dashscope_image(word)
        if img_url:
            # Download and save locally
            local_url = download_and_process_image(img_url, word)
            if local_url:
                info["image_url"] = local_url
            else:
                # Fallback to remote URL if download fails (though likely won't last long)
                info["image_url"] = img_url
    
    return info

def get_dashscope_image(word: str) -> str:
    """
    Generate image using DashScope (Wanx)
    """
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        print("DASHSCOPE_API_KEY not found")
        return ""
        
    import dashscope
    from dashscope import ImageSynthesis
    
    dashscope.api_key = api_key
    prompt = f"cartoon illustration of {word}, cute, simple, for children learning english"
    
    try:
        # Wanx supports 1024*1024, 720*1280, 1280*720
        # It does not support 300x300, so we keep 1024x1024 which is the standard square size
        rsp = ImageSynthesis.call(model=ImageSynthesis.Models.wanx_v1,
                                  prompt=prompt,
                                  n=1,
                                  size='1024*1024')
        
        if rsp.status_code == 200:
            if rsp.output and rsp.output.results:
                return rsp.output.results[0].url
        else:
            print(f"DashScope API error: {rsp.code} - {rsp.message}")
    except Exception as e:
        print(f"Error generating image with DashScope: {e}")
        
    return ""
