# GareSNCF — intégration externe Gladys

Intégration JavaScript externe pour afficher dans Gladys les prochains départs ou arrivées d’une gare SNCF, les retards et un capteur de temps avant le prochain train. Elle utilise l’API officielle SNCF basée sur Navitia.

## Configuration

1. Demandez un jeton gratuit depuis [le portail API SNCF](https://numerique.sncf.com/startup/api/token-developpeur/). Le quota développeur indiqué par SNCF est de 5 000 requêtes par jour.
2. Dans Gladys, ouvrez **GareSNCF > Configuration**, saisissez le jeton, puis utilisez l’action **Rechercher une gare**. Copiez l’identifiant `stop_area:...` affiché dans le champ de gare.
3. Choisissez Départs ou Arrivées, la fréquence de rafraîchissement et le seuil qui déclenche une scène en cas de retard.
4. Utilisez **Tester l’API SNCF**, enregistrez puis ajoutez l’appareil dans l’onglet Découverte.

Le jeton est envoyé à l’API dans l’en-tête d’authentification HTTP et n’est jamais écrit dans les logs ni dans les URL. L’intégration nécessite Internet et se déclare avec le transport **cloud**.

## Fonctions Gladys

- **Appareil** : capteur historique « Minutes avant le prochain train ».
- **Widget** : tableau des 8 prochains trains, voie si disponible, horaire et badge de retard ; bouton d’actualisation.
- **Déclencheur de scène** : « Train en retard », émis une fois par train observé lorsque le seuil configuré est atteint. Les variables de scène incluent `destination`, `delay_minutes` et `departure_time`.
- **Action de scène** : « Récupérer les prochains trains », qui actualise les données et renvoie `count`, `next_train`, `destination` et `minutes`.
- **Actions de configuration** : recherche d’une gare et test du jeton/API.

## Développement

Prérequis : Node.js 22 ou 24.

```sh
npm ci
npm test
npm run lint
npm run format:check
```

L’API n’est jamais appelée par les tests : les réponses sont simulées. Consultez [docs/fr.md](docs/fr.md) et [docs/en.md](docs/en.md) pour les détails.
