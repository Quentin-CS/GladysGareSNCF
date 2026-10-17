# CLAUDE.md

Consignes du projet pour les assistants de code et les contributeurs.

## Projet

GareSNCF est une intégration externe Gladys en JavaScript ESM, basée sur le [template officiel](https://github.com/GladysAssistant/integration-template-js) et le SDK `@gladysassistant/integration-sdk`. Elle interroge l’API officielle SNCF/ Navitia avec le jeton fourni par l’utilisateur.

## Commandes

```sh
npm ci
npm test
npm run lint
npm run format:check
npm run format
```

## Règles

- Garder les clés du manifeste, les identifiants externes, les clés de scènes et les clés de widget stables : ils peuvent être référencés par les scènes et tableaux de bord.
- Ne jamais journaliser le jeton API. L’envoyer uniquement dans l’en-tête d’authentification HTTPS vers `api.sncf.com`.
- Les tests ne doivent pas appeler le réseau ; simuler `fetch`.
- Maintenir les textes utilisateur en français et en anglais, ainsi que `docs/fr.md` et `docs/en.md`.
- Ajouter chaque changement visible à `CHANGELOG.md` sous `## [Unreleased]`.
- Garder `version` dans `package.json`, le manifeste et `docker_image` synchronisés via le workflow Release.
- Toute capacité déclarée dans `gladys-assistant-integration.json` doit correspondre à un gestionnaire dans le code et être couverte par les tests pertinents.
