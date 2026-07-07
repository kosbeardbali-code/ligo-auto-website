import sys
import subprocess

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def check(content):
    with open('src/App_test.tsx', 'w') as f:
        f.write(content)
    # run esbuild
    proc = subprocess.run(
        ['/Users/kos_beard/Desktop/auto/.node/bin/npx', 'esbuild', 'src/App_test.tsx'],
        capture_output=True, text=True
    )
    return proc.returncode == 0

for i in range(1000, len(lines), 50):
    test_lines = lines[:i] + lines[i+50:]
    if check("".join(test_lines)):
        print(f"Error is between lines {i} and {i+50}")
        sys.exit(0)
print("Could not isolate by removing 50-line chunks")
