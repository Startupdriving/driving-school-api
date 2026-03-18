import { safeArray, safeNumber } from "../../api/normalizers";

export default function InstructorLayer({ instructors }) {

  const safeInstructors = safeArray(instructors);

  return (
    <div>

      {safeInstructors.map((inst, i) => {

        const lat = safeNumber(inst.lat);
        const lng = safeNumber(inst.lng);

        if (!lat || !lng) return null;

        return (
          <div key={i}>
            📍 {inst.instructor_id} | Zone {inst.zone_id} | {lat}, {lng}
          </div>
        );
      })}

    </div>
  );
}
