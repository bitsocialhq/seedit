---
name: test-apk
description: Test and debug Android APK features using a local Android emulator. Manages emulator lifecycle, builds/installs the APK, captures logcat diagnostics, and debugs the Capacitor file upload plugin (catbox.moe). Use when the user asks to test APK, debug Android, test uploads, run emulator tests, or says "test-apk".
---

# Test APK on Android Emulator

## Overview

Delegates APK testing to the dedicated `test-apk` subagent to keep the main context clean.
That subagent manages the emulator, builds and installs only when needed, executes the requested workflow, and returns structured diagnostics.

## Workflow

### Step 1: Collect Test Requirements

Ask the user (or infer from context) what to test. Common scenarios:

| Scenario | What to run |
|----------|-------------|
| Upload debugging (catbox.moe plugin) | Manual upload flow + logcat |
| Manual APK interaction | Build, install, launch, capture logcat |
| Regression check after a UI change | Build, install, drive the affected flow, screenshot |

This repo has no committed Android instrumentation test suite — testing is manual flows driven over `adb` plus logcat evidence.

### Step 2: Delegate to the `test-apk` Subagent

Spawn the `test-apk` subagent with the prompt template below, filling in `{TEST_DESCRIPTION}` with the user's requirements and any exact commands or flows you want run.

```
Use the Task tool:
  subagent_type: "test-apk"
  prompt: <see Prompt Template below>
```

### Prompt Template

Copy and adapt this prompt when spawning the subagent. Replace `{TEST_DESCRIPTION}` and `{TEST_COMMANDS}`.

---

```text
You are testing the seedit Android APK on a local emulator.

## Environment
- ANDROID_HOME: use the contributor's local Android SDK path from the environment
- Project root: the current repository root from `git rev-parse --show-toplevel`
- Capacitor app (appId: seedit.android, webDir: build)
- System image installed: system-images;android-35;google_apis;arm64-v8a
- AVD name to use: seedit-test-api35
- Device profile: pixel_6

## What to Test
{TEST_DESCRIPTION}

## Emulator Management

### Check if emulator is already running
adb devices | grep emulator

### If no emulator running, create AVD (if missing) and start it
avdmanager list avd | grep seedit-test-api35 || \
  echo "no" | avdmanager create avd \
    --name seedit-test-api35 \
    --package "system-images;android-35;google_apis;arm64-v8a" \
    --device pixel_6 --force

# Start emulator (background it, wait for boot)
emulator -avd seedit-test-api35 -no-boot-anim -no-snapshot-save -netdelay none -netspeed full &
adb wait-for-device
# Poll for boot complete (up to 180s)
for i in $(seq 1 90); do
  boot=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$boot" = "1" ] && break
  sleep 2
done

# Disable animations for test reliability
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0

### IMPORTANT: Do NOT kill the emulator when done. Leave it running for iterative debugging.

## Build & Install APK

### Only rebuild if user asked to, or if this is the first run:
cd "$(git rev-parse --show-toplevel)"
yarn build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

## Run Tests
{TEST_COMMANDS}

## Diagnostics to Capture

### Always capture logcat filtered to the upload plugin:
adb logcat -d -s FileUploaderPlugin:* Capacitor:* | tail -200

### If the flow fails, also capture:
- Full logcat last 500 lines: adb logcat -d -t 500
- Screenshot: adb exec-out screencap -p > /tmp/emulator-screenshot.png
- WebView console logs: adb logcat -d -s chromium:* | tail -100

## Return Format

Return a structured summary:
1. **Emulator status**: running / newly started / failed to boot
2. **APK build**: success / skipped / failed (with error)
3. **APK install**: success / skipped / failed
4. **Test results**: pass / fail with details
5. **Logcat highlights**: relevant FileUploaderPlugin log lines
6. **Diagnosis**: what went wrong and suggested fix (if the flow failed)
7. **Screenshots**: path to any captured screenshots
```

---

## Common Test Commands

### Launch App and Capture Logs

```text
{TEST_COMMANDS} =
adb shell am start -n seedit.android/.MainActivity
sleep 5
adb logcat -d -t 300 | tail -300
```

### Upload Flow Debug (catbox.moe plugin)

```text
{TEST_COMMANDS} =
# Launch the app, navigate to a submit form, pick a media file, and watch the plugin logs
adb shell am start -n seedit.android/.MainActivity
adb logcat -c
# ...drive the upload flow in the app UI (or describe the steps for the contributor)...
adb logcat -d -s FileUploaderPlugin:* | tail -200
adb logcat -d -s chromium:* | tail -100
```

## Key Files for Debugging

| File | Purpose |
|------|---------|
| `android/app/src/main/java/seedit/android/FileUploaderPlugin.java` | Capacitor plugin: uploads picked media directly to the catbox.moe API with progress updates |
| `android/app/src/main/java/seedit/android/FileUtils.java` | File path/URI helpers used by the plugin |
| `android/app/src/main/java/seedit/android/MainActivity.java` | Capacitor entry activity (registers the plugin) |
| `capacitor.config.ts` | Capacitor appId/plugin configuration |

## Interpreting Upload Logs

The plugin posts to `https://catbox.moe/user/api.php` and reports status updates (e.g. "Uploading to catbox.moe...") back to the WebView. Failures are usually network errors, catbox rate limits, or file-permission problems reading the picked URI — the logcat lines from `FileUploaderPlugin` include the failure cause.
