import whisper
import os
from datetime import timedelta

# 使用全局变量缓存模型，避免每次请求重新加载
_model = None

def get_model():
    global _model
    if _model is None:
        # 可选模型: tiny, base, small, medium, large
        # base 模型在速度和准确度上是很好的平衡
        print("Loading Whisper model...")
        _model = whisper.load_model("base")
    return _model

def format_timestamp(seconds: float) -> str:
    """将秒数转换为 SRT 时间戳格式 (HH:MM:SS,mmm)"""
    td = timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    millis = int(td.microseconds / 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def transcribe_audio(file_path: str) -> str:
    """转录音频文件并返回 SRT 格式字符串"""
    model = get_model()
    
    # 调用 Whisper 进行转录
    result = model.transcribe(file_path)
    
    srt_output = []
    for i, segment in enumerate(result["segments"], start=1):
        start = format_timestamp(segment["start"])
        end = format_timestamp(segment["end"])
        text = segment["text"].strip()
        
        srt_output.append(f"{i}\n{start} --> {end}\n{text}\n")
        
    return "\n".join(srt_output)
