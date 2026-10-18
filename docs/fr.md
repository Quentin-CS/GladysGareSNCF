# GareSNCF

GareSNCF relie Gladys à l’API officielle SNCF (API Navitia). La recherche de gares est intégrée au flux de découverte de Gladys pour permettre d’en choisir et d’en suivre plusieurs.

## Obtenir un jeton et ajouter des gares

1. Demandez un jeton développeur gratuit sur [le portail API SNCF](https://numerique.sncf.com/startup/api/token-developpeur/).
2. Dans la configuration de l’intégration, saisissez le jeton API et le nom d’une gare ou d’une ville dans le champ **Rechercher des gares**.
3. Enregistrez la configuration, ouvrez l’onglet **Découverte**, puis lancez la recherche d’appareils. Les gares correspondantes apparaissent comme des appareils sélectionnables.
4. Sélectionnez toutes les gares que vous souhaitez suivre et ajoutez-les à Gladys. Pour suivre d’autres villes, modifiez la recherche et relancez la découverte : les gares déjà ajoutées restent suivies.
5. Réglez la fréquence de rafraîchissement par gare et le seuil de retard qui déclenche les scènes.
6. Consultez le widget **Gares suivies** pour retrouver les appareils suivis. Pour arrêter le suivi d’une gare, supprimez son appareil dans la liste des appareils Gladys. Les recherches répétées ne créent pas de doublon : l’identifiant SNCF sert de clé stable.

Le quota API étant partagé par les appels de l’intégration, une fréquence de 10 minutes est proposée par défaut. La détection des suppressions est activée par défaut et ajoute une requête vers l’horaire théorique pour chaque actualisation ; désactivez-la dans la configuration si vous souhaitez réduire la consommation API. Vous pouvez également augmenter la fréquence si vous suivez beaucoup de gares.

Les filtres globaux **ligne/code**, **destination** et **type de transport** sont facultatifs et s’appliquent aux tableaux, aux capteurs et aux scènes. Chaque widget peut en outre définir ses propres filtres d’affichage. Si l’API répond avec HTTP 429, le widget conserve les dernières données reçues et affiche l’erreur ainsi que le délai de reprise quand SNCF le fournit. Le quota restant n’est pas disponible via cette API.

## Widget

Ajoutez **Gares suivies** pour consulter la liste des appareils GareSNCF, ou **Tableau de gare SNCF** pour afficher une gare. Le tableau indique l’heure, le temps restant, la voie disponible, les retards et les suppressions signalées par l’API. Il peut être limité à trois trains en vue compacte et son bouton **Actualiser** interroge immédiatement l’API. L’âge des données et les erreurs de rafraîchissement apparaissent dans son état.

## Déclencheur et action de scène

Les déclencheurs **Train en retard**, **Train supprimé** et **Changement de voie** sont filtrables par gare. Les deux derniers reposent sur les informations retournées par l’API et les changements comparés entre deux actualisations. Les variables disponibles incluent la gare, le train, la destination, le retard, l’heure et la voie (ainsi que l’ancienne voie lors d’un changement).

L’action **Récupérer les prochains trains** permet de choisir une gare ajoutée. Elle force une actualisation et renvoie `count`, `next_train`, `destination`, `minutes`, `platform`, `delay_minutes` et `cancelled` aux étapes suivantes.

## Données et confidentialité

Le jeton est conservé dans la configuration de GareSNCF et envoyé à `api.sncf.com` dans l’en-tête Basic Authentication. Il n’est pas inclus dans l’URL ni dans les logs. Les horaires et informations temps réel sont fournis par SNCF et peuvent être absents ou évoluer.
