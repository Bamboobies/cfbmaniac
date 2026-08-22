import re

def fix_all(file_path):
    with open(file_path, 'r') as f:
        html = f.read()

    # Look for html2canvas calls that DON'T have windowWidth already
    replacement = r'html2canvas(\1, {\2\n      windowWidth: 1200,\n      windowHeight: 2000,\n      scrollY: -window.scrollY'
    
    html = re.sub(
        r'html2canvas\(([^,]+), \{([\s\S]*?useCORS: true(?:,\s*logging: false)?)\s*\}',
        lambda m: f"html2canvas({m.group(1)}, {{{m.group(2)},\n      windowWidth: 1200,\n      windowHeight: ({m.group(1)} === capture ? capture.scrollHeight + 200 : ({m.group(1)}.scrollHeight ? {m.group(1)}.scrollHeight + 200 : 2000)),\n      scrollY: -window.scrollY\n    }}",
        html
    )

    with open(file_path, 'w') as f:
        f.write(html)

fix_all("index.html")
fix_all("conference.html")
