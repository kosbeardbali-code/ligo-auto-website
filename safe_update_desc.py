import re

file_path = 'src/App.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Update formData initial state
# Original: description: '', verifiedVin: false, galleryImages: [] });
pattern_form = r"(description:\s*'',)(\s*verifiedVin:\s*false,)"
repl_form = r"\1 description_en: '', description_ru: '',\2"
content = re.sub(pattern_form, repl_form, content)

# 2. Update Admin Modal Description Textareas
pattern_textarea = r'(<div className="space-y-1\.5">\s*<label[^>]*>Description complète</label>\s*<textarea.*?value=\{formData\.description\}.*?</textarea>\s*</div>)'
repl_textarea = r'''\1
              <div className="space-y-1.5 mt-4">
                <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">Description (English)</label>
                <textarea 
                  rows="3" 
                  placeholder="English description..." 
                  value={formData.description_en || ''} 
                  onChange={(e) => setFormData({...formData, description_en: e.target.value})} 
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all resize-none"
                ></textarea>
              </div>
              <div className="space-y-1.5 mt-4">
                <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">Description (Русский)</label>
                <textarea 
                  rows="3" 
                  placeholder="Русское описание..." 
                  value={formData.description_ru || ''} 
                  onChange={(e) => setFormData({...formData, description_ru: e.target.value})} 
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-[#D4AF37] rounded-xl py-2.5 px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all resize-none"
                ></textarea>
              </div>'''
content = re.sub(pattern_textarea, repl_textarea, content, flags=re.DOTALL)

# 3. Update the handleOpenEditModal
# Original: description: car.description || '', verifiedVin: car.verifiedVin || false,
pattern_edit = r"(description:\s*car\.description\s*\|\|\s*'',)(\s*verifiedVin:\s*car\.verifiedVin\s*\|\|\s*false,)"
repl_edit = r"\1 description_en: car.description_en || '', description_ru: car.description_ru || '',\2"
content = re.sub(pattern_edit, repl_edit, content)

# 4. Update the render logic for Car details description
# Original: {selectedCar.description && <p className="text-neutral-600 dark:text-neutral-400 font-light leading-relaxed">{selectedCar.description}</p>}
pattern_render = r'(\{selectedCar\.description && <p className="text-neutral-600 dark:text-neutral-400 font-light leading-relaxed">\{selectedCar\.description\}</p>\})'
repl_render = r'''{(() => {
                const desc = lang === 'en' && selectedCar.description_en 
                  ? selectedCar.description_en 
                  : lang === 'ru' && selectedCar.description_ru 
                    ? selectedCar.description_ru 
                    : selectedCar.description;
                return desc ? <p className="text-neutral-600 dark:text-neutral-400 font-light leading-relaxed whitespace-pre-line">{desc}</p> : null;
              })()}'''
content = re.sub(pattern_render, repl_render, content, flags=re.DOTALL)


# 5. Add description_en and description_ru to DEMO_CARS
def replace_demo_cars(m):
    desc = m.group(1)
    return f'{desc},\n    description_en: "Absolutely perfect condition. Exclusive collector configuration. Porsche Approved active warranty.",\n    description_ru: "Состояние абсолютно идеальное. Эксклюзивная коллекционная конфигурация. Активная гарантия Porsche Approved."'

pattern_demo = r'(description: "Состояние абсолютно идеальное[^"]*")'
content = re.sub(pattern_demo, replace_demo_cars, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Applied Data Model & Multilingual Description Updates!")
