import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap, Polyline } from "react-leaflet"
import { useEffect, useState, useRef } from "react"
import L from "leaflet"
import "leaflet.heat"
import "leaflet-rotatedmarker"
import carIconUrl from "../assets/car.png"



/* ---------------------------------------------------
   HEATMAP LAYER COMPONENT
--------------------------------------------------- */

function DemandHeatmap({ zones }) {

  const map = useMap()

  useEffect(() => {

    if (!zones || zones.length === 0) return

    const points = zones
      .filter(z => zoneCoordinates[z.zone_id])
      .map(z => {

        const [lat, lng] = zoneCoordinates[z.zone_id]

        const intensity =
          z.recent_requests_5m - z.online_instructors + 1

        return [lat, lng, Math.max(intensity, 0.1)]

      })

    const heatLayer = L.heatLayer(points, {
      radius: 40,
      blur: 30,
      maxZoom: 15,
      gradient: {
        0.2: "green",
        0.4: "yellow",
        0.6: "orange",
        1.0: "red"
      }
    })

    heatLayer.addTo(map)

    return () => map.removeLayer(heatLayer)

  }, [zones, map])

  return null
}



/* ---------------------------------------------------
   HELPER FUNCTIONS
--------------------------------------------------- */

function calculateHeading(lat1, lng1, lat2, lng2) {

  const dy = lat2 - lat1
  const dx = lng2 - lng1
  const theta = Math.atan2(dy, dx)

  return (theta * 180) / Math.PI

}

function interpolatePosition(start, end, progress) {

  const lat =
    start[0] + (end[0] - start[0]) * progress

  const lng =
    start[1] + (end[1] - start[1]) * progress

  return [lat, lng]

}

function waveColor(wave) {

  if (wave === 1) return "green"
  if (wave === 2) return "orange"
  if (wave === 3) return "red"

  return "gray"

}



/* ---------------------------------------------------
   ICONS
--------------------------------------------------- */

const carIcon = new L.Icon({
  iconUrl: carIconUrl,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
})



/* ---------------------------------------------------
   ZONE COORDINATES
--------------------------------------------------- */

const zoneCoordinates = {
  1: [31.5204, 74.3587],
  2: [31.5000, 74.3500],
  3: [31.5400, 74.3700],
  4: [31.5300, 74.3300],
  5: [31.5100, 74.3800],
  6: [31.4900, 74.3600],
  7: [31.5600, 74.3400],
  8: [31.5200, 74.3900]
}



/* ---------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------- */

