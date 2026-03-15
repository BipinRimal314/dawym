# Stage Presence Analyzer: Browser-Based ML Research

Research date: March 15, 2026

## Executive Summary

The browser ML ecosystem is mature enough to build a real-time stage presence analyzer that runs entirely client-side. The recommended stack centers on **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`), which provides pose, face, and hand tracking in a single package with Apache 2.0 licensing and active Google maintenance. No paid API calls required.

The realistic performance target is **15-25 FPS** running all three models simultaneously on a modern MacBook, which is sufficient for stage presence analysis (you don't need 60fps to detect fidgeting or poor posture).

---

## 1. Pose Estimation (Body Tracking)

### Recommendation: MediaPipe Pose Landmarker (BlazePose)

**Why:** 33 keypoints (vs 17 for MoveNet/PoseNet) gives you shoulders, elbows, wrists, hips, knees, ankles, plus face and foot points. The extra keypoints are critical for posture analysis and gesture detection.

| Model | Keypoints | 3D | FPS (MacBook WebGL) | npm Package | License | Status |
|-------|-----------|-----|---------------------|-------------|---------|--------|
| **MediaPipe Pose Landmarker** | 33 | Yes | 30-50 (single model) | `@mediapipe/tasks-vision` | Apache 2.0 | Active (Jan 2025 update) |
| MoveNet Lightning | 17 | No | ~104 | `@tensorflow-models/pose-detection` | Apache 2.0 | Active |
| MoveNet Thunder | 17 | No | ~77 | `@tensorflow-models/pose-detection` | Apache 2.0 | Active |
| BlazePose (via TF.js) | 33 | Yes | 30-45 | `@tensorflow-models/pose-detection` | Apache 2.0 | Active |
| PoseNet | 17 | No | 30-60 | `@tensorflow-models/posenet` | Apache 2.0 | **Deprecated** |
| ViTPose (Transformers.js) | 17 | No | ~10-15 | `@huggingface/transformers` | Apache 2.0 | Experimental (25 downloads) |

### Model Variants (MediaPipe Pose Landmarker)
- **Lite** (3MB): Resource-constrained devices, lower accuracy
- **Full** (6MB): Balanced performance/accuracy — **use this**
- **Heavy** (26MB): Highest accuracy, slower inference

### 33 Keypoints Provided
Nose, left/right eye (inner, outer), left/right ear, left/right shoulder, left/right elbow, left/right wrist, left/right pinky, left/right index, left/right thumb, left/right hip, left/right knee, left/right ankle, left/right heel, left/right foot index.

### What You Can Derive From Pose Data
- **Posture score**: shoulder alignment (left_shoulder.y vs right_shoulder.y), spine straightness (nose-to-hip-midpoint angle)
- **Body sway**: track hip_midpoint x-displacement over time, calculate standard deviation
- **Weight shifting**: left_hip vs right_hip y-coordinate differential over time
- **Pacing/walking**: hip_midpoint x-velocity sustained above threshold for >1s
- **Open vs closed stance**: shoulder width / hip width ratio, arm angle from torso
- **Fidgeting**: high-frequency oscillation in wrist/hand keypoints (FFT or rolling variance)
- **Leaning**: angle between shoulder_midpoint and hip_midpoint relative to vertical

### MoveNet vs PoseNet Verdict
MoveNet is strictly better than PoseNet in every dimension. PoseNet is deprecated. MoveNet Lightning runs at 104fps on a MacBook. But for a stage presence analyzer, MoveNet's 17 keypoints miss finger-level detail. Go with MediaPipe's 33-point model.

---

## 2. Face & Eye Tracking

### Recommendation: MediaPipe Face Landmarker

**Why:** 478 face landmarks + 52 blendshapes in a single model. The blendshapes directly give you smile detection, eye blink, gaze direction, and more. No separate emotion classifier needed.

| Model | Landmarks | Expressions | Gaze | npm Package | License | Status |
|-------|-----------|-------------|------|-------------|---------|--------|
| **MediaPipe Face Landmarker** | 478 | 52 blendshapes | Via eye landmarks | `@mediapipe/tasks-vision` | Apache 2.0 | Active (Jan 2026 update) |
| face-api.js (original) | 68 | 7 emotions | No | `face-api.js` | MIT | **Abandoned** (no updates since 2020) |
| @vladmandic/face-api | 68 | 7 emotions | No | `@vladmandic/face-api` | MIT | **Archived** (Feb 2025) |
| WebGazer.js | N/A | No | Yes (screen coords) | `webgazer` | **GPLv3** | **Unmaintained** (Feb 2026) |
| TF.js Face Landmarks | 468 | No | No | `@tensorflow-models/face-landmarks-detection` | Apache 2.0 | Active |

### 52 Blendshapes (MediaPipe Face Landmarker)
These are float values 0.0-1.0 indicating intensity:

**Eye tracking (critical for "eye contact" detection):**
- `eyeLookUpLeft`, `eyeLookUpRight` — looking up
- `eyeLookDownLeft`, `eyeLookDownRight` — looking down
- `eyeLookInLeft`, `eyeLookInRight` — looking toward nose (cross-eyed)
- `eyeLookOutLeft`, `eyeLookOutRight` — looking away from nose
- `eyeBlinkLeft`, `eyeBlinkRight` — blinking
- `eyeSquintLeft`, `eyeSquintRight` — squinting
- `eyeWideLeft`, `eyeWideRight` — eyes wide

**Expression detection:**
- `mouthSmileLeft`, `mouthSmileRight` — smiling
- `mouthFrownLeft`, `mouthFrownRight` — frowning
- `jawOpen` — mouth open (speaking)
- `browDownLeft`, `browDownRight` — furrowed brows (concern/concentration)
- `browInnerUp` — raised inner brows (surprise/worry)
- `browOuterUpLeft`, `browOuterUpRight` — raised outer brows
- `cheekPuff` — puffed cheeks
- `mouthPucker` — pursed lips
- `noseSneerLeft`, `noseSneerRight` — disgust

**Full list:** browDownLeft, browDownRight, browInnerUp, browOuterUpLeft, browOuterUpRight, cheekPuff, cheekSquintLeft, cheekSquintRight, eyeBlinkLeft, eyeBlinkRight, eyeLookDownLeft, eyeLookDownRight, eyeLookInLeft, eyeLookInRight, eyeLookOutLeft, eyeLookOutRight, eyeLookUpLeft, eyeLookUpRight, eyeSquintLeft, eyeSquintRight, eyeWideLeft, eyeWideRight, jawForward, jawLeft, jawOpen, jawRight, mouthClose, mouthDimpleLeft, mouthDimpleRight, mouthFrownLeft, mouthFrownRight, mouthFunnel, mouthLeft, mouthLowerDownLeft, mouthLowerDownRight, mouthPressLeft, mouthPressRight, mouthPucker, mouthRight, mouthRollLower, mouthRollUpper, mouthShrugLower, mouthShrugUpper, mouthSmileLeft, mouthSmileRight, mouthStretchLeft, mouthStretchRight, mouthUpperUpLeft, mouthUpperUpRight, noseSneerLeft, noseSneerRight.

### Eye Contact Detection Strategy
You don't need WebGazer.js. MediaPipe's eye blendshapes give you enough:
1. **"Looking at camera"** = `eyeLookInLeft` + `eyeLookInRight` are low (not cross-eyed), AND `eyeLookUpLeft/Right` and `eyeLookDownLeft/Right` are low (not looking up/down), AND `eyeLookOutLeft/Right` are low (not looking sideways)
2. Combine with **head pose** from the facial transformation matrix (pitch, yaw, roll) — if head is facing the camera AND eyes are centered, that's eye contact
3. Threshold-based: score 0-100 based on how centered the gaze is

### WebGazer.js Assessment
- **License: GPLv3** — this is a problem for any commercial or proprietary use
- Unmaintained since Feb 2026
- Designed for screen-coordinate gaze tracking (where on the webpage someone looks), not for detecting "is this person looking at the camera"
- Requires calibration via clicks — bad UX for a presentation tool
- **Verdict: Skip it.** MediaPipe blendshapes solve the eye contact problem more directly.

### face-api.js / @vladmandic/face-api Assessment
- Both are effectively dead (original abandoned 2020, vladmandic fork archived Feb 2025)
- 68 landmarks (vs MediaPipe's 478) — much less detailed
- Expression detection is coarser (7 categories: happy, sad, angry, disgusted, surprised, fearful, neutral)
- **Verdict: Skip.** MediaPipe's 52 blendshapes give you continuous expression values instead of discrete categories, which is far more useful for nuanced stage presence feedback.

---

## 3. Gesture Recognition

### Recommendation: MediaPipe Hand Landmarker + Gesture Recognizer

| Model | Landmarks | Built-in Gestures | Custom Gestures | npm Package | License |
|-------|-----------|-------------------|-----------------|-------------|---------|
| **MediaPipe Hand Landmarker** | 21 per hand | No | Via classifier | `@mediapipe/tasks-vision` | Apache 2.0 |
| **MediaPipe Gesture Recognizer** | 21 per hand | 7 + Unknown | Yes (Model Maker) | `@mediapipe/tasks-vision` | Apache 2.0 |
| TF.js Hand Pose | 21 per hand | No | Via classifier | `@tensorflow-models/hand-pose-detection` | Apache 2.0 |

### Built-in Gestures (MediaPipe Gesture Recognizer)
1. Closed_Fist
2. Open_Palm
3. Pointing_Up
4. Thumb_Down
5. Thumb_Up
6. Victory (peace sign)
7. ILoveYou (ASL)

### Stage Presence Gestures to Detect
Using the 21 hand landmarks, you can build custom classifiers for:
- **Open palm** (authoritative, commanding) — built-in
- **Pointing** (directing attention) — built-in (Pointing_Up, extend to Pointing_Forward)
- **Clasped hands** (nervous, closed) — detect when both hands' landmarks overlap
- **Hands behind back** (formal, hiding) — hands not detected + pose shows arms behind torso
- **Steepled fingers** (confidence) — fingertip landmarks touching, palms apart
- **Fidgeting hands** — high-frequency movement in finger landmarks
- **Illustrative gestures** — hand movement that correlates with speech patterns

### Custom Gesture Classification Approach
1. Use Hand Landmarker to get 21 landmarks per hand (x, y, z)
2. Normalize landmarks relative to wrist position
3. Calculate inter-finger distances and angles
4. Simple threshold-based rules work for most presentation gestures
5. For complex gestures: train a small classifier (even a decision tree) on the normalized landmarks
6. No need for Model Maker unless you want very specific gesture categories

### Performance Note
Hand Landmarker adds ~17ms latency per frame (Pixel 6 benchmark). On a MacBook with WebGL, expect ~10-15ms. Running simultaneously with pose and face will compound this.

---

## 4. Movement Analysis Algorithms

No additional ML models needed. All movement analysis derives from pose keypoints over time.

### Body Sway Detection
```
hip_midpoint = (left_hip + right_hip) / 2
sway_buffer = rolling_window(hip_midpoint.x, window_size=90)  // 3 seconds at 30fps
sway_score = std_deviation(sway_buffer)
// sway_score > 15px = excessive sway, < 5px = rigid/frozen
```

### Weight Shifting
```
weight_ratio = left_hip.y / right_hip.y
// ratio ~1.0 = balanced, >1.05 or <0.95 = shifting weight
shift_frequency = count_zero_crossings(weight_ratio - 1.0, per_minute)
// 2-6 shifts/min = natural, >10 = nervous
```

### Pacing Detection
```
position_x = hip_midpoint.x
velocity_x = derivative(position_x)
is_pacing = abs(velocity_x) > threshold AND duration > 1.5s
pacing_distance = max(position_x) - min(position_x) over pacing_period
```

### Fidgeting Detection
```
// For each extremity keypoint (wrists, hands, fingers):
movement_variance = rolling_variance(keypoint.x, keypoint.y, window=60)
fidget_score = weighted_sum(movement_variance for all extremity keypoints)
// High variance in small movements = fidgeting
// Distinguish from intentional gestures by amplitude: fidgets are <30px, gestures >50px
```

### Frozen/Stiff Detection
```
total_body_movement = sum(all_keypoint_displacements_per_frame)
if total_body_movement < threshold for > 5 seconds:
    flag "frozen/stiff — add natural movement"
