import { EdgeTTS } from '@andresaya/edge-tts';

const ALLOWED_VOICES = new Set([
  'en-PH-JamesNeural',
  'en-PH-RosaNeural',
  'en-US-JennyNeural',
  'en-US-GuyNeural',
  'en-US-AriaNeural',
]);

const DEFAULT_VOICE = 'en-PH-JamesNeural';

export default async function handler(req: any, res: any) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'Missing "text" query parameter' });
    }

    // Safety limit to avoid abuse
    if (text.length > 500) {
      return res.status(400).json({ error: 'Text exceeds maximum length of 500 characters' });
    }

    const requestedVoice = typeof req.query.voice === 'string' ? req.query.voice.trim() : DEFAULT_VOICE;
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;

    const rateParam = typeof req.query.rate === 'string' ? req.query.rate.trim() : '-15%'; // Default 0.85x cadence (-15%)

    const tts = new EdgeTTS();
    const result = await tts.generate(text, voice, {
      rate: rateParam,
    });

    if (!result || !result.audio) {
      return res.status(500).json({ error: 'Failed to synthesize audio buffer' });
    }

    const audioBuffer = result.audio;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).send(audioBuffer);
  } catch (error: any) {
    console.error('Edge TTS synthesis error:', error);
    return res.status(500).json({
      error: 'TTS synthesis error',
      message: error?.message || 'Unknown internal error',
    });
  }
}
