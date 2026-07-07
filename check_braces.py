import re
content = open('src/App_test.tsx').read()
pattern = r'<div className="space-y-1\.5 mt-4">.*?</div>'
content_replaced = re.sub(pattern, 'null', content, flags=re.DOTALL)
with open('src/App_test.tsx', 'w') as f:
    f.write(content_replaced)