```

### Space Usage
```
// Track bounding box of person over session
stage_coverage = convex_hull(all_hip_midpoint_positions)
stage_utilization = area(stage_coverage) / total_stage_area
// Low utilization = "rooted to one spot"
// High utilization = "good use of space" (unless pacing nervously)
```

---

## 5. Facial Expression Analysis

### Recommendation: MediaPipe Face Landmarker Blendshapes (already covered in Section 2)

No separate expression model needed. The 52 blendshapes from MediaPipe Face Landmarker give you:

### Expression Metrics for Stage Presence

**Smile Score:**
```
smile = (mouthSmileLeft + mouthSmileRight) / 2
// 0.0 = neutral, 0.3 = slight smile, 0.7+ = broad smile
```

**Expressiveness Score:**
```
// Standard deviation of all blendshape values over a 10-second window
// High std = animated, expressive face
// Low std = flat, monotone expression
```

**Brow Activity (engagement indicator):**
```
brow_movement = std_deviation([browDownLeft, browDownRight, browInnerUp,
                               browOuterUpLeft, browOuterUpRight], window=30s)
// Active brows = engaged, emphatic speaking
// Flat brows = monotone delivery
```

**Mouth Movement (speaking vs not):**
```
speaking_indicator = jawOpen > 0.1
speech_activity_ratio = frames_speaking / total_frames
// Low ratio during a presentation = not speaking enough, or long pauses
```

**Nervous Indicators:**
```
lip_press = (mouthPressLeft + mouthPressRight) / 2  // lip pressing = anxiety
lip_purse = mouthPucker  // pursed lips = discomfort
cheek_puff = cheekPuff  // holding breath
```

### face-api.js Expression Detection (for comparison)
Detects 7 discrete emotions: happy, sad, angry, disgusted, surprised, fearful, neutral.
**Why this is worse:** You get a single label, not continuous values. "Happy: 0.7" tells you less than "mouthSmileLeft: 0.45, mouthSmileRight: 0.52, cheekSquintLeft: 0.3" which reveals an asymmetric smile. Stage presence coaching needs nuance, not categories.

---

## 6. Technical Architecture Recommendations

### Recommended Stack

```
React 19 + Vite 7 + TypeScript
├── @mediapipe/tasks-vision (pose + face + hands — single package)
├── Web Workers (offload ML inference from UI thread)
├── Canvas API (draw skeleton/landmarks overlay)
├── MediaRecorder API (record video for post-session review)
├── Recharts or similar (session analytics dashboard)
└── localStorage / IndexedDB (session history, no server needed)
```

### Why MediaPipe over TensorFlow.js
1. **Single package** (`@mediapipe/tasks-vision`) gives you pose, face, and hands. TF.js requires three separate packages.
2. **Better face data**: 478 landmarks + 52 blendshapes vs TF.js's 468 landmarks with no blendshapes.
3. **3D pose data**: MediaPipe provides world coordinates in meters. MoveNet only gives 2D.
4. **Actively maintained by Google**: Last updates Jan 2025 (pose) and Jan 2026 (face).
5. **WASM backend**: Runs on WebAssembly, compatible with all modern browsers. No WebGPU dependency.
6. **Consistent API**: Same `createFromOptions` / `detectForVideo` pattern across all tasks.

### WebGPU vs WebGL for Inference

| Factor | WebGL | WebGPU |
|--------|-------|--------|
| Browser support | ~97% | ~83% (Firefox still flag-only) |
| ML inference speed | Baseline | 2-3x faster |
| Production readiness | Yes | Almost (Safari partial, Firefox behind flag) |
| MediaPipe support | Yes (WASM) | Not directly (MediaPipe uses its own WASM) |
| ONNX Runtime Web | Yes | Yes |
| TensorFlow.js | Yes | Yes |

**Recommendation:** MediaPipe uses its own WASM runtime, so WebGPU vs WebGL is not a factor for the core stack. If you add any ONNX or TF.js models later, target WebGL first with WebGPU as an enhancement for supported browsers.

### Web Workers Architecture

This is **critical**. MediaPipe's inference methods (`detectForVideo`) are synchronous and block the main thread. Without Web Workers, your UI will freeze.

```
Main Thread (React UI)
├── Camera feed (getUserMedia → <video> element)
├── Canvas overlay (draw landmarks, scores)
├── Dashboard (Recharts, session stats)
└── Posts video frames to Worker via OffscreenCanvas or ImageBitmap

