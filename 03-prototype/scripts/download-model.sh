#!/bin/sh
# Downloads the speech-to-text models into 03-prototype/models/ (skips the ones already there):
# - Whisper large-v3-turbo (~550 MB): Greek speech-to-text; q5_0 is a compressed version that runs faster.
# - Silero VAD (~1 MB): finds the speech between pauses, so Whisper doesn't skip sentences.
set -e
cd "$(dirname "$0")/.."
mkdir -p models

download() { # file, url, size
  if [ -f "models/$1" ]; then
    echo "Already downloaded: models/$1"
    return
  fi
  echo "Downloading $1 ($3)…"
  curl -L --fail --progress-bar -o "models/$1.part" "$2"
  mv "models/$1.part" "models/$1"
  echo "Saved to models/$1"
}

download ggml-large-v3-turbo-q5_0.bin "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin" "~550 MB"
download ggml-silero-v5.1.2.bin "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v5.1.2.bin" "~1 MB"
