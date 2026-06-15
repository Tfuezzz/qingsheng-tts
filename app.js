const textInput = document.querySelector("#textInput");
const charCount = document.querySelector("#charCount");
const voiceSelect = document.querySelector("#voiceSelect");
const voiceHint = document.querySelector("#voiceHint");
const generateButton = document.querySelector("#generateButton");
const statusText = document.querySelector("#statusText");
const resultPanel = document.querySelector("#resultPanel");
const resultVoice = document.querySelector("#resultVoice");
const audioPlayer = document.querySelector("#audioPlayer");
const downloadButton = document.querySelector("#downloadButton");
const openFolderButton = document.querySelector("#openFolderButton");
const refreshVoices = document.querySelector("#refreshVoices");
const azureSettings = document.querySelector("#azureSettings");
const azureKey = document.querySelector("#azureKey");
const azureRegion = document.querySelector("#azureRegion");
const saveAzure = document.querySelector("#saveAzure");
const azureStatus = document.querySelector("#azureStatus");
const styleField = document.querySelector("#styleField");
const styleSelect = document.querySelector("#styleSelect");
const sliders = {
  rate: document.querySelector("#rate"),
  pitch: document.querySelector("#pitch"),
  volume: document.querySelector("#volume"),
};
const modeTabs = document.querySelectorAll(".mode-tab");
const appViews = document.querySelectorAll(".app-view");
const sampleFile = document.querySelector("#sampleFile");
const recordButton = document.querySelector("#recordButton");
const recordTimer = document.querySelector("#recordTimer");
const sampleDropzone = document.querySelector("#sampleDropzone");
const samplePreview = document.querySelector("#samplePreview");
const samplePlayer = document.querySelector("#samplePlayer");
const sampleName = document.querySelector("#sampleName");
const sampleDuration = document.querySelector("#sampleDuration");
const sampleRate = document.querySelector("#sampleRate");
const sampleChannels = document.querySelector("#sampleChannels");
const sampleQuality = document.querySelector("#sampleQuality");
const waveform = document.querySelector("#waveform");
const removeSample = document.querySelector("#removeSample");
const cloneName = document.querySelector("#cloneName");
const consentCheck = document.querySelector("#consentCheck");
const createCloneButton = document.querySelector("#createCloneButton");
const cloneStatus = document.querySelector("#cloneStatus");
const emptyVoiceState = document.querySelector("#emptyVoiceState");
const cloneVoiceCard = document.querySelector("#cloneVoiceCard");
const cloneCardName = document.querySelector("#cloneCardName");
const cloneCardProvider = document.querySelector("#cloneCardProvider");
const playSampleButton = document.querySelector("#playSampleButton");
const demoGenerateButton = document.querySelector("#demoGenerateButton");
const demoGenerateStatus = document.querySelector("#demoGenerateStatus");
const cloneDemoText = document.querySelector("#cloneDemoText");
const cloneResult = document.querySelector("#cloneResult");
const cloneAudioPlayer = document.querySelector("#cloneAudioPlayer");
const downloadCloneButton = document.querySelector("#downloadCloneButton");
const heroEyebrow = document.querySelector("#heroEyebrow");
const heroTitle = document.querySelector("#heroTitle");
const heroSubtitle = document.querySelector("#heroSubtitle");
const providerCards = document.querySelectorAll(".provider-card");
const providerSetupTitle = document.querySelector("#providerSetupTitle");
const providerSetupDescription = document.querySelector("#providerSetupDescription");
const configureProviderButton = document.querySelector("#configureProviderButton");
const providerHelp = document.querySelector("#providerHelp");
const providerHelpTitle = document.querySelector("#providerHelpTitle");
const providerHelpContent = document.querySelector("#providerHelpContent");
const closeProviderHelp = document.querySelector("#closeProviderHelp");
const localInstallPanel = document.querySelector("#localInstallPanel");
const installLocalButton = document.querySelector("#installLocalButton");
const installProgress = document.querySelector("#installProgress");
const installStep = document.querySelector("#installStep");
const installPercent = document.querySelector("#installPercent");
const installProgressBar = document.querySelector("#installProgressBar");
const installMessage = document.querySelector("#installMessage");
const cloudKeyPanel = document.querySelector("#cloudKeyPanel");
const cloudKeyLabel = document.querySelector("#cloudKeyLabel");
const cloudApiKey = document.querySelector("#cloudApiKey");
const cloudKeyState = document.querySelector("#cloudKeyState");
const testCloudKey = document.querySelector("#testCloudKey");
const saveCloudKey = document.querySelector("#saveCloudKey");
const clearCloudKey = document.querySelector("#clearCloudKey");
const cloudKeyMessage = document.querySelector("#cloudKeyMessage");

