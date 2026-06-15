# 轻声 QingSheng

一个在 Windows 本机运行的中文文字转语音与音色克隆小工具。提供浏览器界面，生成的音频会保存到本机。

## 项目资料

- 项目编号：`project-0004`
- 创建日期：2026-06-14
- 任务目标：提供中文文字转语音、晓辰系列音色和 MiMo 音色克隆能力
- 主要交付物：本地网页工具、Windows 启动脚本、环境安装脚本与 GitHub 发布版本
- 当前状态：MiMo 克隆与文字转语音可用，MiniMax、Fish Audio 和本地模型适配器待接入

## 功能状态

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 微软中文在线音色 | 可用 | 通过 `edge-tts` 获取常用中文音色 |
| 晓辰普通话简体 | 可用 | Azure Speech `zh-CN-XiaochenNeural` |
| 晓辰 Dragon HD Latest | 可用 | 需要 Azure Speech API Key |
| 晓辰 Dragon HD Flash Latest | 可用 | 需要 Azure Speech API Key，支持 8 种样式 |
| MiMo V2.5 音色克隆 | 可用 | 已接入样本克隆、试听和下载 |
| MiniMax 音色克隆 | 配置可用 | 可验证并保存 API Key，生成适配器尚未接入 |
| Fish Audio 音色克隆 | 配置可用 | 可验证并保存 API Key，生成适配器尚未接入 |
| 本地 Qwen3-TTS | 实验入口 | 可下载模型，推理生成适配器尚未接入 |

所有正式生成的 MP3 会统一处理为单声道 `48kHz / 192kbps`。

## 运行前需要安装

### 必需

1. Windows 10 或 Windows 11
2. [Python 3.12](https://www.python.org/downloads/)
3. [FFmpeg](https://ffmpeg.org/)
4. 可访问语音服务的网络

项目内的 Python 依赖 `edge-tts` 会在首次启动时自动安装。

### 一键安装环境

双击：

```text
安装运行环境.bat
```

该脚本使用 Windows 自带的 `winget` 安装：

```powershell
winget install --id Python.Python.3.12 --exact
winget install --id Gyan.FFmpeg --exact
```

安装完成后关闭提示窗口，再双击 `启动工具.bat`。

## 启动工具

1. 下载并解压整个项目。
2. 双击 `安装运行环境.bat`，安装 Python 和 FFmpeg。
3. 双击 `启动工具.bat`。
4. 首次运行会创建 `.venv` 并自动安装 Python 依赖。
5. 浏览器会打开 `http://127.0.0.1:8765/`。

也可以从命令行运行：

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe server.py
```

## API 配置

### Azure Speech

精确晓辰、Dragon HD 和 Dragon HD Flash 需要：

- Azure Speech 资源密钥
- Azure 区域，例如 `eastus`

在文字转语音页面的“配置精确晓辰音色”中填写。

### Xiaomi MiMo

音色克隆需要 MiMo API Key：

- 按量 API Key：`sk-` 开头
- Token Plan API Key：`tp-` 开头

在“音色克隆”页面选择 MiMo 后填写。MiMo 已完成实际生成接入。

音色克隆只允许使用本人声音，或已经获得声音本人明确授权的录音。录音样本只在用户点击“生成克隆语音”后发送给 MiMo。

### MiniMax 与 Fish Audio

目前可以验证和保存 API Key，但实际克隆生成尚未接入。页面不会上传样本或伪造成功结果。

## 本机文件

以下内容只保存在本机，不会提交到 Git：

| 路径 | 用途 |
| --- | --- |
| `config.local.json` | Azure Speech 密钥和区域 |
| `clone-config.local.json` | MiMo、MiniMax、Fish Audio 密钥 |
| `generated/` | 浏览器试听使用的临时音频 |
| `导出音频/` | 自动保存的最终 MP3 |
| `.venv/` | 主程序 Python 环境 |
| `.clone-venv/` | 实验性本地克隆环境 |
| `models/` | 本地模型文件 |

不要把上述配置文件发送给他人。配置格式可以参考 `config.example.json` 和 `clone-config.example.json`。

## 音色克隆建议

- 使用 10 至 30 秒录音。
- 保持人声清晰，不要加入音乐、混响或环境噪声。
- 推荐 WAV 或 MP3；网页录音的 WebM 也会自动转换。
- 样本至少 16kHz，单人连续说话效果更稳定。
- MiMo 样本 Base64 数据上限为 10MB，过长录音会被拒绝。

## 本地 Qwen3-TTS

页面提供 `Qwen3-TTS 0.6B Base` 实验安装入口，会另外下载：

- PyTorch CUDA 12.8 组件
- `qwen-tts==0.1.1`
- Hugging Face 模型 `Qwen/Qwen3-TTS-12Hz-0.6B-Base`
- 数 GB 模型和运行文件

当前仅完成安装流程，尚未完成本地推理适配，不建议只为当前功能下载该模型。

## 安全说明

- API Key 只由本机 Python 服务读取，网页不会回显完整密钥。
- `.gitignore` 已排除密钥、模型、虚拟环境和生成音频。
- 发布前仍应检查提交内容，确认没有意外加入本机配置。
- 请遵守各语音服务的使用条款和声音授权要求。

## 许可证

[MIT License](LICENSE)
