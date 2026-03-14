import { Link } from "react-router-dom"

export default function Sidebar() {

  return (

    <div className="w-64 bg-gray-900 text-white p-5">

      <h1 className="text-xl font-bold mb-6">
        Control Panel
      </h1>

      <nav className="flex flex-col space-y-3">

        <Link to="/">Dashboard</Link>
        <Link to="/dispatch">Dispatch Monitor</Link>
        <Link to="/liquidity">Liquidity Map</Link>
        <Link to="/activity">Activity Feed</Link>
        <Link to="/lesson">Lesson Inspector</Link>
        <Link to="/simulation">Simulation</Link>
        <Link to="/maintenance">Projection Maintenance</Link>

      </nav>

    </div>

  )
}