Worker Thread (ML Inference)
├── MediaPipe Pose Landmarker
├── MediaPipe Face Landmarker
├── MediaPipe Hand Landmarker (optional — can skip if perf is tight)
├── Movement analysis algorithms (sway, fidget, pacing)
└── Posts results back to Main Thread via postMessage
```

**Key implementation detail:** You cannot pass `<video>` elements to Web Workers. Instead:
1. Use `OffscreenCanvas` to capture frames from the video element
2. Transfer the `ImageBitmap` to the worker via `postMessage` with `Transferable`
3. Run inference in the worker
4. Post landmark data back to the main thread for rendering

### Recording + Post-Session Analysis vs Real-Time

**Do both.** Here's why:

**Real-time feedback (during presentation):**
- Simple traffic-light indicators: green/yellow/red for posture, eye contact, movement
- No detailed charts — too distracting
- Audio cue option (subtle tone when eye contact drops)
- Minimal UI: small overlay bar at bottom of screen

**Post-session analysis (after presentation):**
- Full timeline with all metrics
- Video playback with landmark overlay
- Heatmaps (where you looked, where you stood)
- Statistics (% eye contact, avg posture score, fidget count, gesture frequency)
- Comparison across sessions (progress tracking)

**Recording approach:**
```
MediaRecorder API → Blob → IndexedDB (for playback)
Landmark data → JSON array → IndexedDB (for overlay replay)
// Store landmarks per frame, not per second — enables precise replay
```

### Video Playback with Overlay Annotations
1. Store the raw video via MediaRecorder
2. Store landmark data with timestamps in a parallel array
3. On playback, sync video currentTime with landmark data
4. Draw landmarks on a `<canvas>` overlay positioned over the `<video>` element
5. Allow toggling overlay layers (skeleton, face mesh, hand points, metrics)

---

## 7. Performance Considerations

### Combined Model Performance (Realistic Estimates)

| Configuration | Est. FPS (M1 MacBook) | Est. FPS (Intel i5 laptop) | Notes |
|---------------|----------------------|---------------------------|-------|
| Pose only | 30-50 | 20-35 | Smooth |
| Face only | 30-50 | 20-35 | Smooth |
| Hands only | 35-55 | 25-40 | Smooth |
| Pose + Face | 20-30 | 12-20 | Usable |
| Pose + Face + Hands | 15-25 | 8-15 | Minimum viable |
| All models via Holistic | 12-20 | 6-12 | Use if available |

**15 FPS is sufficient for stage presence analysis.** You're measuring posture and movement patterns that unfold over seconds, not frame-perfect motion capture.

### Optimization Strategies

1. **Frame skipping**: Process every 2nd or 3rd frame for face/hands, every frame for pose
2. **Adaptive quality**: Reduce video resolution when FPS drops below 12
3. **Model selection**: Run hands model only when pose detects arms in front of body
4. **Confidence gating**: Skip face blendshape computation when face detection confidence < 0.5
5. **Resolution**: 640x480 is sufficient. 1280x720 is overkill for landmark detection.
6. **requestAnimationFrame**: Sync inference with display refresh, not setInterval

### Battery and Thermal Considerations
- Continuous webcam + ML inference will drain a MacBook battery at ~2-3x normal rate
- After 20-30 minutes, thermal throttling may reduce FPS by 10-20%
- Mitigation: Offer a "power saver" mode that reduces to 10fps and disables hand tracking
- Show session timer and battery warning after 15 minutes

### Model Loading Times
| Model | Size | Cold Load Time |
|-------|------|---------------|
| Pose Landmarker (Full) | ~6MB | 1-3s |
| Face Landmarker | ~4MB | 1-2s |
| Hand Landmarker | ~3MB | 1-2s |
| WASM runtime | ~5MB | 2-4s |
| **Total** | **~18MB** | **3-6s** (parallel loading) |

Cache with Service Worker for instant subsequent loads.

---

## 8. Technology License Summary

| Technology | License | Browser-Based | Status | Recommended |
|------------|---------|---------------|--------|-------------|
| MediaPipe Tasks Vision | Apache 2.0 | Yes (WASM) | Active | **YES** |
| TF.js MoveNet | Apache 2.0 | Yes (WebGL/WASM) | Active | Backup option |
| TF.js BlazePose | Apache 2.0 | Yes (WebGL/WASM) | Active | No (use MediaPipe directly) |
| TF.js PoseNet | Apache 2.0 | Yes | **Deprecated** | No |
| @vladmandic/face-api | MIT | Yes | **Archived** (Feb 2025) | No |
| face-api.js (original) | MIT | Yes | **Abandoned** (2020) | No |
| WebGazer.js | **GPLv3** | Yes | **Unmaintained** (Feb 2026) | No |
| ONNX Runtime Web | MIT | Yes (WASM/WebGL/WebGPU) | Active | Optional |
| Transformers.js | Apache 2.0 | Yes (ONNX Runtime) | Active | Not for this use case |

---

## 9. Final Recommended Architecture

```
@mediapipe/tasks-vision (single npm install)
├── PoseLandmarker (33 keypoints, Full model)
│   → Posture, sway, pacing, fidgeting, space usage
├── FaceLandmarker (478 landmarks, 52 blendshapes)
│   → Eye contact, expressions, engagement, speaking detection
├── HandLandmarker (21 landmarks per hand)
│   → Gesture type, hand openness, fidgeting
└── GestureRecognizer (7 built-in + custom)
    → Named gesture classification

