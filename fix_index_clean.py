import re

def clean_file(file_path):
    with open(file_path, 'r') as f:
        html = f.read()

    # Replace the weird ternary with just the element height
    html = re.sub(
        r'windowHeight:\s*\(.*?\),\n',
        r'windowHeight: 2500,\n',
        html
    )

    with open(file_path, 'w') as f:
        f.write(html)

clean_file("index.html")
clean_file("conference.html")
