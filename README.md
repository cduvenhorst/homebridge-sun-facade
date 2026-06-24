# homebridge-sun-facade

A Homebridge 2.0 platform plugin that exposes one HomeKit **contact sensor per facade**.
A sensor reports **open** while the sun illuminates that facade — determined purely from
your location and the time of day (azimuth range + minimum altitude). No network, no
weather, no provider, no API key.

Use the sensors as triggers in the **iOS Home app**: map each facade sensor to a scene or
shutter automation yourself. Cloudiness, if you want it, is composed separately via another
sensor in your Home-app automation conditions.

## Installation

Requires [Homebridge](https://homebridge.io) (1.8 or 2.x) running on Node.js 18 or newer.

### Homebridge Config UI X (recommended)

In the **Plugins** tab, search for **Sun Facade** (`homebridge-sun-facade`), click
**Install**, then fill in the settings form (see [Configuration](#configuration)).

### Command line

```bash
sudo npm install -g homebridge-sun-facade
sudo hb-service restart
```

### From source (latest / unreleased build)

```bash
git clone https://github.com/cduvenhorst/homebridge-sun-facade.git
cd homebridge-sun-facade
npm install          # compiles dist/ via the prepare hook
sudo npm install -g .
sudo hb-service restart
```

After installation, add the `SunFacade` platform to your Homebridge config and restart.

## Configuration

| Field | Meaning |
| --- | --- |
| `latitude` / `longitude` | Your location in decimal degrees. In Google Maps a place's coordinates appear as `latitude, longitude` (in that order). Latitude is −90…90 (positive = north); longitude is −180…180 (positive = east). |
| `updateIntervalSeconds` | Evaluation interval (default 60). |
| `updateMode` | `onChange` (default) writes only on state change; `always` writes every tick. |
| `facades[]` | `name`, `azimuthMin`, `azimuthMax` (0=N, 90=E, 180=S, 270=W; may overlap and wrap across 0/360), `altitudeMin` (degrees above horizon, default 0). |

### Example

```json
{
  "platform": "SunFacade",
  "latitude": 52.37,
  "longitude": 9.74,
  "updateIntervalSeconds": 60,
  "updateMode": "onChange",
  "facades": [
    { "name": "East", "azimuthMin": 60, "azimuthMax": 135, "altitudeMin": 10 },
    { "name": "South", "azimuthMin": 135, "azimuthMax": 225, "altitudeMin": 5 }
  ]
}
```

Overlapping ranges mean several sensors are open at once (e.g. around noon both East and
South). Wire `East`/`South` to your shading scenes in the Home app.

### Wrap-around ranges

When `azimuthMin > azimuthMax` the range wraps across the 0°/360° boundary, which is
useful for north-facing facades:

```json
{ "name": "North", "azimuthMin": 315, "azimuthMax": 45, "altitudeMin": 0 }
```

This matches azimuths from 315° (NW) through 0° (N) to 45° (NE).

### Worldwide use

Sun position is computed for any location and date, in both hemispheres — no time-zone
setting is needed (the plugin works from your coordinates and the current time). Azimuth is
always measured clockwise from true north (0°=N, 90°=E, 180°=S, 270°=W), so the
configuration is identical everywhere; only the ranges you choose differ. Note that in the
**southern hemisphere** the midday sun stands in the **north**, so a sun-facing facade there
uses a range around 0°/360° — e.g. a sun-facing (north) window: `azimuthMin: 315,
azimuthMax: 45`.
