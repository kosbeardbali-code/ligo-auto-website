import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will just remove the duplicated lines from the TRANSLATIONS object

content = content.replace('''        prevImage: "Précédent (Gauche)",
        nextImage: "Suivant (Droite)",
        confirmDeletion: "Confirmer la suppression",
        navHelp: "Utilisez les touches ◄ et ► pour naviguer, Echap pour fermer",
        prevImage: "Précédent (Gauche)",
        nextImage: "Suivant (Droite)",
        confirmDeletion: "Confirmer la suppression",
        navHelp: "Utilisez les touches ◄ et ► pour naviguer, Echap pour fermer",''', '''        prevImage: "Précédent (Gauche)",
        nextImage: "Suivant (Droite)",
        confirmDeletion: "Confirmer la suppression",
        navHelp: "Utilisez les touches ◄ et ► pour naviguer, Echap pour fermer",''')

content = content.replace('''        prevImage: "Previous (Left)",
        nextImage: "Next (Right)",
        confirmDeletion: "Confirm Deletion",
        navHelp: "Use ◄ and ► to navigate, Esc to close",
        prevImage: "Previous (Left)",
        nextImage: "Next (Right)",
        confirmDeletion: "Confirm Deletion",
        navHelp: "Use ◄ and ► to navigate, Esc to close",''', '''        prevImage: "Previous (Left)",
        nextImage: "Next (Right)",
        confirmDeletion: "Confirm Deletion",
        navHelp: "Use ◄ and ► to navigate, Esc to close",''')

content = content.replace('''        prevImage: "Назад (Влево)",
        nextImage: "Вперед (Вправо)",
        confirmDeletion: "Подтвердить удаление",
        navHelp: "Используйте ◄ и ► для навигации, Esc для закрытия",
        prevImage: "Назад (Влево)",
        nextImage: "Вперед (Вправо)",
        confirmDeletion: "Подтвердить удаление",
        navHelp: "Используйте ◄ и ► для навигации, Esc для закрытия",''', '''        prevImage: "Назад (Влево)",
        nextImage: "Вперед (Вправо)",
        confirmDeletion: "Подтвердить удаление",
        navHelp: "Используйте ◄ и ► для навигации, Esc для закрытия",''')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
