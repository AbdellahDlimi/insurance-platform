"""
Script d'ingestion des documents de démo TrustPool (FR + AR).
Exécuter une seule fois après la création des tables :
  cd backend && python -m app.ai.rag_copilote.seed_data
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from dotenv import load_dotenv
load_dotenv()

from app.core.database import SessionLocal
from app.ai.rag_common.vector_store import VectorStore

FAQ_FR = """
# FAQ TrustPool — Plateforme d'Assurance Collaborative P2P

## Qu'est-ce que TrustPool ?
TrustPool est une plateforme d'assurance mutuelle entre pairs (P2P). Les membres se regroupent selon leurs besoins communs et mutualisent leurs cotisations pour se couvrir mutuellement contre les sinistres.

## Comment rejoindre un groupe ?
Pour rejoindre un groupe, allez dans la section "Groupes", choisissez un groupe ouvert correspondant à vos besoins, et cliquez sur "Demander à rejoindre". L'admin du groupe validera votre demande après vérification de votre KYC.

## Qu'est-ce que le KYC ?
Le KYC (Know Your Customer) est la vérification d'identité obligatoire. Vous devez soumettre une pièce d'identité valide (CIN, passeport). Sans KYC validé, vous ne pouvez pas rejoindre de groupe.

## Comment fonctionne le paiement des cotisations ?
Les cotisations sont prélevées mensuellement via Stripe (carte bancaire). Le montant est calculé selon votre coefficient de risque (1.0 par défaut, augmente en cas de sinistres fréquents). Vous recevez une notification avant chaque prélèvement.

## Qu'est-ce que la cagnotte du groupe ?
La cagnotte est le fonds commun du groupe. Elle accumule les cotisations et sert à rembourser les sinistres validés. Chaque groupe a une cagnotte et un buffer pool (réserve de sécurité).

## Comment déclarer un sinistre ?
Allez sur la page de votre groupe, cliquez sur "Déclarer un sinistre", décrivez l'incident, indiquez le montant, et uploadez les pièces justificatives. L'admin du groupe reçoit une notification et traite votre demande.

## Quels documents faut-il pour un sinistre ?
Selon le type de sinistre : factures, photos, rapports de police, certificats médicaux, devis de réparation. Plus les preuves sont solides, plus le traitement est rapide.

## Combien de temps pour traiter un sinistre ?
L'admin du groupe dispose de 14 jours pour valider ou rejeter un sinistre. Vous recevez une notification par email dès qu'une décision est prise.

## Que se passe-t-il si un sinistre est rejeté ?
Vous recevez un email expliquant les raisons du rejet. Vous pouvez contacter l'admin pour plus d'informations ou soumettre des documents complémentaires.

## Comment quitter un groupe ?
Contactez l'admin de votre groupe. Notez que des cotisations en cours ne peuvent pas être annulées. Le remboursement partiel dépend du règlement du groupe.

## Comment sont calculés les coefficients de risque ?
Le coefficient commence à 1.0. Il augmente proportionnellement au nombre de sinistres déclarés dans une période. Un coefficient élevé entraîne des cotisations plus élevées.

## Mes données personnelles sont-elles sécurisées ?
Oui. Les documents KYC sont chiffrés (AES-256) et stockés séparément de votre profil. Seule l'équipe de conformité peut y accéder dans le cadre de vérifications réglementaires.
"""

FAQ_AR = """
# الأسئلة الشائعة — منصة TrustPool للتأمين التعاوني

## ما هي منصة TrustPool؟
TrustPool هي منصة للتأمين المتبادل بين الأفراد (P2P). يتجمع الأعضاء حسب احتياجاتهم المشتركة ويجمعون اشتراكاتهم لتغطية الحوادث بشكل جماعي.

## كيف أنضم إلى مجموعة؟
للانضمام إلى مجموعة، اذهب إلى قسم "المجموعات"، اختر مجموعة مفتوحة تناسب احتياجاتك، واضغط على "طلب الانضمام". سيقوم مسؤول المجموعة بالموافقة على طلبك بعد التحقق من هويتك.

