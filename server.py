import asyncio
import base64
import json
import os
import shutil
import subprocess
import sys
import time
import uuid
import webbrowser
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen

import edge_tts


ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "generated"
EXPORT_DIR = ROOT / "导出音频"
HOST = "127.0.0.1"
PORT = 8765
MAX_TEXT_LENGTH = 10000
MAX_CLONE_TEXT_LENGTH = 1000
MAX_CLONE_SAMPLE_SIZE = 50 * 1024 * 1024
MAX_MIMO_BASE64_SIZE = 10 * 1024 * 1024
MAX_FILE_AGE = 24 * 60 * 60
CONFIG_FILE = ROOT / "config.local.json"
CLONE_CONFIG_FILE = ROOT / "clone-config.local.json"
CLONE_INSTALL_STATUS = ROOT / "clone-install-status.json"
CLONE_INSTALLER = ROOT / "clone_installer.py"
AZURE_XIAOCHEN = "zh-CN-XiaochenNeural"
AZURE_XIAOCHEN_HD = "zh-CN-Xiaochen:DragonHDLatestNeural"
AZURE_XIAOCHEN_FLASH = "zh-CN-Xiaochen:DragonHDFlashLatestNeural"
AZURE_VOICES = {AZURE_XIAOCHEN, AZURE_XIAOCHEN_HD, AZURE_XIAOCHEN_FLASH}
FLASH_REGIONS = {"eastus", "westeurope", "southeastasia"}
FLASH_STYLES = {
    "default",
    "cheerful",
    "debating",
    "empathetic",
    "live-commercial",
    "poetry-reading",
    "sad",
    "sorry",
}


def cleanup_old_files():
    OUTPUT_DIR.mkdir(exist_ok=True)
    EXPORT_DIR.mkdir(exist_ok=True)
    cutoff = time.time() - MAX_FILE_AGE
    for path in OUTPUT_DIR.glob("*.mp3"):
        try:
            if path.stat().st_mtime < cutoff:
                path.unlink()
        except OSError:
            pass


def chinese_voices():
    voices = asyncio.run(edge_tts.list_voices())
    return [
        {
            "name": voice["ShortName"],
            "displayName": voice["FriendlyName"],
            "gender": voice["Gender"],
            "locale": voice["Locale"],
        }
        for voice in voices
        if voice["Locale"].lower().startswith(("zh-cn", "zh-tw", "zh-hk"))
    ]

def load_config():
    config = {
        "azureKey": os.environ.get("AZURE_SPEECH_KEY", ""),
        "azureRegion": os.environ.get("AZURE_SPEECH_REGION", ""),
    }
    if CONFIG_FILE.is_file():
        try:
            saved = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
            config["azureKey"] = str(saved.get("azureKey", config["azureKey"])).strip()
            config["azureRegion"] = str(saved.get("azureRegion", config["azureRegion"])).strip()
        except (OSError, json.JSONDecodeError):
            pass
    return config


