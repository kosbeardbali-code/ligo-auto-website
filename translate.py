import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def add_translations(match):
    block = match.group(0)
    
    # Check if description_en is already there
    if 'description_en:' in block:
        return block
        
    # Extract the description
    desc_match = re.search(r'description:\s*"([^"]+)"', block)
    if not desc_match:
        return block
        
    desc_fr = desc_match.group(1)
    
    # Simple translations for the demo cars
    translations = {
        "Véhicule de démonstration. Full options, pack carbone extérieur et intérieur.": {
            "en": "Demonstration vehicle. Full options, exterior and interior carbon pack.",
            "ru": "Демонстрационный автомобиль. Полная комплектация, внешний и внутренний карбоновый пакет."
        },
        "Origine France, première main. Entretien exclusif réseau officiel.": {
            "en": "French origin, first owner. Exclusive official network maintenance.",
            "ru": "Куплен во Франции, один владелец. Обслуживание исключительно у официального дилера."
        },
        "État exceptionnel, configuration rare. Historique limpide.": {
            "en": "Exceptional condition, rare configuration. Clear history.",
            "ru": "Исключительное состояние, редкая конфигурация. Прозрачная история."
        },
        "Véhicule de passionné, suivi rigoureux. Traitement céramique complet.": {
            "en": "Enthusiast's vehicle, rigorous maintenance. Full ceramic coating.",
            "ru": "Автомобиль энтузиаста, строгое обслуживание. Полное керамическое покрытие."
        },
        "Garantie constructeur active. Véhicule comme neuf.": {
            "en": "Active manufacturer warranty. Vehicle like new.",
            "ru": "Действующая гарантия производителя. Автомобиль как новый."
        }
    }
    
    en = translations.get(desc_fr, {}).get("en", "Full options. Perfect condition.")
    ru = translations.get(desc_fr, {}).get("ru", "Полная комплектация. Идеальное состояние.")
    
    # Inject before verifiedVin
    replacement = f'description: "{desc_fr}",\n    description_en: "{en}",\n    description_ru: "{ru}",\n    verifiedVin:'
    
    new_block = re.sub(r'description:\s*"[^"]+",\s*verifiedVin:', replacement, block)
    
    return new_block

# Find the DEMO_CARS definition
start_idx = content.find('const DEMO_CARS = [')
end_idx = content.find('];\n', start_idx)

if start_idx != -1 and end_idx != -1:
    demo_cars_section = content[start_idx:end_idx]
    
    # Regex to match each car object
    modified_section = re.sub(r'\{\s*id:.*?\}\s*(?=,|\])', add_translations, demo_cars_section, flags=re.DOTALL)
    
    content = content[:start_idx] + modified_section + content[end_idx:]
    
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Updated DEMO_CARS translations.")
else:
    print("Could not find DEMO_CARS")