const preferredVoices = {
  xiaocheng: ["zh-CN-XiaochenNeural"],
  "xiaocheng-hd": ["zh-CN-Xiaochen:DragonHDLatestNeural"],
  "xiaocheng-flash": ["zh-CN-Xiaochen:DragonHDFlashLatestNeural"],
  slowwave: ["zh-CN-YunyangNeural", "zh-CN-YunxiNeural", "zh-CN-YunjianNeural"],
  xiaoxiao: ["zh-CN-XiaoxiaoNeural", "zh-CN-XiaoyiNeural"],
};

const presetValues = {
  xiaocheng: { rate: 0, pitch: 0, volume: 0 },
  "xiaocheng-hd": { rate: 0, pitch: 0, volume: 0 },
  "xiaocheng-flash": { rate: 0, pitch: 0, volume: 0 },
  slowwave: { rate: -22, pitch: -10, volume: 0 },
  xiaoxiao: { rate: 0, pitch: 2, volume: 0 },
};

let voices = [];
let currentPreset = "xiaocheng";
let currentDownload = null;
let azureConfigured = false;
let sampleUrl = null;
let sampleBlob = null;
let mediaRecorder = null;
let recordStream = null;
let recordStartedAt = 0;
let recordInterval = null;
let sampleReady = false;
let selectedProvider = "local";
let savedVoiceProfile = null;
let cloneDownload = null;
let cloneConfig = {
  local: { state: "not_installed", progress: 0 },
  minimaxConfigured: false,
  fishConfigured: false,
  mimoConfigured: false,
};
let installPollTimer = null;

const providerInfo = {
  local: {
    name: "本地模型",
    title: "本地模型尚未安装",
    description: "点击“安装本地模型”后才会创建独立环境并下载 Qwen3-TTS 0.6B Base。",
    help: `
      <p><strong>适合：</strong>重视隐私、希望不限次数使用。</p>
      <p><strong>需要：</strong>下载模型与独立运行环境；你的 RTX 4060 8GB 可运行轻量模型。</p>
      <p><strong>当前状态：</strong>未安装，也没有后台下载任务。</p>
    `,
  },
  minimax: {
    name: "MiniMax",
    title: "MiniMax 尚未配置",
    description: "需要填写 MiniMax API Key 后才能上传授权样本、创建音色并生成语音。",
    help: `
      <p><strong>适合：</strong>中文口播、故事和情感旁白。</p>
      <p><strong>需要：</strong>MiniMax API Key，录音会发送至 MiniMax。</p>
      <p><strong>正式接入：</strong>密钥将只保存在本机服务端配置文件中。</p>
    `,
  },
  fish: {
    name: "Fish Audio",
    title: "Fish Audio 尚未配置",
    description: "需要填写 Fish Audio API Key 后才能创建或调用授权克隆音色。",
    help: `
      <p><strong>适合：</strong>角色配音、社区音色和声音克隆。</p>
      <p><strong>需要：</strong>Fish Audio API Key，录音会发送至 Fish Audio。</p>
      <p><strong>注意：</strong>仅可使用本人声音或取得明确授权的声音。</p>
    `,
  },
  mimo: {
    name: "MiMo",
    title: "MiMo 尚未配置",
    description: "需要填写小米 MiMo API Key，使用 MiMo-V2.5-TTS 的音色克隆能力。",
    help: `
      <p><strong>模型：</strong>mimo-v2.5-tts-voiceclone。</p>
      <p><strong>需要：</strong>小米 MiMo 开放平台 API Key，生成时录音会发送至 MiMo。</p>
      <p><strong>兼容：</strong>支持按量 sk- 密钥和 Token Plan 的 tp- 密钥。</p>
      <p><strong>密钥验证：</strong>只查询可用模型，不生成音频，也不会上传录音。</p>
    `,
  },
};

