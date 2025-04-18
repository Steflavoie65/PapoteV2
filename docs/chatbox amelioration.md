# Améliorations du Chatbox

## 1. Salutations Personnalisées

### Objectif
Rendre les interactions plus naturelles et chaleureuses en ajoutant des salutations personnalisées basées sur l'heure et en utilisant le prénom de l'utilisateur dans chaque réponse.

### Détails
- Ajouter des salutations basées sur l'heure de la journée :
  - Matin : "Bonjour, [Prénom] !"
  - Après-midi : "Bon après-midi, [Prénom] !"
  - Soir : "Bonsoir, [Prénom] !"
- S'assurer que le prénom de l'utilisateur est utilisé dans chaque réponse pour une touche personnelle.

### Exemple
- Si l'utilisateur se connecte à 9h du matin : "Bonjour, Henri ! Comment puis-je vous aider aujourd'hui ?"
- Si l'utilisateur se connecte à 15h : "Bon après-midi, Henri ! Avez-vous passé une bonne journée jusqu'à présent ?"

### Étapes de Mise en Œuvre
1. Identifier l'heure actuelle à l'aide de l'API JavaScript `Date`.
2. Déterminer la période de la journée (matin, après-midi, soir).
3. Intégrer le prénom de l'utilisateur dans les réponses générées.
4. Tester les réponses pour s'assurer qu'elles sont adaptées au contexte.

### Prochaines Étapes
Passer à l'amélioration suivante une fois cette fonctionnalité implémentée et testée.