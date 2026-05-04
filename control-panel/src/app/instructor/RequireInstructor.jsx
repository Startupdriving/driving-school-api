import { Navigate } from "react-router-dom";

export default function RequireInstructor({
  children
}) {
  const token = localStorage.getItem(
    "instructor_token"
  );

  if (!token) {
    return (
      <Navigate
        to="/instructor-login"
        replace
      />
    );
  }

  return children;
}
