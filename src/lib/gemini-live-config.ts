// Central config for the browser <-> Gemini Live API session powering the
// "Live Agent" tab (src/app/live). Same spirit as ROS_CONFIG: no inline model
// names / endpoints / magic numbers scattered through the hook & components.

export const GEMINI_LIVE_CONFIG = {
  // Half-cascade Live model: realtime spoken dialog + streaming video frame
  // input. Override with GEMINI_LIVE_MODEL in .env.local. Native-audio preview
  // models also work but are less stable for continuous video.
  DEFAULT_MODEL: 'gemini-3.1-flash-live-preview',

  // Required API surface for ephemeral auth tokens and the Live WebSocket.
  API_VERSION: 'v1alpha',

  // Mic capture -> Gemini. The Live API expects 16 kHz mono PCM16 little-endian.
  INPUT_SAMPLE_RATE: 16000,
  // Gemini -> speakers. The Live API always returns 24 kHz mono PCM16.
  OUTPUT_SAMPLE_RATE: 24000,

  // Robot camera frames -> Gemini. Kept deliberately light: a frame every
  // 1.5 s at 512 px / q0.5 is ~10-20 KB, so the operator's uplink stays clear
  // for the PCM audio + the LiveKit WebRTC traffic. The Live API only samples
  // video around 1 fps server-side anyway.
  FRAME_INTERVAL_MS: 1500,
  FRAME_MAX_WIDTH: 512,
  FRAME_JPEG_QUALITY: 0.5,

  WORKLET_MIC_URL: '/worklets/live-mic-worklet.js',
  WORKLET_PLAYER_URL: '/worklets/live-audio-out-worklet.js',

  SYSTEM_INSTRUCTION:
    'You are EcoBot Copilot (එකෝබොට් සහායක), a live visual assistant for a ' +
    'remote operator driving an autonomous mobile manipulator robot.\n\n' +
    'LANGUAGE: Always speak in natural, conversational Sinhala (සිංහල). Reply in ' +
    'Sinhala even when the operator speaks English or another language. Keep ' +
    'established technical terms (ROS, LiDAR, WiFi, camera names, numbers/units) ' +
    'as-is where there is no common Sinhala word - do not force awkward ' +
    'translations.\n\n' +
    "ROLE: You can see the robot's camera feed and hear the operator speak. " +
    'Help them understand what the robot is looking at: identify plants, ' +
    'obstacles, people, equipment and hazards; estimate rough distance and ' +
    'direction relative to the robot; give short spoken guidance. Keep replies ' +
    'concise and conversational unless asked for detail. The operator can switch ' +
    'which camera you see (main navigation camera, wrist/arm camera, or the ' +
    'detection overlay) - adapt immediately when they do. You cannot drive or ' +
    'move the robot yourself; describe and advise only.',

  // Sent as a hidden user turn once the session is ready, so the agent opens
  // the conversation instead of waiting silently.
  GREETING_PROMPT:
    '(සම්බන්ධතාවය දැන් ආරම්භ විය. ක්‍රියාකරු තවම කතා කර නැත. ඔවුන්ට සිංහලෙන් ' +
    'උණුසුම් ලෙස කෙටියෙන් ආයුබෝවන් කියා, රොබෝවාගේ කැමරාව හරහා ඔබට උදව් කළ ' +
    'හැකි දේ එක් කෙටි වාක්‍යයකින් පවසන්න.)',
};
