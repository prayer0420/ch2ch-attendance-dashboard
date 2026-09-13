from faster_whisper import WhisperModel

audio = r"C:\Users\c\Documents\카카오톡 받은 파일\음성 260902_095141.m4a"
model = WhisperModel("medium", device="cpu", compute_type="int8")
segments, info = model.transcribe(audio, language="ko", beam_size=5, vad_filter=True)
print(f"LANG={info.language} PROB={info.language_probability:.3f} DURATION={info.duration:.2f}")
with open("transcription_medium.txt", "w", encoding="utf-8") as f:
    for s in segments:
        text = s.text.strip()
        if text:
            line = f"[{s.start:07.2f}–{s.end:07.2f}] {text}"
            print(line, flush=True)
            f.write(line + "\n")
