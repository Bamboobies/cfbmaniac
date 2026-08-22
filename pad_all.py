import re

def pad_file(file_path, bg_color):
    with open(file_path, 'r') as f:
        html = f.read()

    old_share = 'const blob = await new Promise(r => canvas.toBlob(r, "image/png"));'
    new_share = f"""const targetWidth = Math.max(canvas.width, canvas.height * (1200 / 630));
    const paddedCanvas = document.createElement("canvas");
    paddedCanvas.width = targetWidth;
    paddedCanvas.height = canvas.height;
    const ctx = paddedCanvas.getContext("2d");
    ctx.fillStyle = "{bg_color}";
    ctx.fillRect(0, 0, targetWidth, canvas.height);
    const offsetX = (targetWidth - canvas.width) / 2;
    ctx.drawImage(canvas, offsetX, 0);
    const blob = await new Promise(r => paddedCanvas.toBlob(r, "image/png"));"""

    if new_share not in html and old_share in html:
        html = html.replace(old_share, new_share)
        with open(file_path, 'w') as f:
            f.write(html)

pad_file("index.html", "#0a0a0a")
pad_file("conference.html", "#0a0a0a")