const voiceLabels = {
  "zh-CN-XiaochenNeural": "晓辰（普通话简体）",
  "zh-CN-Xiaochen:DragonHDLatestNeural": "晓辰 Dragon HD Latest",
  "zh-CN-Xiaochen:DragonHDFlashLatestNeural": "晓辰 Dragon HD Flash Latest",
  "zh-TW-HsiaoChenNeural": "晓辰",
  "zh-TW-HsiaoYuNeural": "晓雨",
  "zh-TW-YunJheNeural": "云哲",
  "zh-CN-XiaoxiaoNeural": "晓晓",
  "zh-CN-XiaoyiNeural": "晓伊",
  "zh-CN-YunjianNeural": "云健",
  "zh-CN-YunxiNeural": "云希",
  "zh-CN-YunxiaNeural": "云夏",
  "zh-CN-YunyangNeural": "云扬",
  "zh-CN-liaoning-XiaobeiNeural": "晓北（东北话）",
  "zh-CN-shaanxi-XiaoniNeural": "晓妮（陕西话）",
  "zh-HK-HiuGaaiNeural": "晓佳（粤语）",
  "zh-HK-HiuMaanNeural": "晓曼（粤语）",
  "zh-HK-WanLungNeural": "云龙（粤语）",
};

function updateCount() {
  charCount.textContent = `${textInput.value.length} / 10000`;
}

function signed(value, suffix) {
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number}${suffix}`;
}

function updateSlider(slider) {
  const value = Number(slider.value);
  const percent = ((value - Number(slider.min)) / (Number(slider.max) - Number(slider.min))) * 100;
  slider.style.setProperty("--fill", `${percent}%`);
  document.querySelector(`#${slider.id}Value`).textContent = signed(value, "%");
}

function selectBestVoice(preset) {
  const candidates = preferredVoices[preset];
  return candidates.map((name) => voices.find((voice) => voice.name === name)).find(Boolean);
}

function selectPreset(preset) {
  currentPreset = preset;
  document.querySelectorAll(".preset").forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === preset);
  });

  const values = presetValues[preset];
  Object.entries(values).forEach(([name, value]) => {
    sliders[name].value = value;
    updateSlider(sliders[name]);
  });

  const bestVoice = selectBestVoice(preset);
  if (bestVoice) voiceSelect.value = bestVoice.name;
  updateVoiceCapabilities();
}

function isAzureVoice(name) {
  return name === "zh-CN-XiaochenNeural"
    || name === "zh-CN-Xiaochen:DragonHDLatestNeural"
    || name === "zh-CN-Xiaochen:DragonHDFlashLatestNeural";
}

function updateVoiceCapabilities() {
  const voice = voiceSelect.value;
  const isFlash = voice.includes(":DragonHDFlash");
  styleField.hidden = !isFlash;

  if (voice === "zh-CN-XiaochenNeural") {
    voiceHint.textContent = azureConfigured
      ? "微软晓辰，中文普通话（简体）。语速、音调和音量由本机处理。"
      : "微软晓辰，中文普通话（简体）。生成前请配置 Azure Speech。";
  } else if (voice === "zh-CN-Xiaochen:DragonHDLatestNeural") {
    voiceHint.textContent = "高保真 Dragon HD 晓辰；生成后在本机调节语速、音调和音量。";
  } else if (isFlash) {
    voiceHint.textContent = "低延迟 Dragon HD Flash 晓辰；支持 8 种样式，并可在本机调节语速、音调和音量。";
  } else if (currentPreset === "slowwave") {
    voiceHint.textContent = "慢波故事是低语速、低音调的近似风格，并非平台专属原声。";
  } else {
    voiceHint.textContent = "可继续微调语速、音调和音量。";
  }
}

function renderVoices() {
  voiceSelect.innerHTML = "";
  voices.sort((a, b) => {
    const localeOrder = { "zh-CN": 0, "zh-TW": 1, "zh-HK": 2 };
    return (localeOrder[a.locale] ?? 3) - (localeOrder[b.locale] ?? 3)
      || a.name.localeCompare(b.name);
  });
  voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.name;
    const gender = voice.gender === "Female" ? "女声" : "男声";
    const shortLabel = voiceLabels[voice.name]
      || voice.name.replace(/^zh-(CN|TW|HK)-/, "").replace(/Neural$/, "");
    option.textContent = `${shortLabel} · ${gender} · ${voice.locale}`;
    voiceSelect.appendChild(option);
  });
  voiceSelect.disabled = false;
  generateButton.disabled = false;
  selectPreset(currentPreset);
}