export default function MarketplaceHeatmap() {

  const prevPositions = useRef({})

  const [zones, setZones] = useState([])
  const [instructors, setInstructors] = useState([])
  const [activeLessons, setActiveLessons] = useState([])
  const [routeCars, setRouteCars] = useState({})
  const [dispatchWaves, setDispatchWaves] = useState([])
  const [liquidityRisk, setLiquidityRisk] = useState([])
  const [drift, setDrift] = useState([])

  const [replayOffers, setReplayOffers] = useState([])
  const [replayIndex, setReplayIndex] = useState(0)
  const [replayRunning, setReplayRunning] = useState(false)



  /* ---------------------------------------------------
     LOAD LIVE DATA
  --------------------------------------------------- */

  const loadReplay = async (lessonId) => {

    const res = await fetch(
      `http://localhost:5173/read/dispatch-observability?lesson_request_id=${lessonId}`
    )

    const data = await res.json()

    setReplayOffers(data)
    setReplayIndex(0)

  }



  useEffect(() => {

    const load = async () => {

      try {

        const zonesRes = await fetch(
          "http://localhost:5173/read/admin/liquidity-pressure"
        )
        const zonesData = await zonesRes.json()
        setZones(zonesData)



        const instRes = await fetch(
          "http://localhost:5173/read/admin/instructor-locations"
        )
        const instData = await instRes.json()
        setInstructors(instData)



        const lessonRes = await fetch(
          "http://localhost:5173/read/admin/active-lessons-map"
        )
        const lessonData = await lessonRes.json()
        setActiveLessons(lessonData)



        const dispatchRes = await fetch(
          "http://localhost:5173/read/dispatch-observability"
        )
        const dispatchData = await dispatchRes.json()
        setDispatchWaves(dispatchData)
        
      
      
        const riskRes = await fetch(
          "http://localhost:5173/read/admin/liquidity-risk"
        )

        const riskData = await riskRes.json()
        setLiquidityRisk(riskData)
       


        const driftRes = await fetch(
          "http://localhost:5173/read/admin/instructor-drift"
        )

        const driftData = await driftRes.json()
        setDrift(driftData)

      } catch (err) {

        console.error("heatmap error:", err)

      }

    }

    load()

    const interval = setInterval(load, 3000)

    return () => clearInterval(interval)

  }, [])



  /* ---------------------------------------------------
     ROUTE ANIMATION
  --------------------------------------------------- */

  useEffect(() => {

    const interval = setInterval(() => {

      setRouteCars(prev => {

        const updated = { ...prev }

        activeLessons.forEach(lesson => {

          const start = [
            Number(lesson.instructor_lat),
            Number(lesson.instructor_lng)
          ]

          const end = [
            Number(lesson.student_lat),
            Number(lesson.student_lng)
          ]

          const progress =
            (updated[lesson.lesson_id]?.progress ?? 0) + 0.05

          updated[lesson.lesson_id] = {
            progress,
            position: interpolatePosition(start, end, Math.min(progress, 1))
          }

        })

        return updated

      })

    }, 500)

    return () => clearInterval(interval)

  }, [activeLessons])



  /* ---------------------------------------------------
     REPLAY ANIMATION
  --------------------------------------------------- */

  useEffect(() => {

    if (!replayRunning) return

    const timer = setInterval(() => {

      setReplayIndex(prev => {

        if (prev >= replayOffers.length - 1) {
          setReplayRunning(false)
          return prev
        }

        return prev + 1

      })

    }, 1000)

    return () => clearInterval(timer)

  }, [replayRunning, replayOffers])



  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */

  return (

    <div>

      {/* Replay Controls */}
      <div style={{ marginBottom: "10px" }}>

        <input
          placeholder="lesson_request_id"
          id="replayLesson"
        />

        <button
          onClick={() => {

            const id =
              document.getElementById("replayLesson").value

            loadReplay(id)

          }}
        >
          Load Replay
        </button>

        <button
          onClick={() => setReplayRunning(true)}
        >
          Start Replay
        </button>

      </div>



      <MapContainer
        center={[31.5204, 74.3587]}
        zoom={12}
        style={{ height: "600px", width: "100%" }}
      >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <DemandHeatmap zones={zones} />



        {/* Instructor cars */}
        {instructors.map((inst) => {

          const prev = prevPositions.current[inst.instructor_id]

          let rotation = 0

          if (prev) {
            rotation = calculateHeading(
              prev.lat,
              prev.lng,
              inst.lat,
              inst.lng
            )
          }

          prevPositions.current[inst.instructor_id] = {
            lat: inst.lat,
            lng: inst.lng
          }

          return (
            <Marker
              key={inst.instructor_id}
              position={[inst.lat, inst.lng]}
              icon={carIcon}
              rotationAngle={rotation}
              rotationOrigin="center"
            />
          )

        })}



        {/* Lesson routes */}
        {activeLessons.map((lesson) => (

          <Polyline
            key={lesson.lesson_id}
            positions={[
              [lesson.student_lat, lesson.student_lng],
              [lesson.instructor_lat, lesson.instructor_lng]
            ]}
            pathOptions={{
              color: "blue",
              weight: 4
            }}
          />

        ))}



        {/* Animated route cars */}
        {Object.entries(routeCars).map(([lessonId, car]) => (

          <Marker
            key={lessonId}
            position={car.position}
            icon={carIcon}
          />

        ))}



        {/* Dispatch waves */}
        {dispatchWaves.map((offer) => (

          <CircleMarker
            key={offer.instructor_id + "-" + offer.wave}
            center={[
              Number(offer.instructor_lat),
              Number(offer.instructor_lng)
            ]}
            radius={10}
            pathOptions={{
              color: waveColor(offer.wave),
              fillOpacity: 0.7
            }}
          >

            <Popup>

              Instructor: {offer.instructor_id}
              <br />
              Wave: {offer.wave}
              <br />
              Score: {offer.economic_score}

            </Popup>

          </CircleMarker>

        ))}



        {/* Replay */}
        {replayOffers.slice(0, replayIndex + 1).map((offer) => (

          <CircleMarker
            key={offer.instructor_id + "-" + offer.wave}
            center={[
              Number(offer.instructor_lat),
              Number(offer.instructor_lng)
            ]}
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

        ))}

      {liquidityRisk.map((zone) => {

        const coords = zoneCoordinates[zone.zone_id]

          if (!coords) return null

            let color = "green"

      if (zone.risk_score > 1.5) color = "orange"
      if (zone.risk_score > 3) color = "red"

     return (

       <CircleMarker
       key={"risk-" + zone.zone_id}
      center={coords}
      radius={20}
      pathOptions={{
        color,
        fillOpacity: 0.4
      }}
    >

      <Popup>

        Zone {zone.zone_id}

        <br/>

        Demand: {zone.demand}

        <br/>

        Supply: {zone.supply}

        <br/>

        Risk Score: {zone.risk_score.toFixed(2)}

      </Popup>

    </CircleMarker>

  )

})}


{drift.map((d) => (

  <Polyline
    key={d.instructor_id}
    positions={[
      [d.from_lat, d.from_lng],
      d.to_coords
    ]}
    pathOptions={{
      color: "purple",
      weight: 2,
      dashArray: "5,5"
    }}
  />

))}

      </MapContainer>

    </div>

  )

}
