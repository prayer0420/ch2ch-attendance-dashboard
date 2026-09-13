import re

src = "transcription_medium.txt"
dst = "음성 260902_095141_한국어전사.txt"
pat = re.compile(r"^\[(\d+\.\d+)–(\d+\.\d+)\] (.*)$")
lines = []
prev_end = 0.0
with open(src, encoding="utf-8") as f:
    for raw in f:
        line = raw.rstrip("\n")
        m = pat.match(line)
        if not m:
            continue
        start, end = float(m.group(1)), float(m.group(2))
        if start - prev_end >= 2.0:
            lines.append(f"[{prev_end:07.2f}–{start:07.2f}] [청취 불가]")
        lines.append(line)
        prev_end = end

duration = 1491.95
if duration - prev_end >= 2.0:
    lines.append(f"[{prev_end:07.2f}–{duration:07.2f}] [청취 불가]")

with open(dst, "w", encoding="utf-8") as f:
    f.write("※ 시간표시 포함 한국어 자동 전사본입니다. 음질·전문용어로 식별이 어려운 구간은 [청취 불가]로 표시했습니다.\n\n")
    f.write("\n".join(lines) + "\n")
