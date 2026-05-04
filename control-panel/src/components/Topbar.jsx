import { useNavigate } from "react-router-dom";

export default function Topbar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/login");
  }

  return (
    <div className="bg-white border-b p-4 flex justify-between items-center">

      <h2 className="text-lg font-semibold">
        Marketplace Operations
      </h2>

      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Logout
      </button>

    </div>
  );
}
