# GareSNCF — intégration externe Gladys

GareSNCF relie Gladys à l’API officielle SNCF basée sur Navitia. La découverte de Gladys affiche une liste de gares correspondant à votre recherche et permet d’en ajouter plusieurs.

## Configuration et choix des gares

1. Demandez un jeton développeur gratuit sur [le portail API SNCF](https://numerique.sncf.com/startup/api/token-developpeur/).
2. Dans la configuration de GareSNCF, saisissez le jeton et le nom d’une gare ou d’une ville dans **Rechercher des gares**.
3. Enregistrez, puis ouvrez **Découverte** et lancez la recherche de périphériques. Sélectionnez une ou plusieurs gares dans la liste proposée et ajoutez-les à Gladys.
4. Répétez la recherche avec un autre nom pour ajouter d’autres gares. Chaque gare ajoutée est suivie indépendamment.
5. Dans le widget **Tableau de gare SNCF**, choisissez la gare à afficher dans ses paramètres.

La fréquence est réglable par gare. Une fréquence par défaut de 10 minutes limite la consommation du quota API. Le jeton est envoyé dans l’en-tête d’authentification HTTPS et n’est ni inclus dans les URL ni écrit dans les logs.

## Fonctions Gladys

- **Appareil** : un capteur historique « Minutes avant le prochain train » par gare sélectionnée.
- **Widgets** : liste des gares suivies et tableau par gare avec vue compacte, compte à rebours, filtres d’affichage, fraîcheur des données et erreurs API.
- **Filtres** : ligne/code du train, destination et type de transport.
- **Déclencheurs de scène** : retard, suppression signalée par l’API et changement de voie comparé entre deux actualisations.
- **Action de scène** : « Récupérer les prochains trains », avec une gare choisie et sortie voie/retard/suppression.
- **Actions de configuration** : rechercher des gares et tester l’accès à l’API.

## Développement

Prérequis : Node.js 22 ou 24.

```sh
npm ci
npm test
npm run lint
npm run format:check
```

Les tests simulent les réponses HTTP et n’appellent pas le réseau. Consultez [docs/fr.md](docs/fr.md) et [docs/en.md](docs/en.md) pour les détails.
