import re

def fix_html2canvas(file_path):
    with open(file_path, 'r') as f:
        html = f.read()

    # We currently have:
    # windowWidth: 1200,
    # scrollY: -window.scrollY
    
    html = html.replace('scrollY: -window.scrollY', 'windowHeight: area.scrollHeight + 200,\n    scrollY: -window.scrollY')

    with open(file_path, 'w') as f:
        f.write(html)

fix_html2canvas("schedule.html")
fix_html2canvas("player-rankings.html")
