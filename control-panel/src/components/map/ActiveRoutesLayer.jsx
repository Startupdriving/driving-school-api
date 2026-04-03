import { useEffect, useState } from "react"
import { Polyline, Marker } from "react-leaflet"
import { safeArray } from "../../api/normalizers"

function interpolatePosition(start, end, progress) {
  const lat = start[0] + (end[0] - start[0]) * progress
  const lng = start[1] + (end[1] - start[1]) * progress
  return [lat, lng]
}

export default function ActiveRoutesLayer({ activeLessons }) {

  const [routeCars, setRouteCars] = useState({})

  // 🚗 Animation loop
  useEffect(() => {

    const interval = setInterval(() => {

      setRouteCars(prev => {

        const updated = { ...prev }

        safeArray(activeLessons).forEach(lesson => {

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

  return (
    <>
      {/* 🔵 Route lines */}
      {safeArray(activeLessons).map((lesson) => (

        <Polyline
          key={lesson.lesson_id}
          positions={[
            [Number(lesson.student_lat), Number(lesson.student_lng)],
            [Number(lesson.instructor_lat), Number(lesson.instructor_lng)]
          ]}
          pathOptions={{
            color: "blue",
            weight: 4
          }}
        />

      ))}

      {/* 🚗 Moving cars */}
      {Object.entries(routeCars).map(([lessonId, car]) => (

        <Marker
          key={lessonId}
          position={car.position}
        />

      ))}
    </>
  )
}
