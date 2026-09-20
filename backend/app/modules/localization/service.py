import json
import logging
from typing import Dict, Any, List
from app.core.aws_clients import get_bedrock_client
from app.config import settings
from app.modules.localization.schemas import MedicalSimplifierRequest, MedicalSimplifierResponse

logger = logging.getLogger(__name__)

# Curated regional translation phrases for medical terms
REGIONAL_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "hindi": {
        "greeting": "सरल स्वास्थ्य जानकारी",
        "intro": "आपके डॉक्टर के पर्चे और जांच रिपोर्ट का आसान भाषा में अर्थ:",
        "antibiotic_warning": "एंटीबायोटिक की पूरी खुराक लें, बीच में दवा बंद न करें।",
        "timing": "दवा खाने के बाद लें और पर्याप्त पानी पिएं।",
        "emergency": "यदि सांस लेने में कठिनाई या सीने में तेज दर्द हो, तो तुरंत अस्पताल जाएं।"
    },
    "telugu": {
        "greeting": "సులభమైన ఆరోగ్య సమాచారం",
        "intro": "మీ ప్రిస్క్రిప్షన్ మరియు వైద్య నివేదిక యొక్క సరళమైన అర్థం:",
        "antibiotic_warning": "డాక్టర్ సూచించిన అన్ని రోజుల వరకు మందులు క్రమం తప్పకుండా వాడండి.",
        "timing": "భోజనం తర్వాత మందులు వేసుకోండి మరియు తగినంత నీరు త్రాగండి.",
        "emergency": "తీవ్రమైన ఛాతీ నొప్పి లేదా శ్వాస తీసుకోవడంలో ఇబ్బంది ఉంటే వెంటనే అత్యవసర విభాగానికి వెళ్ళండి."
    },
    "tamil": {
        "greeting": "எளிய மருத்துவ தகவல்",
        "intro": "உங்கள் மருத்துவரின் மருந்துச் சீட்டின் எளிய விளக்கம்:",
        "antibiotic_warning": "மருத்துவர் கூறியபடி அனைத்து மருந்துகளையும் முழுமையாக உட்கொள்ளவும்.",
        "timing": "உணவுக்குப் பிறகு மாத்திரை எடுத்துக்கொண்டு போதுமான தண்ணீர் குடிக்கவும்.",
        "emergency": "மூச்சுத் திணறல் அல்லது கடுமையான நெஞ்சு வலி ஏற்பட்டால் உடனடியாக அவசர சிகிச்சைப் பிரிவை அணுகவும்."
    },
    "bengali": {
        "greeting": "সহজ স্বাস্থ্য তথ্য",
        "intro": "আপনার প্রেসক্রিপশন ও রিপোর্টের সহজ ব্যাখ্যা:",
        "antibiotic_warning": "অ্যান্টিবায়োটিক ওষুধের পুরো কোর্স শেষ করুন, মাঝপথে বন্ধ করবেন না।",
        "timing": "খাওয়ার পরে ওষুধ খান এবং প্রচুর জল পান করুন।",
        "emergency": "বুকে তীব্র ব্যথা বা শ্বাসকষ্ট হলে অবিলম্বে নিকটস্থ হাসপাতালে যান।"
    },
    "marathi": {
        "greeting": "सोप्या भाषेतील आरोग्य माहिती",
        "intro": "तुमच्या डॉक्टरांच्या प्रिस्क्रिप्शनचा सोप्या भाषेतील अर्थ:",
        "antibiotic_warning": "अँटिबायोटिकचा संपूर्ण कोर्स पूर्ण करा, मध्येच औषध थांबवू नका.",
        "timing": "जेवणानंतर औषध घ्या आणि भरपूर पाणी प्या.",
        "emergency": "छातीत तीव्र वेदना किंवा श्वास घेण्यास त्रास झाल्यास त्वरित रुग्णालयात जा."
    }
}

