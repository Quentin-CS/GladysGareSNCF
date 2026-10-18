# CLAUDE.md

Consignes du projet pour les assistants de code et les contributeurs.

## Projet

GareSNCF est une intégration externe Gladys en JavaScript ESM, basée sur le [template officiel](https://github.com/GladysAssistant/integration-template-js) et le SDK `@gladysassistant/integration-sdk`. Elle interroge l’API SNCF/ Navitia avec le jeton fourni par l’utilisateur.

## Commandes

```sh
npm ci
npm test
npm run lint
npm run format:check
npm run format
```

## Règles

- Garder stables les clés du manifeste, les identifiants externes, les clés de scènes et de widgets.
- Chaque appareil représente une gare choisie dans la découverte. L’identifiant externe reprend l’identifiant stable `stop_area` fourni par Navitia.
- Ne jamais journaliser le jeton API. L’envoyer uniquement dans l’en-tête d’authentification HTTPS vers `api.sncf.com`.
- Les tests ne doivent pas appeler le réseau ; simuler `fetch`.
- Maintenir les textes utilisateur en français et en anglais, ainsi que `docs/fr.md` et `docs/en.md`.
- Ajouter les changements visibles à `CHANGELOG.md` sous `## [Unreleased]`.
- Les versions sont gérées par le workflow Release ; ne pas modifier manuellement le numéro dans `package.json`, le lockfile ou le manifeste.
- Toute capacité déclarée dans le manifeste doit correspondre à un gestionnaire dans le code et être couverte par des tests pertinents.
- Les filtres globaux s’appliquent au tableau et aux événements ; les filtres d’instance de widget ne modifient que son affichage.
- Les déclencheurs retard/suppression/changement de voie doivent rester dédupliqués par transition et par train.
- Le SDK ne supprime pas un appareil Gladys : documenter le retrait via l’écran natif des appareils, ne pas prétendre pouvoir le faire depuis le widget.
- Ne jamais déduire un quota restant si l’API ne le fournit pas ; afficher uniquement les erreurs HTTP et l’en-tête `Retry-After` lorsqu’il existe.
