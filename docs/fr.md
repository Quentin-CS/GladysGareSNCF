# GareSNCF

GareSNCF relie Gladys à l’API officielle SNCF (API Navitia). La recherche de gares est intégrée au flux de découverte de Gladys pour permettre d’en choisir et d’en suivre plusieurs.

## Obtenir un jeton et ajouter des gares

1. Demandez un jeton développeur gratuit sur [le portail API SNCF](https://numerique.sncf.com/startup/api/token-developpeur/).
2. Dans la configuration de l’intégration, saisissez le jeton API et le nom d’une gare ou d’une ville dans le champ **Rechercher des gares**.
3. Enregistrez la configuration, ouvrez l’onglet **Découverte**, puis lancez la recherche d’appareils. Les gares correspondantes apparaissent comme des appareils sélectionnables.
4. Sélectionnez toutes les gares que vous souhaitez suivre et ajoutez-les à Gladys. Pour suivre d’autres villes, modifiez la recherche et relancez la découverte : les gares déjà ajoutées restent suivies.
5. Réglez la fréquence de rafraîchissement par gare et le seuil de retard qui déclenche les scènes.

Le quota API étant partagé par les appels de l’intégration, une fréquence de 10 minutes est proposée par défaut. Vous pouvez l’augmenter si vous suivez beaucoup de gares.

## Widget

Ajoutez **Tableau de gare SNCF** à un tableau de bord puis choisissez l’une de vos gares dans les paramètres du widget. Il présente les huit prochains trains, leurs horaires, les voies disponibles et les retards connus. Le bouton **Actualiser** interroge immédiatement l’API.

## Déclencheur et action de scène

Le déclencheur **Train en retard** se produit lorsqu’un train dépasse le seuil configuré. Il est filtrable par gare et peut fournir les variables `{{triggerEvent.data.station}}`, `{{triggerEvent.data.train}}`, `{{triggerEvent.data.destination}}`, `{{triggerEvent.data.delay_minutes}}` et `{{triggerEvent.data.departure_time}}`.

L’action **Récupérer les prochains trains** permet de choisir une gare ajoutée. Elle force une actualisation et renvoie `count`, `next_train`, `destination` et `minutes` aux étapes suivantes.

## Données et confidentialité

Le jeton est conservé dans la configuration de GareSNCF et envoyé à `api.sncf.com` dans l’en-tête Basic Authentication. Il n’est pas inclus dans l’URL ni dans les logs. Les horaires et informations temps réel sont fournis par SNCF et peuvent être absents ou évoluer.
