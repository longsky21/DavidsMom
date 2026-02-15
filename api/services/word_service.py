import requests
import os
import uuid
import hashlib
import random
import re
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import text
from io import BytesIO

# Load environment variables
load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOADS_DIR = PROJECT_ROOT / "uploads" / "dictionarydata" / "images"
STATIC_WORD_IMAGES_DIR = PROJECT_ROOT / "public" / "static" / "images" / "words"

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
    
    # 2. Image Generation (Fallback to SiliconFlow if Youdao has no image)
    if not info.get("image_url"):
        img_url = get_siliconflow_image(word)
        if img_url:
            # Download and save locally
            local_url = download_and_process_image(img_url, word)
            if local_url:
                info["image_url"] = local_url
            else:
                # Fallback to remote URL if download fails (though likely won't last long)
                info["image_url"] = img_url
    
    return info


def ensure_word_ext(
    *,
    dict_db,
    vc_id: str,
    word: str,
):
    expected_db = os.getenv("DICT_DB_NAME") or os.getenv("DICTIONARY_DB_NAME") or "dictionarydata"
    try:
        actual_db = dict_db.get_bind().url.database
    except Exception:
        actual_db = None
    if actual_db != expected_db:
        raise RuntimeError(f"ensure_word_ext must use database '{expected_db}', got '{actual_db}'")

    row = dict_db.execute(
        text(
            """
            SELECT image_url, audio_uk_url, audio_us_url, example, youdao_translation
            FROM word_ext
            WHERE vc_id = :vc_id
            """
        ),
        {"vc_id": vc_id},
    ).mappings().first()

    existing = dict(row) if row else {}

    need_audio_us = not existing.get("audio_us_url")
    need_audio_uk = not existing.get("audio_uk_url")
    need_example = not existing.get("example")
    need_image = not existing.get("image_url")
    need_youdao_translation = not existing.get("youdao_translation")

    if not (need_audio_us or need_audio_uk or need_example or need_image or need_youdao_translation):
        return {
            "image_url": existing.get("image_url"),
            "audio_uk_url": existing.get("audio_uk_url"),
            "audio_us_url": existing.get("audio_us_url"),
            "example": existing.get("example"),
            "youdao_translation": existing.get("youdao_translation"),
        }

    youdao = fetch_youdao_info(word) or {}

    image_url = existing.get("image_url")
    if not image_url:
        image_url = youdao.get("image_url") or ""
        if not image_url:
            siliconflow_url = get_siliconflow_image(word)
            if siliconflow_url:
                local = _download_and_resize_word_image(word, siliconflow_url)
                if local:
                    image_url = local

    audio_us_url = existing.get("audio_us_url") or youdao.get("audio_us_url") or ""
    audio_uk_url = existing.get("audio_uk_url") or youdao.get("audio_uk_url") or ""
    example = existing.get("example") or youdao.get("example") or ""
    youdao_translation = existing.get("youdao_translation") or youdao.get("meaning") or ""

    dict_db.execute(
        text(
            """
            INSERT INTO word_ext (vc_id, image_url, audio_uk_url, audio_us_url, example, youdao_translation)
            VALUES (:vc_id, :image_url, :audio_uk_url, :audio_us_url, :example, :youdao_translation)
            ON DUPLICATE KEY UPDATE
                image_url = VALUES(image_url),
                audio_uk_url = VALUES(audio_uk_url),
                audio_us_url = VALUES(audio_us_url),
                example = VALUES(example),
                youdao_translation = VALUES(youdao_translation)
            """
        ),
        {
            "vc_id": vc_id,
            "image_url": image_url or None,
            "audio_uk_url": audio_uk_url or None,
            "audio_us_url": audio_us_url or None,
            "example": example or None,
            "youdao_translation": youdao_translation or None,
        },
    )
    dict_db.commit()

    return {
        "image_url": image_url or None,
        "audio_uk_url": audio_uk_url or None,
        "audio_us_url": audio_us_url or None,
        "example": example or None,
        "youdao_translation": youdao_translation or None,
    }


def _safe_word_filename(word: str) -> str:
    w = (word or "").strip()
    if not w:
        return ""
    w = w.replace("/", "_").replace("\\", "_").replace("\x00", "_")
    w = w.replace("..", ".")
    return w


def _download_and_resize_word_image(word: str, url: str) -> str:
    try:
        safe_word = _safe_word_filename(word)
        if not safe_word:
            return ""
        first = safe_word[0].lower()
        if not ("a" <= first <= "z"):
            first = "other"
        target_dir = STATIC_WORD_IMAGES_DIR / first
        target_dir.mkdir(parents=True, exist_ok=True)

        resp = requests.get(url, timeout=20)
        if resp.status_code >= 400:
            return ""
        from PIL import Image

        img = Image.open(BytesIO(resp.content)).convert("RGB")
        img = img.resize((300, 300))
        file_path = target_dir / f"{safe_word}.jpg"
        img.save(file_path, format="JPEG", quality=85, optimize=True)
        return f"/static/images/words/{first}/{safe_word}.jpg"
    except Exception:
        return ""

def get_siliconflow_image(word: str) -> str:
    api_key = os.getenv("SILICONFLOW_API_KEY")
    if not api_key:
        print("SILICONFLOW_API_KEY not found")
        return ""

    prompt = (
        "cartoon style, 1:1 square image, single clear subject that directly represents "
        f"the meaning of the English word '{word}', minimal elements, clean background, "
        "high visual clarity, easy to recognize, educational for children"
    )

    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        payload = {
            "model": "Kwai-Kolors/Kolors",
            "prompt": prompt,
            "image_size": "1024x1024",
            "batch_size": 1,
            "response_format": "url",
        }
        resp = requests.post("https://api.siliconflow.cn/v1/images/generations", headers=headers, json=payload, timeout=30)
        if resp.status_code != 200:
            print(f"SiliconFlow API error: {resp.status_code} - {resp.text}")
            return ""
        data = resp.json()
        if isinstance(data, dict):
            if "images" in data and data["images"]:
                item = data["images"][0]
                if isinstance(item, dict) and item.get("url"):
                    return item["url"]
            if "data" in data and data["data"]:
                item = data["data"][0]
                if isinstance(item, dict) and item.get("url"):
                    return item["url"]
    except Exception as e:
        print(f"Error generating image with SiliconFlow: {e}")
        
    return ""