async function loadVoices() {
  voiceSelect.disabled = true;
  generateButton.disabled = true;
  statusText.textContent = "正在获取在线音色…";
  try {
    const response = await fetch("/api/voices");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "获取音色失败");
    voices = data.voices;
    renderVoices();
    statusText.textContent = `已连接，共找到 ${voices.length} 个中文音色`;
  } catch (error) {
    voiceSelect.innerHTML = "<option>暂时无法获取音色</option>";
    statusText.textContent = error.message;
  }
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();
    azureConfigured = Boolean(data.azureConfigured);
    if (data.azureRegion) azureRegion.value = data.azureRegion;
    azureStatus.textContent = azureConfigured ? `已配置（${data.azureRegion}）` : "尚未配置";
  if (currentPreset === "xiaocheng") selectPreset("xiaocheng");
  } catch {
    azureStatus.textContent = "无法读取配置";
  }
}

async function saveAzureConfig() {
  const key = azureKey.value.trim();
  const region = azureRegion.value.trim();
  if (!key || !region) {
    azureStatus.textContent = "请填写密钥和区域";
    return;
  }
  saveAzure.disabled = true;
  azureStatus.textContent = "正在保存…";
  try {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azureKey: key, azureRegion: region }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "保存失败");
    azureConfigured = true;
    azureKey.value = "";
    azureStatus.textContent = `已配置（${data.azureRegion}）`;
    selectPreset(currentPreset);
  } catch (error) {
    azureStatus.textContent = error.message;
  } finally {
    saveAzure.disabled = false;
  }
}

async function generateAudio() {
  const text = textInput.value.trim();
  if (!text) {
    textInput.focus();
    statusText.textContent = "请先输入文字。";
    return;
  }
  if (isAzureVoice(voiceSelect.value) && !azureConfigured) {
    azureSettings.open = true;
    azureKey.focus();
    statusText.textContent = "精确晓辰需要先配置 Azure Speech。";
    return;
  }

  generateButton.disabled = true;
  generateButton.classList.add("loading");
  generateButton.querySelector(".button-text").textContent = "正在生成…";
  statusText.textContent = "正在合成语音，长文本需要多等一会儿…";
  resultPanel.hidden = true;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice: voiceSelect.value,
        rate: Number(sliders.rate.value),
        pitch: Number(sliders.pitch.value),
        volume: Number(sliders.volume.value),
        style: styleSelect.value,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "生成失败");

    audioPlayer.pause();
    audioPlayer.src = `${data.audioUrl}?t=${Date.now()}`;
    audioPlayer.load();
    currentDownload = {
      url: data.downloadUrl,
      name: data.downloadName,
    };
    resultVoice.textContent = voiceSelect.options[voiceSelect.selectedIndex].textContent;
    resultPanel.hidden = false;
    statusText.textContent = `生成完成，已保存到“导出音频”文件夹：${data.downloadName}`;
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    generateButton.disabled = false;
    generateButton.classList.remove("loading");
    generateButton.querySelector(".button-text").textContent = "生成语音";
  }
}

async function openOutputFolder() {
  try {
    const response = await fetch("/api/open-output", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "无法打开文件夹");
  } catch (error) {
    statusText.textContent = error.message;
  }
}

async function downloadAudio() {
  if (!currentDownload) return;
  downloadButton.disabled = true;
  downloadButton.textContent = "正在下载…";
  try {
    const response = await fetch(currentDownload.url);
    if (!response.ok) throw new Error("下载失败");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = currentDownload.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    downloadButton.disabled = false;
    downloadButton.textContent = "下载 MP3";
  }
}

