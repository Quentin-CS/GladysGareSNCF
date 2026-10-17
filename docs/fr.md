# GareSNCF

GareSNCF relie Gladys à l’API officielle SNCF (API Navitia). Elle affiche les prochains trains d’une gare et leurs informations temps réel lorsqu’elles sont disponibles.

## Obtenir un jeton et configurer une gare

1. Demandez un jeton développeur gratuit sur [le portail API SNCF](https://numerique.sncf.com/startup/api/token-developpeur/). Le quota annoncé est de 5 000 requêtes par jour.
2. Dans Gladys, renseignez le jeton dans la configuration de l’intégration.
3. Cliquez sur **Rechercher une gare**, saisissez son nom et copiez l’identifiant `stop_area:...` retourné dans le champ **Identifiant Navitia de la gare**.
4. Choisissez Départs ou Arrivées et enregistrez. Le bouton **Tester l’API SNCF** permet de vérifier la configuration.
5. Dans **Découverte**, ajoutez l’appareil GareSNCF.

## Widget

Ajoutez le widget **Tableau de gare SNCF** à un tableau de bord. Il présente les huit prochains trains, les horaires et les voies disponibles. Les retards connus apparaissent sous forme de badge. Le bouton **Actualiser** interroge immédiatement l’API.

## Déclencheur et action de scène

Le déclencheur **Train en retard** se produit lorsqu’un horaire temps réel dépasse l’horaire théorique d’au moins le seuil configuré. Une même observation n’est pas répétée à chaque lecture. La scène peut utiliser les variables `{{triggerEvent.data.destination}}`, `{{triggerEvent.data.delay_minutes}}` et `{{triggerEvent.data.departure_time}}`.

L’action **Récupérer les prochains trains** force une actualisation et fournit les sorties `count`, `next_train`, `destination` et `minutes` aux étapes suivantes de la scène.

## Données et confidentialité

Le jeton est conservé dans la configuration de l’intégration Gladys. Il est envoyé à `api.sncf.com` dans l’en-tête Basic Authentication. Il n’est ni inclus dans l’URL ni journalisé. Les données d’horaires et d’itinéraires sont fournies par SNCF et peuvent être absentes ou évoluer.
