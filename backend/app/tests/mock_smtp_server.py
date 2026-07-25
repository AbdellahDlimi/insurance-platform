import asyncio
import os
from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Message

class SaveEmailHandler(Message):
    def handle_message(self, message):
        print(f"\n📩 Email recu de {message['From']} a {message['To']}")
        print(f"📌 Sujet : {message['Subject']}")
        
        output_dir = os.path.join(os.path.dirname(__file__), "..", "..")
        filename = os.path.join(output_dir, "email_test_result.eml")
        
        with open(filename, "w", encoding="utf-8") as f:
            f.write(message.as_string())
            
        print(f"✅ Email complet (avec piece jointe PDF) sauvegarde dans :")
        print(f"   📂 {os.path.abspath(filename)}")
        print("   (Tu peux ouvrir ce fichier avec Thunderbird, Outlook, ou un editeur de texte)")
        print("\n⏳ En attente de nouveaux emails...")

if __name__ == "__main__":
    handler = SaveEmailHandler()
    controller = Controller(handler, hostname="127.0.0.1", port=1025)
    controller.start()
    print("🚀 Mock SMTP Server ecoute sur localhost:1025")
    print("Lance ton test dans un autre terminal !")
    print("Appuie sur Ctrl+C pour arreter le serveur.")
    try:
        asyncio.get_event_loop().run_forever()
    except KeyboardInterrupt:
        print("\n🛑 Arret du serveur.")