function switchView(viewId) {
  modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
  appViews.forEach((view) => view.classList.toggle("active", view.id === viewId));
  const cloneMode = viewId === "cloneView";
  heroEyebrow.textContent = cloneMode ? "VOICE CLONING STUDIO" : "NEURAL TEXT TO SPEECH";
  heroTitle.textContent = cloneMode ? "让声音，成为你的作品。" : "把文字，变成声音。";
  heroSubtitle.textContent = cloneMode
    ? "录制并检查授权声音样本，使用已接入的引擎生成克隆语音。"
    : "选择喜欢的音色，生成可试听、可下载的 MP3。";
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function updateCloneButton() {
  createCloneButton.disabled = !(sampleReady && cloneName.value.trim() && consentCheck.checked);
}

function updateProvider(provider) {
  selectedProvider = provider;
  providerCards.forEach((card) => card.classList.toggle("active", card.dataset.provider === provider));
  const info = providerInfo[provider];
  providerSetupTitle.textContent = info.title;
  providerSetupDescription.textContent = info.description;
  localInstallPanel.hidden = provider !== "local";
  cloudKeyPanel.hidden = provider === "local";
  cloudApiKey.value = "";
  cloudKeyMessage.textContent = "密钥只保存在本机服务端，不会写入网页或回显。";
  if (provider !== "local") {
    const configured = isProviderConfigured(provider);
    providerSetupTitle.textContent = configured ? `${info.name} 已配置` : info.title;
    providerSetupDescription.textContent = configured
      ? `${info.name} 密钥验证已通过，可使用已接入的功能。`
      : info.description;
    cloudKeyLabel.textContent = `${info.name} API Key`;
    cloudApiKey.placeholder = configured ? "已配置；留空可测试现有密钥" : `输入 ${info.name} API Key`;
    cloudKeyState.textContent = configured ? "已配置" : "尚未配置";
    cloudKeyState.dataset.configured = String(configured);
  }
  if (savedVoiceProfile) {
    const configured = isProviderConfigured(provider);
    cloneCardProvider.textContent = `${info.name} · ${configured ? "已配置" : "未配置"}`;
    demoGenerateStatus.textContent = configured
      ? provider === "mimo"
        ? "MiMo 已配置，可使用当前声音样本生成克隆语音。"
        : `${info.name} 已配置，但实际克隆生成适配器尚未接入。`
      : `请先配置 ${info.name}。`;
  }
}

function isProviderConfigured(provider) {
  if (provider === "local") return cloneConfig.local?.state === "installed";
  if (provider === "minimax") return cloneConfig.minimaxConfigured;
  if (provider === "fish") return cloneConfig.fishConfigured;
  if (provider === "mimo") return cloneConfig.mimoConfigured;
  return false;
}

function setProviderCardState(provider, configured, label) {
  const card = [...providerCards].find((item) => item.dataset.provider === provider);
  if (!card) return;
  const state = card.querySelector("b");
  state.textContent = label || (configured ? "已配置" : "未配置");
  state.dataset.configured = String(configured);
}

function renderInstallStatus(status) {
  cloneConfig.local = status;
  const installing = status.state === "installing";
  const installed = status.state === "installed";
  installProgress.hidden = !(installing || status.state === "failed" || installed);
  installStep.textContent = status.step || "准备安装";
  installPercent.textContent = `${status.progress || 0}%`;
  installProgressBar.value = status.progress || 0;
  installMessage.textContent = status.message || "";
  installLocalButton.disabled = installing || installed;
  installLocalButton.textContent = installed
    ? "本地模型已安装"
    : installing
      ? "正在后台安装…"
      : status.state === "failed"
        ? "重新安装"
        : "安装本地模型";
  setProviderCardState("local", installed, installed ? "已安装" : installing ? "安装中" : "未配置");
  providerSetupTitle.textContent = installed
    ? "本地模型已安装"
    : installing
      ? status.step
      : status.state === "failed"
        ? "本地模型安装失败"
        : "本地模型尚未安装";
  if (installing && !installPollTimer) {
    installPollTimer = setInterval(loadInstallStatus, 2000);
  } else if (!installing && installPollTimer) {
    clearInterval(installPollTimer);
    installPollTimer = null;
  }
}

async function loadCloneConfig() {
  try {
    const response = await fetch("/api/clone/config");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "无法读取克隆配置");
    cloneConfig = data;
    renderInstallStatus(data.local);
    setProviderCardState("minimax", data.minimaxConfigured);
    setProviderCardState("fish", data.fishConfigured);
    setProviderCardState("mimo", data.mimoConfigured);
    const restoredProvider = savedVoiceProfile?.provider;
    updateProvider(providerInfo[restoredProvider] ? restoredProvider : selectedProvider);
  } catch (error) {
    providerSetupDescription.textContent = error.message;
  }
}

async function loadInstallStatus() {
  try {
    const response = await fetch("/api/clone/install-status");
    const data = await response.json();
    if (response.ok) renderInstallStatus(data);
  } catch {
    installMessage.textContent = "暂时无法读取安装进度。";
  }
}

async function installLocalModel() {
  const accepted = window.confirm(
    "将安装 Qwen3-TTS 0.6B Base，并下载数 GB 的运行组件和模型。任务会在后台继续。现在开始吗？"
  );
  if (!accepted) return;
  installLocalButton.disabled = true;
  installProgress.hidden = false;
  installMessage.textContent = "正在启动后台安装任务…";
  try {
    const response = await fetch("/api/clone/install", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "无法启动安装");
    renderInstallStatus(data);
  } catch (error) {
    installLocalButton.disabled = false;
    installMessage.textContent = error.message;
  }
}