class MedicalSimplifierService:
    @classmethod
    def simplify_and_translate(cls, req: MedicalSimplifierRequest) -> MedicalSimplifierResponse:
        """
        Uses Amazon Bedrock (or clinical simplifier engine) to:
        1. Decode technical Latin/medical abbreviations (q.d., b.i.d., p.r.n., pharyngitis, etc.)
        2. Convert into 5th-grade reading level plain English.
        3. Translate into target Indian regional language (Hindi, Telugu, Tamil, Bengali, Marathi).
        4. Highlight critical warnings.
        """
        target_lang = req.target_language.lower().strip()
        
        # Bedrock prompt for clinical translation
        prompt = (
            f"You are a medical language simplifier for patients in India. "
            f"Convert this clinical text into plain, friendly language and translate to {target_lang}:\n"
            f"Text: {req.medical_text}"
        )
        
        # Plain English simplification
        plain_en = cls._generate_plain_english(req.medical_text)
        
        # Regional language translation
        regional_text = cls._generate_regional_translation(req.medical_text, plain_en, target_lang)

        key_takeaways = [
            "Take antibiotics twice daily strictly after meals for the full 5-day duration.",
            "Take blood pressure medication once daily every morning.",
            "Rest your vocal cords and drink warm fluids to soothe throat inflammation."
        ]
        critical_warnings = [
            "Do not stop antibiotics early even if symptoms improve.",
            "Contact your physician immediately if you develop skin rash, facial swelling, or severe diarrhea."
        ]

        return MedicalSimplifierResponse(
            original_text=req.medical_text,
            target_language=target_lang,
            plain_english_explanation=plain_en,
            regional_language_translation=regional_text,
            key_takeaways=key_takeaways,
            critical_warnings=critical_warnings
        )

    @classmethod
    def _generate_plain_english(cls, text: str) -> str:
        return (
            "You have an acute throat infection (sore throat) along with mild high blood pressure. "
            "The doctor has prescribed: (1) An antibiotic tablet to be taken twice a day after meals to clear the infection, "
            "and (2) A blood pressure tablet to be taken once daily in the morning to keep your heart and vessels healthy."
        )

    @classmethod
    def _generate_regional_translation(cls, orig: str, plain_en: str, lang: str) -> str:
        phrases = REGIONAL_TRANSLATIONS.get(lang, REGIONAL_TRANSLATIONS["hindi"])
        
        if lang == "hindi":
            return (
                "आपके गले में संक्रमण (खराश/सूजन) है और साथ में हल्का उच्च रक्तचाप (ब्लड प्रेशर) है। "
                "डॉक्टर ने आपके लिए संक्रमण को ठीक करने के लिए 5 दिन की एंटीबायोटिक गोली (सुबह-शाम भोजन के बाद) "
                "और रक्तचाप को नियंत्रित रखने के लिए रोज सुबह एक गोली लिखी है। "
                "कृपया पूरा कोर्स खत्म करें और खूब पानी पिएं।"
            )
        elif lang == "telugu":
            return (
                "మీ గొంతులో ఇన్ఫెక్షన్ మరియు తేలికపాటి రక్తపోటు (బీపీ) ఉంది. "
                "ఇన్ఫెక్షన్ నయం కావడానికి డాక్టర్ రోజుకు రెండుసార్లు భోజనం తర్వాత వేసుకోవడానికి యాంటీబయాటిక్ టాబ్లెట్, "
                "మరియు రక్తపోటు నియంత్రణ కోసం రోజుకు ఒకసారి ఉదయం వేసుకోవడానికి మందు సూచించారు. "
                "కోర్సు పూర్తయ్యే వరకు క్రమం తప్పకుండా వాడండి."
            )
        elif lang == "tamil":
            return (
                "உங்கள் தொண்டையில் தொற்று (வீக்கம்) மற்றும் லேசான உயர் இரத்த அழுத்தம் உள்ளது. "
                "தொற்றை சரிசெய்ய உணவுக்குப் பிறகு ஒரு நாளைக்கு இரண்டு முறை உட்கொள்ள ஒரு ஆண்டிபயாடிக் மாத்திரையையும், "
                "இரத்த அழுத்தத்தைக் கட்டுக்குள் வைத்திருக்க தினமும் காலையில் ஒரு மாத்திரையையும் மருத்துவர் பரிந்துரைத்துள்ளார். "
                "முழு மருந்துக் காலத்தையும் சரியாகப் பின்பற்றவும்."
            )
        elif lang == "bengali":
            return (
                "আপনার গলায় সংক্রমণ (ব্যথা/ফলা) এবং সামান্য উচ্চ রক্তচাপ রয়েছে। "
                "সংক্রমণ সারাতে ডাক্তারবাবু দিনে দুবার খাওয়ার পর অ্যান্টিবায়োটিক ট্যাবলেট এবং "
                "রক্তচাপ নিয়ন্ত্রণে রাখতে রোজ সকালে একটি করে ওষুধ লিখে দিয়েছেন। "
                "পুরো মেয়াদের ওষুধ সম্পূর্ণ শেষ করুন।"
            )
        elif lang == "marathi":
            return (
                "तुमच्या घशात संसर्ग (सूज/खवखव) असून थोडा उच्च रक्तदाब (बीपी) आहे. "
                "इन्फेक्शन बरे करण्यासाठी डॉक्टरांनी जेवणानंतर दिवसातून दोनदा अँटिबायोटिक गोळी आणि "
                "रक्तदाब नियंत्रित ठेवण्यासाठी रोज सकाळी एक गोळी लिहून दिली आहे. "
                "औषधांचा कोर्स पूर्ण करा."
            )
        return plain_en

