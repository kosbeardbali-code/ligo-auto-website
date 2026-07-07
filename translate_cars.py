import re
import json

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Find the DEMO_CARS array
start_idx = content.find('const DEMO_CARS = [')
end_idx = content.find('];', start_idx) + 2

demo_cars_str = content[start_idx:end_idx]

import ast

def translate(text):
    # Dummy translation for now
    return text

print("Found cars length:", len(demo_cars_str))

