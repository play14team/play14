#!/usr/bin/env bash
# Claude Code sound notification hook
# Usage: ./play-sound.sh [question|done]

SOUND_TYPE="${1:-done}"

case "$SOUND_TYPE" in
  question)
    # Play a questioning sound (ascending tone)
    powershell.exe -Command "[console]::beep(600,150); [console]::beep(800,150); [console]::beep(1000,200)" 2>/dev/null
    ;;
  done)
    # Play a completion sound (pleasant ding)
    powershell.exe -Command "[console]::beep(800,100); [console]::beep(1000,100); [console]::beep(1200,150)" 2>/dev/null
    ;;
  *)
    # Default beep
    powershell.exe -Command "[console]::beep(800,200)" 2>/dev/null
    ;;
esac
