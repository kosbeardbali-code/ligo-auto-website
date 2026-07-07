filepath = "/Users/kos_beard/Desktop/auto/src/App.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert getFallbackSvg helper function definition
helper_function = """  // Dynamic theme-aware SVG fallback builder
  const getFallbackSvg = (width = 800, height = 500, fontSize = 24, letterSpacing = 3) => {
    const isDark = theme === 'dark';
    const bgFill = isDark ? '%23121214' : '%23F8F9FA';
    const borderStroke = isDark ? '%23D4AF37' : '%23C5A059';
    const textFill = isDark ? '%23D4AF37' : '%23C5A059';
    const strokeOpacity = isDark ? '0.3' : '0.2';
    
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${bgFill}"/><rect x="${width*0.01}" y="${height*0.01}" width="${width*0.98}" height="${height*0.98}" fill="none" stroke="${borderStroke}" stroke-width="${width > 600 ? 2 : 1}" opacity="${strokeOpacity}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${textFill}" letter-spacing="${letterSpacing}">LIGO AUTOMOBILES</text></svg>`;
  };

"""

# Insert it right after the theme useEffect hook ends (around line 307)
target_after = """    localStorage.setItem('theme', theme);
  }, [theme]);"""

if target_after in content:
    content = content.replace(target_after, target_after + "\n\n" + helper_function)
    print("Inserted getFallbackSvg helper successfully.")
else:
    print("Error: Could not find insert hook for getFallbackSvg helper.")

# 2. Replace hardcoded fallback strings
replacements = [
    # 400x250 dark/old fallbacks
    ('\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%230D0D0D"/><rect x="5" y="5" width="390" height="240" fill="none" stroke="%23D4AF37" stroke-width="1" opacity="0.3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="16" font-weight="bold" fill="%23D4AF37" letter-spacing="2">LIGO AUTOMOBILES</text></svg>\'',
     'getFallbackSvg(400, 250, 16, 2)'),
    ('\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23121214"/><rect x="5" y="5" width="390" height="240" fill="none" stroke="%23D4AF37" stroke-width="1" opacity="0.3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="16" font-weight="bold" fill="%23D4AF37" letter-spacing="2">LIGO AUTOMOBILES</text></svg>\'',
     'getFallbackSvg(400, 250, 16, 2)'),

    # 400x250 light fallbacks
    ('\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%23F5F5F7"/><rect x="5" y="5" width="390" height="240" fill="none" stroke="%23C5A059" stroke-width="1" opacity="0.3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="16" font-weight="bold" fill="%23C5A059" letter-spacing="2">LIGO AUTOMOBILES</text></svg>\'',
     'getFallbackSvg(400, 250, 16, 2)'),

    # 1200x800 dark fallbacks
    ('\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="100%" height="100%" fill="%23121214"/><rect x="10" y="10" width="1180" height="780" fill="none" stroke="%23D4AF37" stroke-width="2" opacity="0.3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="32" font-weight="bold" fill="%23D4AF37" letter-spacing="4">LIGO AUTOMOBILES</text></svg>\'',
     'getFallbackSvg(1200, 800, 32, 4)'),

    # 1200x800 light fallbacks
    ('\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="100%" height="100%" fill="%23F5F5F7"/><rect x="10" y="10" width="1180" height="780" fill="none" stroke="%23C5A059" stroke-width="2" opacity="0.3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="32" font-weight="bold" fill="%23C5A059" letter-spacing="4">LIGO AUTOMOBILES</text></svg>\'',
     'getFallbackSvg(1200, 800, 32, 4)'),

    # 800x500 dark fallbacks
    ('\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="100%" height="100%" fill="%23121214"/><rect x="8" y="8" width="784" height="484" fill="none" stroke="%23D4AF37" stroke-width="1.5" opacity="0.3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="24" font-weight="bold" fill="%23D4AF37" letter-spacing="3">LIGO AUTOMOBILES</text></svg>\'',
     'getFallbackSvg(800, 500, 24, 3)'),
]

for orig, repl in replacements:
    if orig in content:
        content = content.replace(orig, repl)
        print(f"Replaced fallback SVG with {repl}.")
    else:
        # Check if double quotes were used in place of single quotes in some places
        orig_double = orig.replace("'", '"')
        if orig_double in content:
            content = content.replace(orig_double, repl)
            print(f"Replaced double-quoted fallback SVG with {repl}.")
        else:
            print(f"Warning: Could not find fallback SVG block for {repl[:30]}.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SVG updates completed.")
