---
name: test-apk
description: Test and debug Android APK features using a local Android emulator. Manages emulator lifecycle, builds/installs the APK, runs instrumentation tests, captures logcat diagnostics, and debugs WebView automation (imgur, postimages uploads). Use when the user asks to test APK, debug Android, test uploads, run emulator tests, or says "test-apk".
---

# Test APK on Android Emulator

## Overview

Delegates APK testing to the dedicated `test-apk` subagent to keep the main context clean.
That subagent manages the emulator, builds and installs only when needed, executes the requested tests, and returns structured diagnostics.

## Workflow

### Step 1: Collect Test Requirements

Ask the user (or infer from context) what to test. Common scenarios:

| Scenario | What to run |
|----------|-------------|
| WebView upload debugging (imgur/postimages) | Instrumentation tests + logcat |
| Live upload test | `yarn live:postimages:auto` or custom instrumentation |
| Full connected test suite | `yarn android:connectedTest` |
| Specific instrumentation class | Custom `./gradlew connectedDebugAndroidTest` with class filter |
| Manual APK interaction | Build, install, launch, capture logcat |
| Contract tests (fixtures) | `yarn contract:postimages` |

### Step 2: Delegate to the `test-apk` Subagent

Spawn the `test-apk` subagent with the prompt template below, filling in `{TEST_DESCRIPTION}` with the user's requirements and any exact commands or classes you want run.

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
- Capacitor app (appId: fivechan.android, webDir: build)
- System image installed: system-images;android-35;google_apis;arm64-v8a
- AVD name to use: fivechan-test-api35
- Device profile: pixel_6

## What to Test
{TEST_DESCRIPTION}

## Emulator Management

### Check if emulator is already running
adb devices | grep emulator

### If no emulator running, create AVD (if missing) and start it
avdmanager list avd | grep fivechan-test-api35 || \
  echo "no" | avdmanager create avd \
    --name fivechan-test-api35 \
    --package "system-images;android-35;google_apis;arm64-v8a" \
    --device pixel_6 --force

# Start emulator (background it, wait for boot)
emulator -avd fivechan-test-api35 -no-boot-anim -no-snapshot-save -netdelay none -netspeed full &
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

### Always capture logcat filtered to upload automation:
adb logcat -d -s MediaUploadAutomation:* FileUploaderPlugin:* | tail -200

### If test fails, also capture:
- Full logcat last 500 lines: adb logcat -d -t 500
- Screenshot: adb exec-out screencap -p > /tmp/emulator-screenshot.png
- WebView console logs: adb logcat -d -s chromium:* | tail -100

## Return Format

Return a structured summary:
1. **Emulator status**: running / newly started / failed to boot
2. **APK build**: success / skipped / failed (with error)
3. **APK install**: success / skipped / failed
4. **Test results**: pass / fail with details
5. **Logcat highlights**: relevant MediaUploadAutomation log lines
6. **Diagnosis**: what went wrong and suggested fix (if test failed)
7. **Screenshots**: path to any captured screenshots
```

---

## Common Test Commands

### WebView Upload Debug (imgur + postimages)

```text
{TEST_COMMANDS} =
# Run fixture-based contract tests first
cd "$(git rev-parse --show-toplevel)/android"
ANDROID_SERIAL=$(adb devices | awk '/^emulator/ {print $1; exit}') \
  ./gradlew :app:connectedDebugAndroidTest \
  -Pandroid.experimental.androidTest.useUnifiedTestPlatform=false \
  -Pandroid.testInstrumentationRunnerArguments.class="fivechan.android.MediaUploadAutomationRunnerTest"

# If contract tests pass, run live upload test
ANDROID_SERIAL=$(adb devices | awk '/^emulator/ {print $1; exit}') \
  ./gradlew :app:connectedDebugAndroidTest \
  -Pandroid.experimental.androidTest.useUnifiedTestPlatform=false \
  -Pandroid.testInstrumentationRunnerArguments.class="fivechan.android.PostimagesLiveUploadTest"

# Capture logcat for upload automation
adb logcat -d -s MediaUploadAutomation:* | tail -200
adb logcat -d -s chromium:* | tail -100
```

### Full Connected Test Suite

```text
{TEST_COMMANDS} =
cd "$(git rev-parse --show-toplevel)/android"
ANDROID_SERIAL=$(adb devices | awk '/^emulator/ {print $1; exit}') \
  ./gradlew :app:connectedDebugAndroidTest
```

### Launch App and Capture Logs

```text
{TEST_COMMANDS} =
adb shell am start -n fivechan.android/.MainActivity
sleep 5
adb logcat -d -t 300 | tail -300
```

## Key Files for Debugging

| File | Purpose |
|------|---------|
| `android/app/src/main/java/fivechan/android/MediaUploadAutomationRunner.java` | WebView upload automation engine |
| `android/app/src/main/java/fivechan/android/MediaUploadRecipes.java` | Provider selectors and JS recipes |
| `android/app/src/main/java/fivechan/android/FileUploaderPlugin.java` | Capacitor plugin entry point |
| `android/app/src/androidTest/.../MediaUploadAutomationRunnerTest.java` | Fixture-based unit tests |
| `android/app/src/androidTest/.../PostimagesLiveUploadTest.java` | Live integration test |
| `android/app/src/main/assets/fixtures/` | HTML test fixtures |
| `scripts/run-postimages-live-emulator-test.sh` | Reference emulator test script |

## Upload Automation Stages (for interpreting logcat)

| Stage | Meaning |
|-------|---------|
| `page_loaded` | Provider URL finished loading in WebView |
| `selector_matched` | File input element found via CSS selector |
| `file_chooser_callback` | WebChromeClient.onShowFileChooser fired |
| `submit_clicked` | Upload/submit button clicked |
| `success_selector_matched` | Uploaded URL extracted from page |
| `blocked_detected` | CAPTCHA or rate limit detected |
| `input_not_found` | No file input found within timeout |
| `chooser_not_triggered` | Input found but chooser didn't fire |
| `upload_timed_out` | Upload didn't complete within 45s |
