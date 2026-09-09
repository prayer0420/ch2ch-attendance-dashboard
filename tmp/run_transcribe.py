from faster_whisper import WhisperModel
from pathlib import Path
import sys
model_path = r'''C:\Users\c\.cache\huggingface\hub\models--Systran--faster-whisper-small\snapshots\536b0662742c02347bc0e980a01041f333bce120'''
audio = r'''C:\Users\c\Documents\카카오톡 받은 파일\음성 260903_170412.m4a'''
out = Path(r'''C:\Users\c\OneDrive\문서\등촌프로젝트\tmp\recording_transcript.txt''')
model = WhisperModel(model_path, device='cpu', compute_type='int8')
segments, info = model.transcribe(audio, language='ko', beam_size=5, vad_filter=True, condition_on_previous_text=True)
lines = [f'[metadata] language={info.language} probability={info.language_probability:.3f} duration={info.duration:.1f}s']
for s in segments:
    lines.append(f'[{s.start:08.2f} --> {s.end:08.2f}] {s.text.strip()}')
out.write_text('\n'.join(lines), encoding='utf-8')
print(out)
print('duration=', info.duration, 'language=', info.language, 'prob=', info.language_probability)
print('segments=', len(lines)-1)
