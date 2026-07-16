#!/bin/bash

set -euo pipefail

usage() {
  echo "Usage: ./scripts/pw-throttle.sh <session> <profile>"
  echo "  profiles:"
  echo "    mid   4x CPU + ~1.6 Mbps / 750 Kbps / 150ms"
  echo "    low   6x CPU + ~400 Kbps / 400 Kbps / 400ms"
  echo "    cpu4  4x CPU, full-speed network"
  echo "    cpu6  6x CPU, full-speed network"
  echo "    off   reset to full speed"
}

if [ "$#" -ne 2 ]; then
  usage >&2
  exit 1
fi

session="$1"
profile="$2"

# Throughput values are bytes per second; latency is milliseconds.
case "$profile" in
  mid)  cpu=4; down=200000; up=93750; lat=150 ;;
  low)  cpu=6; down=50000;  up=50000; lat=400 ;;
  cpu4) cpu=4; down=-1;     up=-1;    lat=0 ;;
  cpu6) cpu=6; down=-1;     up=-1;    lat=0 ;;
  off)  cpu=1; down=-1;     up=-1;    lat=0 ;;
  *)
    echo "pw-throttle: unknown profile '$profile'" >&2
    usage >&2
    exit 1
    ;;
esac

echo "pw-throttle: applying '$profile' to session '$session' (cpu ${cpu}x, down ${down} B/s, up ${up} B/s, latency ${lat} ms; Chromium only)"

playwright-cli -s="$session" run-code "async page => {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Emulation.setCPUThrottlingRate', { rate: $cpu });
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: $down,
    uploadThroughput: $up,
    latency: $lat,
  });
}"
