

## Corrections mobile pour Mon Jeton

### Problemes identifies

1. **Scan - Upload depuis la galerie ne fonctionne pas sur mobile** : L'attribut `capture="environment"` force l'ouverture de la camera. La manipulation dynamique de cet attribut (retirer puis remettre) est instable sur mobile. Solution : utiliser deux inputs separes.

2. **Enregistrement vocal ne fonctionne pas sur iOS** : Le format `audio/webm` n'est pas supporte par Safari/iOS. Il faut detecter le format supporte (`audio/mp4` sur iOS, `audio/webm` sur Android/desktop).

3. **Bouton vocal de l'Assistant** : Les evenements `onTouchStart`/`onTouchEnd` peuvent provoquer un scroll ou un comportement inattendu sur mobile. Il faut ajouter `preventDefault` pour eviter ca.

4. **Input clavier mobile** : Sur l'assistant, appuyer sur "Entrer" sur le clavier mobile ne fonctionne pas toujours. Il faut gerer aussi l'evenement `compositionEnd`.

---

### Details techniques

**Fichier 1 : `src/components/scan/ScanUploadArea.tsx`**
- Separer en deux inputs `<input type="file">` distincts :
  - Un avec `capture="environment"` pour le bouton "Photo" (ouvre la camera)
  - Un sans attribut `capture` pour le bouton "Galerie" (ouvre le selecteur de fichiers)
- Chaque bouton reference son propre input

**Fichier 2 : `src/pages/Assistant.tsx`**
- Ajouter une fonction utilitaire pour detecter le mimeType audio supporte :
  ```
  const getSupportedMimeType = () => {
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    if (MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";
    return "";
  }
  ```
- Utiliser ce mimeType dans `new MediaRecorder(stream, { mimeType })`
- Ajouter `e.preventDefault()` sur `onTouchStart`/`onTouchEnd` du bouton micro pour eviter le scroll

**Fichier 3 : `src/pages/NewTransaction.tsx`**
- Meme correction du mimeType audio que pour l'Assistant
- Ajouter la detection du format supporte avant la creation du MediaRecorder

**Fichier 4 : `src/components/scan/ScanUploadArea.tsx` (complement)**
- Sur mobile, certains navigateurs ne supportent pas `application/pdf` dans `accept`. Ajouter `.pdf` en complement pour une meilleure compatibilite

**Aucune modification de base de donnees necessaire.**

