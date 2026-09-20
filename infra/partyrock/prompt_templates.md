# PartyRock Integration Blueprint: CareSphere Symptom Q&A

PartyRock (powered by Amazon Bedrock) allows rapid prototyping of generative AI applications with no-code widgets. 

## App Blueprint: "CareSphere Adaptive Triage"

### 1. User Input Widget
- **Widget Type**: Text Input
- **Label**: `Describe your symptoms, duration, and body temperature`
- **Placeholder**: `e.g. Mild headache with 101F fever since yesterday evening...`

### 2. Adaptive Follow-up Generator (Bedrock Claude 3 Sonnet)
- **Widget Type**: Text Generation
- **Prompt**:
```text
You are an empathetic, clinical AI triage assistant in India. 
Based on the patient's symptoms: "@User_Input"
1. Identify 2 clarifying follow-up questions (e.g. onset speed, rash, breathing difficulty).
2. Format as multiple-choice options so the patient can easily tap their answer.
```

### 3. Risk Category & Guidance Widget
- **Widget Type**: Text Generation
- **Prompt**:
```text
Analyze the combined context from "@User_Input" and "@Follow_up_Answers":
Assign one of four triage tiers:
- EMERGENCY (Red: Call 108 immediately)
- HIGH RISK (Orange: See specialist today)
- MODERATE RISK (Yellow: Visit GP within 24 hours)
- LOW RISK (Green: Home hydration & rest)

Explain the clinical rationale and suggest immediate first-aid steps.
```

### 4. Regional Simplifier Widget (Hindi / Regional)
- **Widget Type**: Text Generation
- **Prompt**:
```text
Translate the above triage recommendation from "@Risk_Guidance" into simple, conversational Hindi using Devanagari script, avoiding technical medical jargon.
```

