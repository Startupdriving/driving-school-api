import { Navigate } from "react-router-dom";

export default function RequireStudent({ children }) {
  const token = localStorage.getItem("student_token");

  if (!token) {
    return <Navigate to="/student-login" replace />;
  }

  return children;
}