## ما هو التحقق من الهوية KYC؟
KYC هو التحقق الإلزامي من الهوية. يجب تقديم وثيقة هوية سارية (بطاقة وطنية أو جواز سفر). بدون التحقق الناجح، لا يمكنك الانضمام إلى أي مجموعة.

## كيف تعمل المدفوعات؟
تُخصم الاشتراكات شهرياً عبر Stripe (بطاقة بنكية). يُحسب المبلغ وفق معامل المخاطرة الخاص بك (1.0 افتراضياً، يرتفع عند كثرة الحوادث). ستتلقى إشعاراً قبل كل خصم.

## ما هو صندوق المجموعة؟
الصندوق هو الصندوق المشترك للمجموعة. يجمع الاشتراكات ويُستخدم لتغطية الحوادث المعتمدة. لكل مجموعة صندوق واحتياطي أمان (buffer pool).

## كيف أُبلّغ عن حادثة؟
اذهب إلى صفحة مجموعتك، اضغط على "الإبلاغ عن حادثة"، صف الحادثة، حدد المبلغ، وارفع الوثائق الداعمة. يتلقى مسؤول المجموعة إشعاراً فورياً.

## ما المستندات المطلوبة للحادثة؟
حسب نوع الحادثة: فواتير، صور، تقارير شرطية، شهادات طبية، عروض أسعار الإصلاح. كلما كانت الأدلة أقوى، كان المعالجة أسرع.

## كم يستغرق معالجة الحادثة؟
يملك مسؤول المجموعة 14 يوماً للموافقة أو الرفض. ستتلقى إشعاراً بالبريد الإلكتروني فور اتخاذ القرار.

## ما هي حقوق بياناتي الشخصية؟
نعم، بياناتك محمية. وثائق الهوية مشفرة (AES-256) وتُخزن بشكل منفصل عن ملفك الشخصي. لا يمكن الوصول إليها إلا من قِبل فريق الامتثال.

## كيف يُحسب معامل المخاطرة؟
يبدأ المعامل عند 1.0 ويرتفع بشكل متناسب مع عدد الحوادث المُبلَّغ عنها. معامل مرتفع يعني اشتراكات أعلى.
"""

REGLEMENT_FR = """
# Règlement Intérieur Type — Groupe TrustPool

## Article 1 — Objet et Définitions
Le présent règlement régit le fonctionnement du groupe d'assurance mutuelle constitué sur la plateforme TrustPool. Le "Groupe" désigne l'ensemble des membres ayant adhéré. Le "Sinistre" désigne tout événement couvert par la spécialité du groupe.

