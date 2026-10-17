# GareSNCF

GareSNCF connects Gladys to the official SNCF API (Navitia API). It displays upcoming trains for a station and real-time information when available.

## Get a token and configure a station

1. Request a free developer token from the [SNCF API portal](https://numerique.sncf.com/startup/api/token-developpeur/). SNCF currently advertises a quota of 5,000 requests per day.
2. Enter the token in the integration configuration in Gladys.
3. Click **Search for a station**, enter its name and copy the returned `stop_area:...` identifier into **Navitia station ID**.
4. Choose Departures or Arrivals and save. Use **Test the SNCF API** to verify the setup.
5. Add the GareSNCF device from the **Discovery** tab.

## Widget

Add **SNCF station board** to a dashboard. It shows the next eight trains, their times and available platforms. Known delays appear as badges. The **Refresh** button queries the API immediately.

## Scene trigger and action

The **Delayed train** trigger fires when the real-time schedule is later than the planned schedule by at least the configured threshold. The same observation is not repeated on every poll. Scenes can use `{{triggerEvent.data.destination}}`, `{{triggerEvent.data.delay_minutes}}` and `{{triggerEvent.data.departure_time}}`.

The **Get upcoming trains** scene action forces a refresh and returns `count`, `next_train`, `destination` and `minutes` to later scene steps.

## Data and privacy

The token is held in the Gladys integration configuration. It is sent to `api.sncf.com` in the Basic Authentication header, never in the URL or logs. Train information is provided by SNCF and can be missing or change.