Processing Pipeline:
1. getUserMedia → <video> at 640x480
2. OffscreenCanvas → ImageBitmap → Web Worker
3. Worker runs PoseLandmarker + FaceLandmarker every frame
4. Worker runs HandLandmarker every 3rd frame (perf optimization)
5. Worker computes derived metrics (sway, fidget, eye contact score)
6. postMessage results to main thread
7. Main thread renders overlay on <canvas> + updates dashboard
8. MediaRecorder captures raw video in parallel
9. All data stored in IndexedDB for post-session review
```

### npm Packages Required
```json
{
  "@mediapipe/tasks-vision": "latest",
  "react": "^19.0.0",
  "recharts": "^2.x",
  "idb-keyval": "^6.x"
}
```

That's it. Four production dependencies for a complete browser-based stage presence analyzer. No cloud APIs, no paid services, no server required.

---

## 10. What This Research Does NOT Cover (Future Investigation)

- **Audio analysis integration**: Combining with DAWYM's existing Whisper-based speech analysis
- **AI-powered coaching feedback**: Using an LLM to generate natural-language coaching from the metrics
- **Multi-person tracking**: Analyzing a panel or group presentation
- **AR overlay**: Showing a "ghost" of ideal posture for the user to match
- **Calibration**: Personalizing thresholds based on the speaker's body type and style
