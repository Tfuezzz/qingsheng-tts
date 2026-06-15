import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATUS_FILE = ROOT / "clone-install-status.json"
VENV_DIR = ROOT / ".clone-venv"
VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe"
MODEL_DIR = ROOT / "models" / "Qwen3-TTS-12Hz-0.6B-Base"
MODEL_ID = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"


def write_status(state, step, progress, message):
    temporary = STATUS_FILE.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(
            {
                "state": state,
                "step": step,
                "progress": progress,
                "message": message,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    temporary.replace(STATUS_FILE)


def run(command):
    subprocess.run(command, cwd=str(ROOT), check=True)


try:
    write_status("installing", "创建独立环境", 5, "正在创建本地克隆运行环境…")
    if not VENV_PYTHON.is_file():
        run([sys.executable, "-m", "venv", str(VENV_DIR)])

    write_status("installing", "安装基础组件", 15, "正在安装 PyTorch CUDA 组件…")
    run([str(VENV_PYTHON), "-m", "pip", "install", "--upgrade", "pip"])
    run(
        [
            str(VENV_PYTHON),
            "-m",
            "pip",
            "install",
            "torch",
            "torchaudio",
            "--index-url",
            "https://download.pytorch.org/whl/cu128",
        ]
    )

    write_status("installing", "安装语音引擎", 40, "正在安装 Qwen3-TTS 运行组件…")
    run(
        [
            str(VENV_PYTHON),
            "-m",
            "pip",
            "install",
            "qwen-tts==0.1.1",
            "huggingface_hub",
        ]
    )

    write_status("installing", "下载模型", 55, "正在下载 Qwen3-TTS 0.6B Base，文件较大，请保持联网…")
    MODEL_DIR.parent.mkdir(exist_ok=True)
    code = (
        "from huggingface_hub import snapshot_download;"
        f"snapshot_download(repo_id={MODEL_ID!r}, local_dir={str(MODEL_DIR)!r})"
    )
    run([str(VENV_PYTHON), "-c", code])

    write_status("installed", "安装完成", 100, "Qwen3-TTS 0.6B Base 已安装。")
except Exception as exc:
    write_status("failed", "安装失败", 0, f"{type(exc).__name__}: {exc}")
