import { useState } from "react"
import RequestLesson from "./RequestLesson"
import RequestStatus from "./RequestStatus"

export default function StudentApp() {
  const [lessonId, setLessonId] = useState(null)

  console.log("TRACKING LESSON ID:", lessonId);

  return (
    <div>
      <h1>Student App</h1>

      {!lessonId && <RequestLesson onSuccess={setLessonId} />}

      {lessonId && <RequestStatus lessonId={lessonId} />}
    </div>
  )
}
