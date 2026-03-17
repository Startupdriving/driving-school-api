import { BrowserRouter, Routes, Route } from "react-router-dom"

import Layout from "./layout/Layout"
import MarketplaceHeatmap from "./pages/MarketplaceHeatmap"
import Dashboard from "./pages/Dashboard"
import DispatchMonitor from "./pages/DispatchMonitor"
import LiquidityMap from "./pages/LiquidityMap"
import ActivityFeed from "./pages/ActivityFeed"
import LessonInspector from "./pages/LessonInspector"
import SimulationPanel from "./pages/SimulationPanel"
import ProjectionMaintenance from "./pages/ProjectionMaintenance"

export default function App() {

  return (
    <BrowserRouter>

      <Routes>
         
        <Route element={<Layout />}>
          <Route path="/heatmap" element={<MarketplaceHeatmap />} />

          <Route path="/" element={<Dashboard />} />

          <Route path="/dispatch" element={<DispatchMonitor />} />

          <Route path="/liquidity" element={<LiquidityMap />} />

          <Route path="/activity" element={<ActivityFeed />} />

          <Route path="/lesson" element={<LessonInspector />} />

          <Route path="/simulation" element={<SimulationPanel />} />

          <Route path="/maintenance" element={<ProjectionMaintenance />} />

        </Route>

      </Routes>

    </BrowserRouter>
  )
}