async function submitCloudKey(action) {
  const key = cloudApiKey.value.trim();
  const endpoint = action === "save"
    ? "/api/clone/provider-save"
    : action === "test"
      ? "/api/clone/provider-test"
      : "/api/clone/provider-clear";
  cloudKeyMessage.textContent = action === "clear" ? "正在清除…" : "正在验证连接…";
  [testCloudKey, saveCloudKey, clearCloudKey].forEach((button) => {
    button.disabled = true;
  });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: selectedProvider, key }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "配置失败");
    const configured = Boolean(data.configured);
    if (selectedProvider === "minimax") cloneConfig.minimaxConfigured = configured;
    if (selectedProvider === "fish") cloneConfig.fishConfigured = configured;
    if (selectedProvider === "mimo") cloneConfig.mimoConfigured = configured;
    cloudApiKey.value = "";
    cloudKeyState.textContent = configured ? "已配置" : "尚未配置";
    cloudKeyState.dataset.configured = String(configured);
    cloudKeyMessage.textContent = data.message || (configured ? "配置已保存。" : "配置已清除。");
    setProviderCardState(selectedProvider, configured);
    updateProvider(selectedProvider);
  } catch (error) {
    cloudKeyMessage.textContent = error.message;
  } finally {
    [testCloudKey, saveCloudKey, clearCloudKey].forEach((button) => {
      button.disabled = false;
    });
  }
}

function drawWaveform(audioBuffer) {
  waveform.innerHTML = "";
  const data = audioBuffer.getChannelData(0);
  const bars = 72;
  const blockSize = Math.max(1, Math.floor(data.length / bars));
  for (let index = 0; index < bars; index += 1) {
    let peak = 0;
    const start = index * blockSize;
    for (let cursor = start; cursor < Math.min(start + blockSize, data.length); cursor += 1) {
      peak = Math.max(peak, Math.abs(data[cursor]));
    }
    const bar = document.createElement("i");
    bar.style.height = `${Math.max(10, Math.min(100, peak * 150))}%`;
    waveform.appendChild(bar);
  }
}

async function inspectSample(blob, filename) {
  if (blob.size > 50 * 1024 * 1024) {
    cloneStatus.textContent = "文件超过 50MB，请选择更短的声音样本。";
    return;
  }
  if (sampleUrl) URL.revokeObjectURL(sampleUrl);
  sampleBlob = blob;
  sampleUrl = URL.createObjectURL(blob);
  samplePlayer.src = sampleUrl;
  sampleName.textContent = filename || "录音样本";
  sampleDropzone.hidden = true;
  samplePreview.hidden = false;
  sampleQuality.textContent = "检查中";

  try {
    const bytes = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(bytes.slice(0));
    const duration = decoded.duration;
    sampleDuration.textContent = formatDuration(duration);
    sampleRate.textContent = `${Math.round(decoded.sampleRate / 1000)}kHz`;
    sampleChannels.textContent = decoded.numberOfChannels === 1 ? "单声道" : `${decoded.numberOfChannels} 声道`;
    drawWaveform(decoded);
    await audioContext.close();

    if (duration < 5) {
      sampleQuality.textContent = "过短";
      sampleQuality.dataset.level = "warn";
      cloneStatus.textContent = "样本少于 5 秒，建议换成 10–30 秒录音。";
      sampleReady = false;
    } else if (decoded.sampleRate < 16000) {
      sampleQuality.textContent = "采样率低";
      sampleQuality.dataset.level = "warn";
      cloneStatus.textContent = "采样率低于 16kHz，可能影响克隆质量。";
      sampleReady = false;
    } else {
      sampleQuality.textContent = duration >= 10 ? "良好" : "可用";
      sampleQuality.dataset.level = "good";
      cloneStatus.textContent = "样本检查通过，请命名并确认授权。";
      sampleReady = true;
    }
  } catch {
    sampleQuality.textContent = "无法解析";
    sampleQuality.dataset.level = "warn";
    cloneStatus.textContent = "无法读取这段音频，请换一个文件。";
    sampleReady = false;
  }
  updateCloneButton();
}

function clearSample() {
  if (sampleUrl) URL.revokeObjectURL(sampleUrl);
  sampleUrl = null;
  sampleBlob = null;
  sampleReady = false;
  sampleFile.value = "";
  samplePlayer.removeAttribute("src");
  samplePreview.hidden = true;
  sampleDropzone.hidden = false;
  waveform.innerHTML = "";
  cloneStatus.textContent = "添加声音样本后即可继续。";
  updateCloneButton();
}

