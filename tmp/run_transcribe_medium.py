from faster_whisper import WhisperModel
from pathlib import Path
model_path = r'''C:\Users\c\.cache\huggingface\hub\models--Systran--faster-whisper-medium\snapshots\08e178d48790749d25932bbc082711ddcfdfbc4f'''
audio = r'''C:\Users\c\Documents\카카오톡 받은 파일\음성 260903_170412.m4a'''
out = Path(r'''C:\Users\c\OneDrive\문서\등촌프로젝트\tmp\recording_transcript_medium.txt''')
model = WhisperModel(model_path, device='cpu', compute_type='int8')
segments, info = model.transcribe(audio, language='ko', beam_size=5, vad_filter=True, vad_parameters={'min_silence_duration_ms': 700, 'speech_pad_ms': 400}, condition_on_previous_text=False, temperature=0.0)
lines = [f'[metadata] language={info.language} probability={info.language_probability:.3f} duration={info.duration:.1f}s']
for s in segments:
    text=s.text.strip()
    if text:
        lines.append(f'[{s.start:08.2f} --> {s.end:08.2f}] {text}')
out.write_text('\n'.join(lines), encoding='utf-8')
print(out)
print('duration=', info.duration, 'language=', info.language, 'prob=', info.language_probability)
print('segments=', len(lines)-1)
