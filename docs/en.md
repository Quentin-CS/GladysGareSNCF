# GareSNCF

GareSNCF connects Gladys to the official SNCF API (Navitia API). Station search is integrated into Gladys device discovery so users can select and follow several stations.

## Get a token and add stations

1. Request a free developer token from the [SNCF API portal](https://numerique.sncf.com/startup/api/token-developpeur/).
2. In the integration configuration, enter the API token and a station or city name in **Search for stations**.
3. Save the configuration, open **Discovery**, and scan for devices. Matching stations appear as selectable devices.
4. Select every station you want to follow and add them to Gladys. To follow stations in other cities, change the search and scan again; stations already added remain tracked.
5. Set the refresh interval per station and the delay threshold that triggers scenes.

API usage is shared across the integration. The default interval is 10 minutes per station. Increase it if you follow many stations.

## Widget

Add **SNCF station board** to a dashboard, then select one of your stations in the widget settings. It shows the next eight trains, their times, available platforms and known delays. **Refresh** queries the API immediately.

## Scene trigger and action

The **Delayed train** trigger fires when a train exceeds the configured delay threshold. It can be filtered by station and provides `{{triggerEvent.data.station}}`, `{{triggerEvent.data.train}}`, `{{triggerEvent.data.destination}}`, `{{triggerEvent.data.delay_minutes}}` and `{{triggerEvent.data.departure_time}}`.

The **Get upcoming trains** action lets you choose one of your added stations. It forces a refresh and returns `count`, `next_train`, `destination` and `minutes` to later scene steps.

## Data and privacy

The token is stored in the GareSNCF configuration and sent to `api.sncf.com` in the Basic Authentication header. It is never included in the URL or logs. Train schedules and real-time details are provided by SNCF and may be missing or change.