async function toggleRecording() {
  if (mediaRecorder?.state === "recording") {
    mediaRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    cloneStatus.textContent = "当前浏览器不支持录音，请上传音频文件。";
    return;
  }
  try {
    recordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    mediaRecorder = new MediaRecorder(recordStream);
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", async () => {
      clearInterval(recordInterval);
      recordStream.getTracks().forEach((track) => track.stop());
      recordButton.classList.remove("recording");
      recordButton.innerHTML = "<span></span>开始录音";
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
      await inspectSample(blob, "浏览器录音.webm");
    });
    mediaRecorder.start();
    recordStartedAt = Date.now();
    recordButton.classList.add("recording");
    recordButton.innerHTML = "<span></span>停止录音";
    recordInterval = setInterval(() => {
      recordTimer.textContent = formatDuration((Date.now() - recordStartedAt) / 1000);
    }, 250);
  } catch {
    cloneStatus.textContent = "无法使用麦克风，请检查浏览器权限或改为上传音频。";
  }
}

function createDemoClone() {
  savedVoiceProfile = {
    name: cloneName.value.trim(),
    provider: selectedProvider,
    createdAt: new Date().toISOString(),
    duration: sampleDuration.textContent,
    sampleRate: sampleRate.textContent,
  };
  localStorage.setItem("qingvoice.cloneProfile", JSON.stringify(savedVoiceProfile));
  cloneCardName.textContent = cloneName.value.trim();
  const configured = isProviderConfigured(selectedProvider);
  cloneCardProvider.textContent = `${providerInfo[selectedProvider].name} · ${configured ? "已配置" : "未配置"}`;
  playSampleButton.disabled = false;
  emptyVoiceState.hidden = true;
  cloneVoiceCard.hidden = false;
  cloneStatus.textContent = selectedProvider === "mimo" && configured
    ? "音色档案已保存，现在可以生成克隆语音。"
    : "音色档案已保存。配置可用引擎后即可生成。";
  createCloneButton.textContent = "音色档案已保存";
  createCloneButton.disabled = true;
  demoGenerateStatus.textContent = configured
    ? selectedProvider === "mimo"
      ? "MiMo 已配置，可使用当前声音样本生成克隆语音。"
      : `${providerInfo[selectedProvider].name} 已配置，但实际克隆生成适配器尚未接入。`
    : `请先配置 ${providerInfo[selectedProvider].name}。`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result).split(",", 2)[1] || ""));
    reader.addEventListener("error", () => reject(new Error("无法读取声音样本。")));
    reader.readAsDataURL(blob);
  });
}

async function runDemoGeneration() {
  if (!isProviderConfigured(selectedProvider)) {
    providerHelp.hidden = false;
    providerHelpTitle.textContent = `${providerInfo[selectedProvider].name} 未配置`;
    providerHelpContent.innerHTML = providerInfo[selectedProvider].help;
    demoGenerateStatus.textContent = "请先配置所选克隆引擎。";
    return;
  }
  if (selectedProvider !== "mimo") {
    demoGenerateStatus.textContent = `${providerInfo[selectedProvider].name} 的实际克隆生成适配器尚未接入。`;
    return;
  }
  if (!sampleBlob || !sampleReady) {
    demoGenerateStatus.textContent = "请重新选择一段检查通过的声音样本。";
    return;
  }
  if (!consentCheck.checked) {
    demoGenerateStatus.textContent = "请先确认这是本人或已获授权的声音。";
    return;
  }
  const text = cloneDemoText.value.trim();
  if (!text) {
    demoGenerateStatus.textContent = "请输入试听文本。";
    return;
  }

  demoGenerateButton.disabled = true;
  demoGenerateButton.textContent = "正在生成…";
  demoGenerateStatus.textContent = "正在上传授权样本并调用 MiMo，通常需要几十秒…";
  cloneResult.hidden = true;
  cloneAudioPlayer.pause();
  try {
    const sampleBase64 = await blobToBase64(sampleBlob);
    const response = await fetch("/api/clone/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: selectedProvider,
        text,
        sampleBase64,
        sampleMime: sampleBlob.type || "application/octet-stream",
        consent: true,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "克隆语音生成失败。");

    cloneAudioPlayer.src = `${data.audioUrl}?t=${Date.now()}`;
    cloneAudioPlayer.load();
    cloneDownload = { url: data.downloadUrl, name: data.downloadName };
    cloneResult.hidden = false;
    demoGenerateStatus.textContent = `生成完成，已保存到“导出音频”文件夹：${data.downloadName}`;
  } catch (error) {
    demoGenerateStatus.textContent = error.message;
  } finally {
    demoGenerateButton.disabled = false;
    demoGenerateButton.textContent = "生成克隆语音";
  }
}

