# GareSNCF

GareSNCF connects Gladys to the official SNCF API (Navitia API). Station search is integrated into Gladys device discovery so users can select and follow several stations.

## Get a token and add stations

1. Request a free developer token from the [SNCF API portal](https://numerique.sncf.com/startup/api/token-developpeur/).
2. In the integration configuration, enter the API token and a station or city name in **Search for stations**.
3. Save the configuration, open **Discovery**, and scan for devices. Matching stations appear as selectable devices.
4. Select every station you want to follow and add them to Gladys. To follow stations in other cities, change the search and scan again; stations already added remain tracked.
5. Set the refresh interval per station and the delay threshold that triggers scenes.
6. Use the **Followed stations** widget to review tracked devices. To stop following a station, delete its device from the Gladys devices list. Repeated searches do not create duplicates because SNCF station IDs are stable keys.

API usage is shared across the integration. The default interval is 10 minutes per station. Cancellation detection is enabled by default and adds one request for the theoretical timetable per refresh; disable it in the integration settings to reduce API usage. Increase the refresh interval if you follow many stations.

Optional global filters match line/train code, destination and transport type. They apply to boards, sensors and scenes; each board widget can also set its own display filters. On HTTP 429, the widget keeps the last received data and shows the error and retry delay when SNCF provides one. The API does not expose the remaining quota here.

## Widget

Add **Followed stations** to review tracked devices, or **SNCF station board** to display one station. The board shows train times, countdowns, available platforms, delays and cancellations reported by the API. It can be limited to three trains in compact view. Its status shows data freshness and refresh errors; **Refresh** queries the API immediately.

## Scene trigger and action

The **Delayed train**, **Cancelled train** and **Platform change** triggers can be filtered by station. The latter two use information returned by SNCF and changes compared between refreshes. Variables include the station, train, destination, delay, time and platform (plus the previous platform on a platform change).

The **Get upcoming trains** action lets you choose one of your added stations. It forces a refresh and returns `count`, `next_train`, `destination`, `minutes`, `platform`, `delay_minutes` and `cancelled` to later scene steps.

## Data and privacy

The token is stored in the GareSNCF configuration and sent to `api.sncf.com` in the Basic Authentication header. It is never included in the URL or logs. Train schedules and real-time details are provided by SNCF and may be missing or change.
