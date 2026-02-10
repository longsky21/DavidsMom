import requests
import os

def fetch_word_info(word: str):
    """
    Fetch word information from external APIs.
    Priority: 
    1. DictionaryAPI.dev (Free, English definitions, Audio)
    2. Fallback to placeholder for Chinese meaning if not using a real Translation API key.
    """
    info = {
        "word": word,
        "phonetic_us": "",
        "phonetic_uk": "",
        "meaning": "",
        "example": "",
        "audio_us_url": "",
        "audio_uk_url": ""
    }
    
    try:
        # 1. Fetch from DictionaryAPI.dev
        response = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}")
        if response.status_code == 200:
            data = response.json()[0]
            
            # Phonetics
            for phon in data.get("phonetics", []):
                if "us" in phon.get("audio", ""):
                    info["audio_us_url"] = phon.get("audio")
                    info["phonetic_us"] = phon.get("text", "")
                elif "uk" in phon.get("audio", ""):
                    info["audio_uk_url"] = phon.get("audio")
                    info["phonetic_uk"] = phon.get("text", "")
                
                # Fallback if specific accent not found
                if not info["phonetic_us"] and phon.get("text"):
                    info["phonetic_us"] = phon.get("text")
                if not info["audio_us_url"] and phon.get("audio"):
                    info["audio_us_url"] = phon.get("audio")

            # Meanings
            if data.get("meanings"):
                # Get first definition
                first_meaning = data["meanings"][0]
                if first_meaning.get("definitions"):
                    info["meaning"] = first_meaning["definitions"][0].get("definition", "")
                    info["example"] = first_meaning["definitions"][0].get("example", "")
                
                # Try to get translation if possible (Mocking translation for now as we don't have a key)
                # In a real scenario with Youdao Key, we would call Youdao API here.
                # info["meaning"] = call_youdao_api(word)
                pass

    except Exception as e:
        print(f"Error fetching word info: {e}")
        
    return info
