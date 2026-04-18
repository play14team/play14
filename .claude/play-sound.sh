#!/usr/bin/env bash
# Claude Code sound notification hook
# Usage: ./play-sound.sh [question|done]

SOUND_TYPE="${1:-done}"

play_linux() {
  local event_id="$1" sox_cmd="$2" fallback_file="$3"

  # 1. Desktop-themed sound (best UX)
  if command -v canberra-gtk-play &>/dev/null; then
    canberra-gtk-play -i "$event_id" 2>/dev/null && return
  fi

  # 2. Soft generated tone via sox
  if command -v play &>/dev/null; then
    eval "$sox_cmd" 2>/dev/null && return
  fi

  # 3. Freedesktop fallback
  if [ -f "/usr/share/sounds/freedesktop/stereo/$fallback_file" ]; then
    paplay "/usr/share/sounds/freedesktop/stereo/$fallback_file" 2>/dev/null && return
  fi

  printf '\a'
}

play_mac() {
  afplay /System/Library/Sounds/"$1" 2>/dev/null || printf '\a'
}

play_windows() {
  powershell.exe -Command "$1" 2>/dev/null || printf '\a'
}

case "$(uname -s)" in
  Linux*)
    is_wsl=false
    grep -qi microsoft /proc/version 2>/dev/null && is_wsl=true

    case "$SOUND_TYPE" in
      question)
        if $is_wsl; then
          play_windows "[console]::beep(523,120); Start-Sleep -m 40; [console]::beep(659,120); Start-Sleep -m 40; [console]::beep(784,180)"
        else
          play_linux "dialog-question" \
            "play -qn synth 0.12 sine 523 fade 0 0.12 0.04 : synth 0.12 sine 659 fade 0 0.12 0.04 : synth 0.18 sine 784 fade 0 0.18 0.06" \
            "dialog-information.oga"
        fi
        ;;
      done)
        if $is_wsl; then
          play_windows "[console]::beep(659,100); Start-Sleep -m 30; [console]::beep(784,100); Start-Sleep -m 30; [console]::beep(1047,160)"
        else
          play_linux "complete" \
            "play -qn synth 0.1 sine 659 fade 0 0.1 0.03 : synth 0.1 sine 784 fade 0 0.1 0.03 : synth 0.16 sine 1047 fade 0 0.16 0.05" \
            "complete.oga"
        fi
        ;;
      *)
        if $is_wsl; then
          play_windows "[console]::beep(784,150)"
        else
          play_linux "bell" \
            "play -qn synth 0.15 sine 784 fade 0 0.15 0.05" \
            "bell.oga"
        fi
        ;;
    esac
    ;;
  Darwin*)
    case "$SOUND_TYPE" in
      question) play_mac "Purr.aiff" ;;
      done)     play_mac "Glass.aiff" ;;
      *)        play_mac "Tink.aiff" ;;
    esac
    ;;
  MINGW*|MSYS*|CYGWIN*)
    case "$SOUND_TYPE" in
      question) play_windows "[console]::beep(523,120); Start-Sleep -m 40; [console]::beep(659,120); Start-Sleep -m 40; [console]::beep(784,180)" ;;
      done)     play_windows "[console]::beep(659,100); Start-Sleep -m 30; [console]::beep(784,100); Start-Sleep -m 30; [console]::beep(1047,160)" ;;
      *)        play_windows "[console]::beep(784,150)" ;;
    esac
    ;;
  *)
    printf '\a'
    ;;
esac
