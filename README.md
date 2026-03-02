# WhiteRoom Skill Tracker+

Application web offline-first inspirée d'une approche "WhiteRoom" éthique pour construire corps + esprit.

## Stack & architecture

Choix réalisé: **Option B (Vanilla HTML/CSS/JS modulaire léger)** pour garantir:
- déploiement direct sur GitHub Pages sans build,
- performance mobile/desktop,
- stockage local immédiat (LocalStorage),
- zéro backend obligatoire.

### Arborescence

- `index.html` : shell UI, topbar, navigation tabs.
- `styles.css` : design dark minimal responsive.
- `app.js` : logique métier complète (state, CRUD, gamification, export/import, seed).

## Fonctionnalités implémentées

- CRUD compétences + arbre de compétences avec prérequis et états lock/unlock (off/soft/hard).
- Page Aujourd'hui: checklist, journal intelligent (Fait/Appris/Demain), recovery (énergie/sommeil/douleur), option Strategy Quest.
- Planning hebdo flexible (Lun->Dim, Matin/Midi/Soir) avec drag & drop chips multi-activités.
- Quêtes du jour (Main + Side), adaptation "light" en cas de fatigue/douleur.
- CAP 3 (limite d'affichage), bouton Voir tout.
- MVD + streak discipline / WhiteRoom / meilleur streak.
- XP par compétence (base/hard), anti double XP par skill/jour.
- Niveaux par branches (Total, Discipline, Corps, Esprit, Langues, **Stratégie**).
- Focus mode Pomodoro (25/45/60) + "Terminé → cocher".
- Bibliothèque multi-domaines CRUD + filtres + pré-remplissage.
- Badges WhiteRoom + badges Strategy.
- Quotes originales (20+) + copier.
- Export JSON complet, Import JSON avec migration si champs absents, Export CSV enrichi.
- Seed "Créer le Skill Tree WhiteRoom" conforme au cahier (branches, tiers, prereqs, positions XY).

## Strategy Lab (nouveau)

Onglet dédié avec **7 templates de stratégie** par case:
1. Cadrage
2. Scénarios probabilistes
3. Incentives
4. Effets de 2e ordre
5. 80/20
6. Communication (1 phrase / 30 sec / 2 min)
7. Rétro

### Utilisation
- Crée un *case* puis remplis les modules via accordéons.
- Chaque module a un bouton **Marquer comme complété**:
  - valide les champs minimum,
  - donne l'XP du module **une seule fois**,
  - stocke la date de complétion.
- Boutons **Copier** pour:
  - Framing one-sentence,
  - Comms 1/30/2,
  - Résumé probabiliste des scénarios.

### XP Strategy
- framing +15
- scenarios +20
- incentives +15
- secondOrder +15
- eightyTwenty +10
- comms +10
- retro +15

### Badges Strategy
- 10 framings
- 10 scenarios
- 5 incentives maps
- 5 retros
- 30 modules Strategy complétés
- Strategy streak 7 jours (≥1 module Strategy complété/jour)

## Lancement local

```bash
python3 -m http.server 5173
```

Puis ouvrir `http://localhost:5173`.

## Déploiement GitHub Pages

1. Push sur GitHub dans la branche `main`.
2. Dans **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)`
3. Sauvegarder.

## Export/Import & migration

- **Export JSON**: inclut toutes les données (y compris `strategyCases`, XP Strategy et badges).
- **Import JSON**: fusionne avec la structure par défaut et migre les champs Strategy absents.
- **Export CSV**: inclut colonnes `strategy_xp_total` et `strategy_modules_done`.

## Confidentialité

- Données stockées localement sur l'appareil.
- Aucune collecte, aucun tracking.
- Usage personnel, éthique, non médical.
