import { CircleMarker, Popup } from "react-leaflet"

function waveColor(wave) {
  if (wave === 1) return "green"
  if (wave === 2) return "orange"
  if (wave === 3) return "red"
  return "gray"
}

export default function ReplayLayer({ offers, replayIndex, zonesMap }) {

  function isValidCoord(lat, lng) {
    return lat && lng && !isNaN(lat) && !isNaN(lng);
  }

  return (
    <>
      {offers.slice(0, replayIndex + 1).map((offer) => {

        let lat = Number(offer.instructor_lat);
        let lng = Number(offer.instructor_lng);

        // ✅ FALLBACK if no lat/lng
        if (!isValidCoord(lat, lng)) {

          const zone = zonesMap?.[Number(offer.instructor_zone)];
          if (!zone) return null;

          lat =
            Number(zone.min_lat) +
            Math.random() * (zone.max_lat - zone.min_lat);

          lng =
            Number(zone.min_lng) +
            Math.random() * (zone.max_lng - zone.min_lng);
        }

        return (
          <CircleMarker
            key={offer.instructor_id + "-" + offer.wave}
            center={[lat, lng]}
            radius={14}
            pathOptions={{
              color: waveColor(offer.wave),
              fillOpacity: 0.8
            }}
          >
            <Popup>
              Wave {offer.wave}
              <br />
              Score: {offer.economic_score}
            </Popup>
          </CircleMarker>
        );

      })}
    </>
  );
}
