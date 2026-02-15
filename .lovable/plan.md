

# Plan : Assistant IA ameliore - Reponses courtes, vocaux et fichiers

## Objectif
Transformer l'assistant en un vrai agent IA conversationnel avec :
1. Des reponses courtes et percutantes (max 2-3 phrases)
2. Envoi et reception de messages vocaux
3. Envoi et reception de fichiers/images
4. L'assistant pose des questions pour affiner ses reponses

---

## 1. Prompt systeme ameliore (Backend)

**Fichier : `supabase/functions/chat/index.ts`**

Modifier le prompt systeme pour :
- Forcer des reponses ultra-courtes (1-3 phrases max, jamais de paragraphes)
- Poser des questions de clarification avant de repondre si le contexte manque
- Adopter un ton direct et conversationnel comme un vrai coach en face-a-face
- Utiliser des questions ouvertes pour mieux comprendre la situation financiere

Exemple de nouveau prompt :
```
Tu reponds TOUJOURS en 1 a 3 phrases maximum. Jamais plus.
Si tu manques d'info, pose UNE question precise avant de conseiller.
Parle comme un ami coach, pas comme un article de blog.
```

---

## 2. Messages vocaux (Frontend)

**Fichier : `src/pages/Assistant.tsx`**

### Enregistrement vocal (utilisateur vers IA)
- Ajouter un bouton micro a cote du bouton envoyer
- Utiliser l'API `MediaRecorder` du navigateur pour capturer l'audio
- Convertir l'audio en texte via une nouvelle Edge Function `speech-to-text` qui utilise le modele Gemini (supporte l'audio nativement)
- Afficher un indicateur d'enregistrement en cours (animation pulse rouge)

### Lecture vocale (IA vers utilisateur)
- Ajouter un bouton "play" sur chaque message de l'assistant
- Utiliser l'API `SpeechSynthesis` du navigateur (gratuit, pas besoin d'API externe) pour lire les reponses a voix haute
- Indicateur visuel pendant la lecture

### Nouveau type de message
```typescript
type Message = {
  role: "user" | "assistant";
  content: string;
  type: "text" | "audio";
  audioUrl?: string; // URL blob pour les vocaux enregistres
};
```

---

## 3. Edge Function Speech-to-Text

**Fichier : `supabase/functions/speech-to-text/index.ts`**

- Recevoir un fichier audio (FormData)
- Envoyer l'audio au modele Gemini via Lovable AI Gateway (Gemini supporte les fichiers audio en entree)
- Retourner la transcription texte
- Le texte transcrit est ensuite envoye a la fonction `chat` existante

---

## 4. Envoi de fichiers et images

**Fichier : `src/pages/Assistant.tsx`**

- Ajouter un bouton "piece jointe" (icone trombone) dans la barre de saisie
- Supporter : images (JPG, PNG), PDF, documents
- Afficher un apercu du fichier dans le message avant envoi
- Les fichiers sont convertis en base64 et envoyes au backend
- Pour les images, utiliser la capacite multimodale de Gemini pour les analyser (ex: photo de ticket de caisse)

### Rendu des messages avec fichiers
- Images : apercu miniature cliquable dans la bulle de message
- Fichiers : icone + nom du fichier avec indicateur de type

---

## 5. Mise a jour du backend pour fichiers

**Fichier : `supabase/functions/chat/index.ts`**

- Accepter un champ `attachments` en plus de `messages`
- Pour les images : les inclure dans le message Gemini en format multimodal (image_url)
- Pour les fichiers texte/PDF : extraire le contenu et l'ajouter au contexte du message

---

## 6. Interface amelioree

**Fichier : `src/pages/Assistant.tsx`**

Barre de saisie enrichie avec 3 boutons :
```
[Piece jointe] [________Input________] [Micro] [Envoyer]
```

- Bouton micro : maintenir pour enregistrer, relacher pour envoyer
- Bouton piece jointe : ouvre le selecteur de fichiers
- Animation d'enregistrement vocal (cercle rouge pulsant)
- Preview des fichiers attaches avant envoi

---

## Details techniques

### Fichiers a creer
| Fichier | Description |
|---------|------------|
| `supabase/functions/speech-to-text/index.ts` | Transcription audio via Gemini |

### Fichiers a modifier
| Fichier | Modifications |
|---------|--------------|
| `supabase/functions/chat/index.ts` | Nouveau prompt court + support attachments multimodaux |
| `src/pages/Assistant.tsx` | Boutons micro/fichier, enregistrement audio, apercu fichiers, lecture vocale |
| `supabase/config.toml` | Ajouter la nouvelle fonction speech-to-text |

### Dependances
- Aucune nouvelle dependance npm requise
- APIs navigateur utilisees : `MediaRecorder`, `SpeechSynthesis`, `FileReader`

