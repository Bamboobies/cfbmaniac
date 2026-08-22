import re

def pad_handle_share(file_path, bg_color):
    with open(file_path, 'r') as f:
        html = f.read()

    old_logic = 'const base64Image = canvas.toDataURL("image/png");'
    new_logic = f"""const targetWidth = Math.max(canvas.width, canvas.height * (1200 / 630));
  const paddedCanvas = document.createElement("canvas");
  paddedCanvas.width = targetWidth;
  paddedCanvas.height = canvas.height;
  const ctx = paddedCanvas.getContext("2d");
  ctx.fillStyle = "{bg_color}";
  ctx.fillRect(0, 0, targetWidth, canvas.height);
  const offsetX = (targetWidth - canvas.width) / 2;
  ctx.drawImage(canvas, offsetX, 0);
  const base64Image = paddedCanvas.toDataURL("image/png");"""

    if new_logic not in html and old_logic in html:
        html = html.replace(old_logic, new_logic)
        with open(file_path, 'w') as f:
            f.write(html)

pad_handle_share("index.html", "#0a0a0a")
pad_handle_share("conference.html", "#0a0a0a")
