import { Link } from "react-router-dom";

export default function Sidebar() {
  const item =
    "block px-3 py-2 rounded hover:bg-gray-800 transition";

  const section =
    "text-xs uppercase text-gray-400 mt-6 mb-2 tracking-wide";

  return (
    <div className="w-64 bg-gray-900 text-white p-5 overflow-y-auto">

      <h1 className="text-xl font-bold mb-6">
        Control Panel
      </h1>

      <nav className="flex flex-col">

        <div className={section}>Overview</div>
        <Link to="/" className={item}>Dashboard</Link>

        <div className={section}>Operations</div>
        <Link to="/dispatch" className={item}>Dispatch Monitor</Link>
        <Link to="/activity" className={item}>Activity Feed</Link>
        <Link to="/liquidity" className={item}>Liquidity Map</Link>
        <Link to="/heatmap" className={item}>Marketplace Heatmap</Link>

        <div className={section}>Users</div>
        <Link to="/users" className={item}>Users Management</Link>
        <Link to="/instructors/new" className={item}>
          Create Instructor
        </Link>
        <Link to="/approvals" className={item}>
          Pending Approvals
        </Link>         

        <div className={section}>System</div>
        <Link to="/lesson" className={item}>Lesson Inspector</Link>
        <Link to="/simulation" className={item}>Simulation</Link>
        <Link to="/maintenance" className={item}>Projection Maintenance</Link>

      </nav>

    </div>
  );
}