## Article 2 — Conditions d'Adhésion
- Avoir complété le KYC (vérification d'identité) avec succès.
- Accepter le règlement intérieur du groupe.
- Disposer d'un moyen de paiement valide enregistré.
- Ne pas avoir de sinistres frauduleux à son actif.

## Article 3 — Cotisations
3.1 Le montant de base est fixé par l'admin du groupe et affiché lors de l'adhésion.
3.2 Le montant réel = montant_base × coefficient_risque_individuel.
3.3 Les cotisations sont dues le 1er de chaque mois.
3.4 Tout retard de paiement supérieur à 7 jours entraîne la suspension temporaire des droits.

## Article 4 — Déclaration de Sinistre
4.1 Le sinistre doit être déclaré dans les 30 jours suivant l'événement.
4.2 La déclaration doit inclure : description détaillée, date, montant estimé, pièces justificatives.
4.3 Toute fausse déclaration entraîne l'exclusion définitive et des poursuites éventuelles.

## Article 5 — Traitement des Sinistres
5.1 L'admin dispose de 14 jours ouvrables pour rendre sa décision.
5.2 En cas de litige, l'équipe de conformité TrustPool peut être saisie.
5.3 Le remboursement intervient dans les 7 jours suivant la validation.

## Article 6 — Cagnotte et Buffer Pool
6.1 La cagnotte est alimentée par les cotisations mensuelles de tous les membres.
6.2 Le buffer pool représente la réserve de sécurité, inutilisable pour les sinistres courants.
6.3 Si la cagnotte est insuffisante, une cotisation exceptionnelle peut être déclenchée par l'admin.

## Article 7 — Exclusion
Sont exclus : fraude avérée, non-paiement répété, comportement abusif envers les membres.

## Article 8 — Confidentialité
Les informations des membres sont strictement confidentielles. L'identité des membres est protégée par l'anonymat de la plateforme, sauf levée d'anonymat ordonnée dans le cadre légal.
"""

REGLEMENT_AR = """
# النظام الداخلي النموذجي — مجموعة TrustPool

## المادة 1 — الهدف والتعريفات
يُنظّم هذا النظام عمل مجموعة التأمين المتبادل المُشكّلة على منصة TrustPool. "المجموعة" تعني جميع الأعضاء المنضمين. "الحادثة" تعني أي حدث تغطيه تخصص المجموعة.

## المادة 2 — شروط الانضمام
- إتمام التحقق من الهوية (KYC) بنجاح.
- قبول النظام الداخلي للمجموعة.
- توفر وسيلة دفع صالحة.
- عدم وجود حوادث احتيالية سابقة.

## المادة 3 — الاشتراكات
3.1 يحدد مسؤول المجموعة المبلغ الأساسي ويُعرض عند الانضمام.
3.2 المبلغ الفعلي = المبلغ_الأساسي × معامل_المخاطرة_الفردي.
3.3 تُدفع الاشتراكات في أول كل شهر.
3.4 أي تأخر في الدفع يتجاوز 7 أيام يؤدي إلى تعليق مؤقت للحقوق.

## المادة 4 — الإبلاغ عن الحوادث
4.1 يجب الإبلاغ عن الحادثة خلال 30 يوماً من وقوعها.
4.2 يجب أن يتضمن البلاغ: وصفاً تفصيلياً، التاريخ، المبلغ المُقدَّر، الوثائق الداعمة.
4.3 أي إبلاغ كاذب يُفضي إلى الإقصاء النهائي والملاحقة القانونية المحتملة.

## المادة 5 — معالجة الحوادث
5.1 يملك المسؤول 14 يوم عمل لإصدار قراره.
5.2 في حال النزاع، يمكن إخطار فريق امتثال TrustPool.
5.3 يتم التعويض خلال 7 أيام من الموافقة.

## المادة 6 — الصندوق والاحتياطي
6.1 يُموَّل الصندوق من اشتراكات الأعضاء الشهرية.
6.2 يمثل الاحتياطي الأمان ولا يُستخدم للحوادث الجارية.
6.3 إذا كان الصندوق غير كافٍ، يمكن للمسؤول تفعيل اشتراك استثنائي.

## المادة 7 — الإقصاء
يُقصى الأعضاء في حال: الاحتيال المُثبَت، التخلف المتكرر عن الدفع، السلوك المسيء.

## المادة 8 — السرية
معلومات الأعضاء سرية تاماً. هوية الأعضاء محمية بالإخفاء على المنصة، إلا في حالات رفع الإخفاء المقررة قانونياً.
"""

def seed():
    db = SessionLocal()
    vs = VectorStore()
    try:
        print("🌱 Ingestion des documents de démo TrustPool...")

        docs = [
            ("faq_fr",       "fr", "FAQ TrustPool — Français",          FAQ_FR),
            ("faq_ar",       "ar", "الأسئلة الشائعة — TrustPool",       FAQ_AR),
            ("reglement_fr", "fr", "Règlement Intérieur — Français",     REGLEMENT_FR),
            ("reglement_ar", "ar", "النظام الداخلي النموذجي",           REGLEMENT_AR),
        ]

        for collection, langue, titre, contenu in docs:
            n = vs.ingest_document(db, collection, contenu, langue=langue, titre=titre)
            print(f"  ✅ {collection} → {n} chunks")

        print("\n✅ Seed terminé ! Collections RAG prêtes.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
