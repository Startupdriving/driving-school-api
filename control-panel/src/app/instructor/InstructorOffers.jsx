import { useEffect, useState } from "react"
import { getInstructorOffers } from "../../api/adminApi"

export default function InstructorOffers() {


  const [offers, setOffers] = useState([])

  const [activeLesson, setActiveLesson] = useState(null)

  const instructorId = "c3850192-57b4-4b1d-916f-726af500360c"






   const handleAccept = async (offer) => {
  try {

    const res = await fetch("http://localhost:5173/write/instructor/accept-offer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        instructor_id: instructorId,
        lesson_request_id: offer.lesson_request_id
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Accept failed");
      return;
    }

    setActiveLesson({
  lesson_id: data.lesson_id,
  lesson_request_id: offer.lesson_request_id 
  });

  } catch (err) {
    console.error(err);
  }
};
    


const fetchOffers = async () => {
  try {
    const res = await getInstructorOffers(instructorId)

    console.log("OFFERS RESPONSE:", res)

    const sorted = (res || []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )

    setOffers(prev => {
  return sorted.map(newOffer => {
    const existing = prev.find(
      o => o.lesson_request_id === newOffer.lesson_request_id
    );

    return existing?.lesson_id
      ? { ...newOffer, lesson_id: existing.lesson_id }
      : newOffer;
  });
});

  } catch (err) {
    console.error(err)
  }
}



const startLesson = async () => {
  
console.log("ACTIVE LESSON:", activeLesson);  

  if (!activeLesson?.lesson_id) {
  alert("Lesson not created yet");
  return;
}

await fetch("http://localhost:5173/write/lesson/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    instructor_id: instructorId,
    lesson_id: activeLesson.lesson_id
  })
});
};






const completeLesson = async () => {
  if (!activeLesson?.lesson_id) return;

  await fetch("http://localhost:5173/write/lesson/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instructor_id: instructorId,
      lesson_id: activeLesson.lesson_id
    })
  });
};
  


const cancelLesson = async () => {

  if (!activeLesson?.lesson_id) return;

  await fetch("http://localhost:5173/write/lesson/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instructor_id: instructorId,
      lesson_id: activeLesson.lesson_id
    })
  });

  // optional: clear UI
  setActiveLesson(null);
};


const fetchActiveLesson = async () => {
  const res = await fetch(
    `http://localhost:5173/read/instructor-active-lesson/${instructorId}`
  );
  const data = await res.json();

  setActiveLesson(data);
};


 useEffect(() => {

  fetchActiveLesson();
  fetchOffers();   // ❗ make sure this still runs

  const interval = setInterval(() => {
    fetchActiveLesson();
    fetchOffers();
  }, 5000);

  return () => clearInterval(interval);

}, []);  


  return (
  <div>

    <h2>Instructor Panel</h2>

    {/* 🟢 ACTIVE LESSON */}
    {activeLesson && (
      <div>
        <h3>Active Lesson</h3>
        <p>Lesson ID: {activeLesson.lesson_id}</p>
        <p>Status: {activeLesson.status}</p>

        <button onClick={startLesson}>
          Start Lesson
        </button>

        <button onClick={completeLesson}>
          Complete Lesson
        </button>

        <button onClick={cancelLesson}>
          Cancel Lesson
        </button>
      </div>
    )}

    {/* 🔵 OFFERS (ONLY IF NO ACTIVE LESSON) */}
    {!activeLesson && (
      <div>

        <h3>Available Offers</h3>

        {offers.length === 0 && <p>No offers</p>}

        {offers.map((offer) => (
          <div key={offer.lesson_request_id}>
            <p>Request: {offer.lesson_request_id}</p>

            <button onClick={() => handleAccept(offer)}>
              Accept
            </button>
          </div>
        ))}

      </div>
    )}

  </div>
);
}
