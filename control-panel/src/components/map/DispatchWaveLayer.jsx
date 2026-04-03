import { CircleMarker, Popup } from "react-leaflet"
import { safeArray } from "../../api/normalizers"

function waveColor(wave) {
  if (wave === 1) return "green"
  if (wave === 2) return "orange"
  if (wave === 3) return "red"
  return "gray"
}

function isValidCoord(lat, lng) {
  return lat && lng && !isNaN(lat) && !isNaN(lng)
}

export default function DispatchWaveLayer({ waves, zonesMap, visibleWave }) {

const cleanWaves = (waves || []).filter(w => w.wave !== null);

  const uniqueWaves = Object.values(
    cleanWaves.reduce((acc, curr) => {

      const key = `${curr.instructor_id}-${curr.wave}`;

      if (!acc[key]) {
        acc[key] = curr;
      }

      return acc;

    }, {})
  );

 return (
    <>
      {uniqueWaves
        .filter(offer => offer.wave <= visibleWave)
        .map((offer, index) => {

        let lat = Number(offer.instructor_lat)
        let lng = Number(offer.instructor_lng)

        if (!isValidCoord(lat, lng)) {
          const zone = zonesMap[Number(offer.instructor_zone)]
          if (!zone) return null

          lat =
            Number(zone.min_lat) +
            Math.random() * (zone.max_lat - zone.min_lat)

          lng =
            Number(zone.min_lng) +
            Math.random() * (zone.max_lng - zone.min_lng)
        }       
        
           return (
          <CircleMarker
            key={`${offer.instructor_id}-${offer.wave}-${index}`}
            center={[lat, lng]}
            radius={12}
            pathOptions={{
              color: waveColor(offer.wave),
              fillOpacity: 0.8
            }}
          >
            <Popup>
              Instructor: {offer.instructor_id}
              <br />
              Wave: {offer.wave}
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}
