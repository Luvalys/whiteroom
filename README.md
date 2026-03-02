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
- Page Aujourd'hui: checklist, journal intelligent (Fait/Appris/Demain), recovery (énergie/sommeil/douleur).
- Planning hebdo flexible (Lun->Dim, Matin/Midi/Soir) avec drag & drop chips multi-activités.
- Quêtes du jour (Main + Side), adaptation "light" en cas de fatigue/douleur.
- CAP 3 (limite d'affichage), bouton Voir tout.
- MVD + streak discipline / WhiteRoom / meilleur streak.
- XP par compétence (base/hard), anti double XP par skill/jour.
- Niveaux par branches (Total, Discipline, Corps, Esprit, Langues).
- Focus mode Pomodoro (25/45/60) + "Terminé → cocher".
- Bibliothèque multi-domaines CRUD + filtres + pré-remplissage.
- Badges (7j/30j, XP, discipline 30j, journal, focus sessions).
- Quotes originales (20+) + copier.
- Export JSON complet, Import JSON avec validation minimale/version, Export CSV journalier.
- Seed "Créer le Skill Tree WhiteRoom" conforme au cahier (branches, tiers, prereqs, positions XY).

## Lancement local

Aucun build nécessaire:

```bash
python3 -m http.server 5173
```

Puis ouvrir `http://localhost:5173`.

## Déploiement GitHub Pages

### Option simple (recommandée pour ce projet)
1. Push sur GitHub dans la branche `main`.
2. Dans **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)`
3. Sauvegarder. L'app est servie depuis `index.html`.

### Commandes git minimales

```bash
git add .
git commit -m "feat: whiteroom skill tracker+ full offline MVP"
git push origin main
```

## Export/Import & migration

- **Export JSON**: sauvegarde complète de l'état applicatif.
- **Import JSON**: fusion sur structure par défaut + gestion `version` si absente.
- **Export CSV**: `date, score, streak discipline, streak WhiteRoom, XP gagné, journal, colonnes habitudes`.

## Confidentialité

- Données stockées localement sur l'appareil.
- Aucune collecte, aucun tracking.
- Usage personnel, éthique, non médical.

## Évolutions possibles

- Migration LocalStorage → IndexedDB.
- PWA complète (manifest + service worker + notifications).
- Sync chiffré optionnel (GitHub Gist/Supabase/Firebase).
