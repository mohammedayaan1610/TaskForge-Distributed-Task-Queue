import time
import os
import subprocess
import re
from pathlib import Path
from datetime import datetime

FORMAT_CODECS = {
    "mp3": "libmp3lame",
    "wav": "pcm_s16le",
    "aac": "aac",
    "m4a": "aac",
    "flac": "flac",
    "ogg": "libvorbis"
}

def sanitize_filename(filename: str) -> str:
    """Keep only alphanumeric characters, dots, underscores, and dashes."""
    return re.sub(r'[^a-zA-Z0-9.\-_]', '_', filename)

def audio_convert(task):
    print(f"[{task.id}] Task received. Validating input...")
    
    if not task.target_format:
        raise Exception("Target format is missing.")
        
    target_format = task.target_format.lower()
    if target_format not in FORMAT_CODECS:
        raise Exception(f"Unsupported target format: {target_format}. Supported formats: {list(FORMAT_CODECS.keys())}")
        
    codec = FORMAT_CODECS[target_format]
    
    # Setup paths
    converted_dir = Path("converted")
    converted_dir.mkdir(exist_ok=True)
    
    uploads_dir = Path("uploads")
    
    if not task.original_filename:
        raise Exception("Original filename is missing.")
        
    # Keep the task ID based extension from the original upload flow
    _, ext = os.path.splitext(task.original_filename)
    input_filename = f"{task.id}{ext}"
    input_path = uploads_dir / input_filename
    
    if not input_path.exists():
        raise Exception(f"Uploaded file not found: {input_filename}")
        
    # Sanitize output filename
    base_name = os.path.splitext(task.original_filename)[0]
    safe_base_name = sanitize_filename(base_name)
    output_filename = f"{safe_base_name}.{target_format}"
    output_path = converted_dir / f"{task.id}.{target_format}"
    
    print(f"[{task.id}] Detected audio format, preparing conversion...")
    print(f"[{task.id}] Converting {input_path} to {output_path} (codec: {codec})")
    
    start_time = datetime.now()
    
    try:
        # -map 0:a:0 selects the first audio stream, ignoring embedded artwork/video (-vn)
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", str(input_path), "-map", "0:a:0", "-vn", "-c:a", codec, str(output_path)],
            check=True,
            capture_output=True,
            text=True
        )
    except subprocess.CalledProcessError as e:
        error_msg = f"FFmpeg stderr:\n{e.stderr}"
        print(f"[{task.id}] Conversion failed\n{error_msg}")
        raise Exception(error_msg)
        
    end_time = datetime.now()
    duration = int((end_time - start_time).total_seconds())
    
    if not output_path.exists():
        raise Exception("Conversion completed but output file is missing.")
        
    output_size = output_path.stat().st_size
    
    print(f"[{task.id}] Conversion successful in {duration}s. Size: {output_size} bytes.")
    
    task.output_filename = output_filename
    task.output_path = str(output_path)
    task.output_size_bytes = output_size
    task.conversion_duration = duration
    
    # Cleanup original file
    try:
        input_path.unlink()
        print(f"[{task.id}] Cleaned up temporary upload file.")
    except Exception as e:
        print(f"[{task.id}] Warning: Could not delete upload file: {e}")
        
    return f"Successfully converted to {target_format}"

TASK_HANDLERS = {
    "audio_convert": audio_convert
}