def save_config(azure_key, azure_region):
    CONFIG_FILE.write_text(
        json.dumps(
            {"azureKey": azure_key.strip(), "azureRegion": azure_region.strip()},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def load_clone_config():
    config = {"minimaxKey": "", "fishKey": "", "mimoKey": ""}
    if CLONE_CONFIG_FILE.is_file():
        try:
            saved = json.loads(CLONE_CONFIG_FILE.read_text(encoding="utf-8"))
            config["minimaxKey"] = str(saved.get("minimaxKey", "")).strip()
            config["fishKey"] = str(saved.get("fishKey", "")).strip()
            config["mimoKey"] = str(saved.get("mimoKey", "")).strip()
        except (OSError, json.JSONDecodeError):
            pass
    return config


def save_clone_config(config):
    CLONE_CONFIG_FILE.write_text(
        json.dumps(config, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def read_clone_install_status():
    if (ROOT / ".clone-venv" / "Scripts" / "python.exe").is_file() and (
        ROOT / "models" / "Qwen3-TTS-12Hz-0.6B-Base"
    ).is_dir():
        return {
            "state": "installed",
            "step": "安装完成",
            "progress": 100,
            "message": "Qwen3-TTS 0.6B Base 已安装。",
        }
    if CLONE_INSTALL_STATUS.is_file():
        try:
            return json.loads(CLONE_INSTALL_STATUS.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pass
    return {
        "state": "not_installed",
        "step": "尚未安装",
        "progress": 0,
        "message": "点击安装后才会下载环境和模型。",
    }


def start_clone_install():
    status = read_clone_install_status()
    if status.get("state") in {"installing", "installed"}:
        return status
    if not CLONE_INSTALLER.is_file():
        raise RuntimeError("缺少本地模型安装程序。")
    flags = 0
    if os.name == "nt":
        flags = subprocess.CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS
    subprocess.Popen(
        [sys.executable, str(CLONE_INSTALLER)],
        cwd=str(ROOT),
        creationflags=flags,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(0.3)
    return read_clone_install_status()


def validate_minimax_key(key):
    request = Request(
        "https://api.minimaxi.com/v1/get_voice",
        data=json.dumps({"voice_type": "all"}).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=25) as response:
            result = json.loads(response.read().decode("utf-8"))
        base = result.get("base_resp", {})
        if base.get("status_code") != 0:
            message = str(base.get("status_msg", ""))
            if "login fail" in message.lower() or "secret key" in message.lower():
                raise RuntimeError("MiniMax API Key 无效或无权访问。")
            raise RuntimeError(message or "MiniMax 密钥验证失败。")
    except HTTPError as exc:
        raise RuntimeError("MiniMax API Key 无效或无权访问。") from exc
    except URLError as exc:
        raise RuntimeError("无法连接 MiniMax，请检查网络。") from exc


def validate_fish_key(key):
    request = Request(
        "https://api.fish.audio/wallet/self/api-credit",
        method="GET",
        headers={"Authorization": f"Bearer {key}"},
    )
    try:
        with urlopen(request, timeout=25) as response:
            result = json.loads(response.read().decode("utf-8"))
        return result.get("credit")
    except HTTPError as exc:
        raise RuntimeError("Fish Audio API Key 无效或无权访问。") from exc
    except URLError as exc:
        raise RuntimeError("无法连接 Fish Audio，请检查网络。") from exc


def validate_mimo_key(key):
    base_url = get_mimo_base_url(key)
    request = Request(
        f"{base_url}/models",
        method="GET",
        headers={"api-key": key},
    )
    try:
        with urlopen(request, timeout=25) as response:
            response.read()
    except HTTPError as exc:
        if exc.code in (401, 403):
            raise RuntimeError("MiMo API Key 无效或无权访问。") from exc
        raise RuntimeError(f"MiMo 密钥验证失败（HTTP {exc.code}）。") from exc
    except URLError as exc:
        raise RuntimeError("无法连接 MiMo，请检查网络。") from exc


def get_mimo_base_url(key):
    if key.startswith("tp-"):
        return "https://token-plan-cn.xiaomimimo.com/v1"
    return "https://api.xiaomimimo.com/v1"


def convert_clone_sample_to_wav(sample_bytes, sample_mime):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("缺少 FFmpeg，无法处理声音样本。")

    suffixes = {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/webm": ".webm",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a",
        "audio/aac": ".aac",
        "audio/ogg": ".ogg",
    }
    source_path = OUTPUT_DIR / f"clone-source-{uuid.uuid4().hex}{suffixes.get(sample_mime, '.audio')}"
    wav_path = OUTPUT_DIR / f"clone-sample-{uuid.uuid4().hex}.wav"
    source_path.write_bytes(sample_bytes)
    try:
        result = subprocess.run(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(source_path),
                "-vn",
                "-ac",
                "1",
                "-ar",
                "24000",
                "-c:a",
                "pcm_s16le",
                str(wav_path),
            ],
            capture_output=True,
            text=True,
            timeout=120,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        if result.returncode != 0 or not wav_path.is_file():
            raise RuntimeError("声音样本无法转换，请改用清晰的 MP3 或 WAV 文件。")
        wav_bytes = wav_path.read_bytes()
        encoded = base64.b64encode(wav_bytes).decode("ascii")
        if len(encoded) > MAX_MIMO_BASE64_SIZE:
            raise RuntimeError("转换后的声音样本超过 MiMo 的 10MB 限制，请缩短录音。")
        return encoded
    finally:
        source_path.unlink(missing_ok=True)
        wav_path.unlink(missing_ok=True)


def synthesize_mimo_clone(text, sample_bytes, sample_mime, output_path):
    config = load_clone_config()
    key = config["mimoKey"]
    if not key:
        raise RuntimeError("请先配置 MiMo API Key。")

    sample_base64 = convert_clone_sample_to_wav(sample_bytes, sample_mime)
    payload = {
        "model": "mimo-v2.5-tts-voiceclone",
        "messages": [
            {"role": "user", "content": ""},
            {"role": "assistant", "content": text},
        ],
        "audio": {
            "format": "wav",
            "voice": f"data:audio/wav;base64,{sample_base64}",
        },
    }
    request = Request(
        f"{get_mimo_base_url(key)}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "api-key": key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=240) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        message = ""
        try:
            error_result = json.loads(exc.read().decode("utf-8"))
            message = str(error_result.get("error", {}).get("message", "")).strip()
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
        if exc.code in (401, 403):
            raise RuntimeError("MiMo API Key 已失效，请重新配置。") from exc
        if exc.code == 429:
            raise RuntimeError("MiMo 请求过于频繁或额度不足，请稍后重试。") from exc
        raise RuntimeError(message or f"MiMo 生成失败（HTTP {exc.code}）。") from exc
    except URLError as exc:
        raise RuntimeError("无法连接 MiMo，请检查网络。") from exc

    try:
        audio_data = result["choices"][0]["message"]["audio"]["data"]
        wav_bytes = base64.b64decode(audio_data, validate=True)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise RuntimeError("MiMo 未返回有效的克隆音频。") from exc
    if len(wav_bytes) < 512:
        raise RuntimeError("MiMo 返回的克隆音频为空。")

    raw_path = OUTPUT_DIR / f"clone-raw-{uuid.uuid4().hex}.wav"
    raw_path.write_bytes(wav_bytes)
    try:
        process_audio(raw_path, output_path, 0, 0, 0)
    finally:
        raw_path.unlink(missing_ok=True)


def validate_azure_config(key, region):
    request = Request(
        f"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken",
        data=b"",
        method="POST",
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Length": "0",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            return bool(response.read())
    except HTTPError as exc:
        if exc.code in (401, 403):
            raise RuntimeError("密钥无效，或密钥与区域不匹配。") from exc
        raise RuntimeError(f"Azure 验证失败（HTTP {exc.code}）。") from exc
    except URLError as exc:
        raise RuntimeError("无法连接 Azure，请检查网络和区域名称。") from exc


def build_azure_ssml(text, voice, rate, pitch, volume, style="default"):
    escaped_text = escape(text)
    if voice == AZURE_XIAOCHEN_FLASH and style != "default":
        if style not in FLASH_STYLES:
            raise RuntimeError("不支持的晓辰 Flash 样式。")
        content = f'<mstts:express-as style="{style}">{escaped_text}</mstts:express-as>'
    else:
        content = escaped_text

    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">'
        f'<voice name="{escape(voice)}">{content}</voice></speak>'
    )


def synthesize_azure(
    text,
    voice,
    rate,
    pitch,
    volume,
    output_path,
    style="default",
    output_format="audio-48khz-192kbitrate-mono-mp3",
):
    config = load_config()
    key = config["azureKey"]
    region = config["azureRegion"]
    if not key or not region:
        raise RuntimeError("精确晓辰需要先配置 Azure Speech 密钥和区域。")
    if voice == AZURE_XIAOCHEN_FLASH and region not in FLASH_REGIONS:
        raise RuntimeError(
            "Xiaochen Dragon HD Flash Latest 仅支持 eastus、westeurope 或 southeastasia 区域。"
        )

    ssml = build_azure_ssml(text, voice, rate, pitch, volume, style).encode("utf-8")
    last_error = None
    for attempt in range(3):
        request = Request(
            f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
            data=ssml,
            method="POST",
            headers={
                "Ocp-Apim-Subscription-Key": key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": output_format,
                "User-Agent": "QingShengTTS",
            },
        )
        try:
            with urlopen(request, timeout=60) as response:
                audio = response.read()
                content_type = response.headers.get("Content-Type", "")
                if len(audio) >= 512 and content_type.startswith("audio/"):
                    output_path.write_bytes(audio)
                    return
                last_error = RuntimeError(
                    f"Azure 返回了空音频或无效格式（{len(audio)} 字节，{content_type or '无类型'}）。"
                )
        except HTTPError as exc:
            if exc.code in (401, 403):
                raise RuntimeError("Azure 密钥失效或区域不匹配，请重新配置。") from exc
            last_error = RuntimeError(f"Azure 生成失败（HTTP {exc.code}）。")
        except URLError:
            last_error = RuntimeError("无法连接 Azure 语音服务，请检查网络。")
        if attempt < 2:
            time.sleep(1.5 * (attempt + 1))
    raise last_error or RuntimeError("Azure 未返回有效音频。")


def process_audio(source_path, output_path, rate, pitch, volume, allow_passthrough=False):
    if allow_passthrough and rate == 0 and pitch == 0 and volume == 0:
        shutil.copyfile(source_path, output_path)
        return

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("缺少本地音频处理组件 FFmpeg，无法调节语速、音调和音量。")

    tempo = 1 + rate / 100
    pitch_scale = 1 + pitch / 100
    volume_scale = 1 + volume / 100
    filters = []
    if pitch != 0:
        filters.append(
            f"rubberband=pitch={pitch_scale:.4f}:"
            "formant=preserved:pitchq=quality"
        )
    if rate != 0:
        filters.append(f"atempo={tempo:.4f}")
    if volume != 0:
        filters.append(f"volume={volume_scale:.4f}")
    filters.append("aresample=48000:resampler=soxr:precision=28")
    result = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source_path),
            "-af",
            ",".join(filters),
            "-ar",
            "48000",
            "-ac",
            "1",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "192k",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        timeout=120,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    if result.returncode != 0 or not output_path.is_file():
        detail = result.stderr.strip().splitlines()
        message = detail[-1] if detail else "未知错误"
        raise RuntimeError(f"本地音频处理失败：{message}")


class TTSHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean_path = unquote(urlparse(path).path).lstrip("/")
        requested = (ROOT / clean_path).resolve()
        try:
            requested.relative_to(ROOT)
        except ValueError:
            return str(ROOT / "__blocked__")
        return str(requested)

    def send_json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/clone/config":
            config = load_clone_config()
            self.send_json(
                {
                    "minimaxConfigured": bool(config["minimaxKey"]),
                    "fishConfigured": bool(config["fishKey"]),
                    "mimoConfigured": bool(config["mimoKey"]),
                    "local": read_clone_install_status(),
                }
            )
            return

        if parsed.path == "/api/clone/install-status":
            self.send_json(read_clone_install_status())
            return

        if parsed.path == "/api/config":
            config = load_config()
            self.send_json(
                {
                    "azureConfigured": bool(config["azureKey"] and config["azureRegion"]),
                    "azureRegion": config["azureRegion"],
                }
            )
            return

        if parsed.path == "/api/voices":
            try:
                voices = chinese_voices()
                voices[0:0] = [
                    {
                        "name": AZURE_XIAOCHEN,
                        "displayName": "Microsoft Xiaochen - Chinese (Mandarin, Simplified)",
                        "gender": "Female",
                        "locale": "zh-CN",
                        "provider": "azure",
                        "model": "standard",
                    },
                    {
                        "name": AZURE_XIAOCHEN_HD,
                        "displayName": "Xiaochen Dragon HD Latest",
                        "gender": "Female",
                        "locale": "zh-CN",
                        "provider": "azure",
                        "model": "dragon-hd",
                    },
                    {
                        "name": AZURE_XIAOCHEN_FLASH,
                        "displayName": "Xiaochen Dragon HD Flash Latest",
                        "gender": "Female",
                        "locale": "zh-CN",
                        "provider": "azure",
                        "model": "dragon-hd-flash",
                    },
                ]
                self.send_json({"voices": voices})
            except Exception as exc:
                self.send_json({"error": f"获取音色失败：{exc}"}, 502)
            return

        if parsed.path.startswith(("/generated/", "/api/download/")):
            filename = Path(unquote(parsed.path)).name
            file_path = OUTPUT_DIR / filename
            if not file_path.is_file():
                self.send_error(404, "Audio not found")
                return
            download = parsed.path.startswith("/api/download/")
            file_size = file_path.stat().st_size
            start = 0
            end = file_size - 1
            range_header = self.headers.get("Range")
            if range_header and not download:
                try:
                    byte_range = range_header.removeprefix("bytes=").split("-", 1)
                    start = int(byte_range[0]) if byte_range[0] else 0
                    end = int(byte_range[1]) if byte_range[1] else end
                    end = min(end, file_size - 1)
                except ValueError:
                    self.send_error(416, "Invalid range")
                    return
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            else:
                self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            disposition = "attachment" if download else "inline"
            self.send_header("Content-Disposition", f'{disposition}; filename="{filename}"')
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            with file_path.open("rb") as audio_file:
                audio_file.seek(start)
                self.wfile.write(audio_file.read(end - start + 1))
            return

        if parsed.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/clone/install":
            try:
                self.send_json(start_clone_install())
            except RuntimeError as exc:
                self.send_json({"error": str(exc)}, 500)
            return

        if path == "/api/clone/generate":
            output_path = None
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 75 * 1024 * 1024:
                    self.send_json({"error": "克隆请求为空或文件过大。"}, 400)
                    return
                data = json.loads(self.rfile.read(length).decode("utf-8"))
                provider = str(data.get("provider", "")).strip()
                text = str(data.get("text", "")).strip()
                sample_mime = str(data.get("sampleMime", "")).strip().lower()
                sample_data = str(data.get("sampleBase64", "")).strip()
                consent = data.get("consent") is True

                if provider != "mimo":
                    self.send_json({"error": "当前只有 MiMo 已接入实际克隆生成。"}, 400)
                    return
                if not consent:
                    self.send_json({"error": "请先确认声音授权。"}, 400)
                    return
                if not text:
                    self.send_json({"error": "请输入试听文本。"}, 400)
                    return
                if len(text) > MAX_CLONE_TEXT_LENGTH:
                    self.send_json({"error": f"试听文本不能超过 {MAX_CLONE_TEXT_LENGTH} 个字符。"}, 400)
                    return
                try:
                    sample_bytes = base64.b64decode(sample_data, validate=True)
                except ValueError:
                    self.send_json({"error": "声音样本数据无效。"}, 400)
                    return
                if not sample_bytes or len(sample_bytes) > MAX_CLONE_SAMPLE_SIZE:
                    self.send_json({"error": "声音样本为空或超过 50MB。"}, 400)
                    return

                filename = f"clone-{uuid.uuid4().hex}.mp3"
                output_path = OUTPUT_DIR / filename
                synthesize_mimo_clone(text, sample_bytes, sample_mime, output_path)
                if not output_path.is_file() or output_path.stat().st_size < 512:
                    raise RuntimeError("克隆音频文件生成异常。")

                download_name = f"轻声-克隆音色-{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4]}.mp3"
                EXPORT_DIR.mkdir(exist_ok=True)
                shutil.copyfile(output_path, EXPORT_DIR / download_name)
                self.send_json(
                    {
                        "audioUrl": f"/generated/{filename}",
                        "downloadUrl": f"/api/download/{filename}",
                        "downloadName": download_name,
                        "savedTo": str(EXPORT_DIR / download_name),
                    }
                )
            except RuntimeError as exc:
                if output_path:
                    output_path.unlink(missing_ok=True)
                self.send_json({"error": str(exc)}, 502)
            except (OSError, ValueError, json.JSONDecodeError):
                if output_path:
                    output_path.unlink(missing_ok=True)
                self.send_json({"error": "克隆生成请求无效。"}, 400)
            return

        if path in {
            "/api/clone/provider-save",
            "/api/clone/provider-test",
            "/api/clone/provider-clear",
        }:
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
                provider = str(data.get("provider", "")).strip()
                config_keys = {
                    "minimax": "minimaxKey",
                    "fish": "fishKey",
                    "mimo": "mimoKey",
                }
                if provider not in config_keys:
                    self.send_json({"error": "不支持的克隆提供商。"}, 400)
                    return
                config = load_clone_config()
                config_key = config_keys[provider]

                if path == "/api/clone/provider-clear":
                    config[config_key] = ""
                    save_clone_config(config)
                    self.send_json({"ok": True, "configured": False})
                    return

                key = str(data.get("key", "")).strip() or config[config_key]
                if not key:
                    self.send_json({"error": "请输入 API Key。"}, 400)
                    return
                if provider == "minimax":
                    validate_minimax_key(key)
                    detail = "MiniMax 连接成功。"
                elif provider == "fish":
                    credit = validate_fish_key(key)
                    detail = (
                        f"Fish Audio 连接成功，余额：{credit}"
                        if credit is not None
                        else "Fish Audio 连接成功。"
                    )
                else:
                    validate_mimo_key(key)
                    detail = "MiMo 连接成功，可使用 V2.5 音色克隆模型。"

                if path == "/api/clone/provider-save":
                    config[config_key] = key
                    save_clone_config(config)
                self.send_json(
                    {
                        "ok": True,
                        "configured": path == "/api/clone/provider-save" or bool(config[config_key]),
                        "message": detail,
                    }
                )
            except RuntimeError as exc:
                self.send_json({"error": str(exc)}, 400)
            except (OSError, ValueError, json.JSONDecodeError):
                self.send_json({"error": "配置请求无效。"}, 400)
            return

        if path == "/api/open-output":
            try:
                EXPORT_DIR.mkdir(exist_ok=True)
                os.startfile(EXPORT_DIR)
                self.send_json({"ok": True})
            except OSError:
                self.send_json({"error": "无法打开音频文件夹。"}, 500)
            return

        if path == "/api/config":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length).decode("utf-8"))
                key = str(data.get("azureKey", "")).strip()
                region = str(data.get("azureRegion", "")).strip().lower()
                if not key or not region:
                    self.send_json({"error": "密钥和区域都不能为空。"}, 400)
                    return
                validate_azure_config(key, region)
                save_config(key, region)
                self.send_json({"ok": True, "azureConfigured": True, "azureRegion": region})
            except RuntimeError as exc:
                self.send_json({"error": str(exc)}, 400)
            except (OSError, ValueError, json.JSONDecodeError):
                self.send_json({"error": "保存配置失败，请检查输入。"}, 400)
            return

        if path != "/api/generate":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            text = str(data.get("text", "")).strip()
            voice = str(data.get("voice", "")).strip()
            rate = int(data.get("rate", 0))
            pitch = int(data.get("pitch", 0))
            volume = int(data.get("volume", 0))
            style = str(data.get("style", "default")).strip()

            if not text:
                self.send_json({"error": "请输入要转换的文字。"}, 400)
                return
            if len(text) > MAX_TEXT_LENGTH:
                self.send_json({"error": f"文字不能超过 {MAX_TEXT_LENGTH} 字。"}, 400)
                return
            if not voice:
                self.send_json({"error": "请选择音色。"}, 400)
                return
            if not -100 <= rate <= 100 or not -100 <= pitch <= 100 or not -100 <= volume <= 100:
                self.send_json({"error": "参数超出允许范围。"}, 400)
                return

            cleanup_old_files()
            filename = f"tts-{uuid.uuid4().hex}.mp3"
            output_path = OUTPUT_DIR / filename
            needs_processing = rate != 0 or pitch != 0 or volume != 0
            if voice in AZURE_VOICES:
                raw_path = OUTPUT_DIR / f"raw-{uuid.uuid4().hex}.mp3"
                synthesize_azure(text, voice, 0, 0, 0, raw_path, style)
            else:
                raw_path = OUTPUT_DIR / f"raw-{uuid.uuid4().hex}.mp3"
                communicate = edge_tts.Communicate(
                    text,
                    voice,
                    rate="+0%",
                    pitch="+0Hz",
                    volume="+0%",
                )
                asyncio.run(communicate.save(str(raw_path)))
            process_audio(
                raw_path,
                output_path,
                rate,
                pitch,
                volume,
                allow_passthrough=voice in AZURE_VOICES and not needs_processing,
            )
            raw_path.unlink(missing_ok=True)
            if not output_path.is_file() or output_path.stat().st_size < 512:
                raise RuntimeError("语音文件生成异常，请重试。")
            download_name = f"轻声-{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4]}.mp3"
            shutil.copyfile(output_path, EXPORT_DIR / download_name)
            self.send_json(
                {
                    "audioUrl": f"/generated/{filename}",
                    "downloadUrl": f"/api/download/{filename}",
                    "downloadName": download_name,
                    "savedTo": str(EXPORT_DIR / download_name),
                }
            )
        except (ValueError, json.JSONDecodeError):
            self.send_json({"error": "请求参数无效。"}, 400)
        except Exception as exc:
            if "raw_path" in locals():
                raw_path.unlink(missing_ok=True)
            self.send_json({"error": f"生成失败：{exc}"}, 502)

    def log_message(self, format, *args):
        print(f"[轻声] {self.address_string()} - {format % args}")


if __name__ == "__main__":
    cleanup_old_files()
    server = ThreadingHTTPServer((HOST, PORT), TTSHandler)
    print(f"轻声已启动：http://{HOST}:{PORT}")
    webbrowser.open(f"http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