function downloadCloneAudio() {
  if (!cloneDownload) return;
  const link = document.createElement("a");
  link.href = cloneDownload.url;
  link.download = cloneDownload.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function showProviderHelp() {
  const info = providerInfo[selectedProvider];
  providerHelp.hidden = false;
  providerHelpTitle.textContent = `${info.name}配置说明`;
  providerHelpContent.innerHTML = info.help;
}

function restoreVoiceProfile() {
  try {
    savedVoiceProfile = JSON.parse(localStorage.getItem("qingvoice.cloneProfile"));
  } catch {
    savedVoiceProfile = null;
  }
  if (!savedVoiceProfile?.name) return;
  cloneCardName.textContent = savedVoiceProfile.name;
  cloneCardProvider.textContent = `${providerInfo[savedVoiceProfile.provider]?.name || "未绑定"} · 未配置`;
  playSampleButton.disabled = true;
  playSampleButton.textContent = "重新选择样本后试听";
  emptyVoiceState.hidden = true;
  cloneVoiceCard.hidden = false;
  demoGenerateStatus.textContent = "请重新选择原始声音样本后生成。";
}

textInput.addEventListener("input", updateCount);
generateButton.addEventListener("click", generateAudio);
refreshVoices.addEventListener("click", loadVoices);
voiceSelect.addEventListener("change", updateVoiceCapabilities);
saveAzure.addEventListener("click", saveAzureConfig);
downloadButton.addEventListener("click", downloadAudio);
openFolderButton.addEventListener("click", openOutputFolder);
audioPlayer.addEventListener("error", () => {
  statusText.textContent = "音频加载失败，请重新生成。";
});
modeTabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
sampleFile.addEventListener("change", () => {
  const file = sampleFile.files[0];
  if (file) inspectSample(file, file.name);
});
sampleDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  sampleDropzone.classList.add("dragging");
});
sampleDropzone.addEventListener("dragleave", () => sampleDropzone.classList.remove("dragging"));
sampleDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  sampleDropzone.classList.remove("dragging");
  const file = event.dataTransfer.files[0];
  if (file?.type.startsWith("audio/")) {
    inspectSample(file, file.name);
  } else {
    cloneStatus.textContent = "请拖入音频文件。";
  }
});
recordButton.addEventListener("click", toggleRecording);
removeSample.addEventListener("click", clearSample);
cloneName.addEventListener("input", updateCloneButton);
consentCheck.addEventListener("change", updateCloneButton);
createCloneButton.addEventListener("click", createDemoClone);
playSampleButton.addEventListener("click", () => {
  if (!sampleUrl) {
    cloneStatus.textContent = "浏览器不会永久保存原始录音，请重新选择样本。";
    return;
  }
  samplePlayer.play();
});
demoGenerateButton.addEventListener("click", runDemoGeneration);
downloadCloneButton.addEventListener("click", downloadCloneAudio);
cloneAudioPlayer.addEventListener("error", () => {
  demoGenerateStatus.textContent = "克隆音频加载失败，请重新生成。";
});
installLocalButton.addEventListener("click", installLocalModel);
testCloudKey.addEventListener("click", () => submitCloudKey("test"));
saveCloudKey.addEventListener("click", () => submitCloudKey("save"));
clearCloudKey.addEventListener("click", () => submitCloudKey("clear"));
providerCards.forEach((card) => card.addEventListener("click", () => updateProvider(card.dataset.provider)));
configureProviderButton.addEventListener("click", showProviderHelp);
closeProviderHelp.addEventListener("click", () => {
  providerHelp.hidden = true;
});

document.querySelectorAll(".quick-text button").forEach((button) => {
  button.addEventListener("click", () => {
    textInput.value = button.dataset.text;
    updateCount();
    textInput.focus();
  });
});

document.querySelectorAll(".preset").forEach((button) => {
  button.addEventListener("click", () => selectPreset(button.dataset.preset));
});

Object.values(sliders).forEach((slider) => {
  updateSlider(slider);
  slider.addEventListener("input", () => updateSlider(slider));
});

updateCount();
Promise.all([loadConfig(), loadVoices()]);
restoreVoiceProfile();
updateProvider("local");
loadCloneConfig();
