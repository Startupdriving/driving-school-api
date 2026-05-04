import { BrowserRouter, Routes, Route } from "react-router-dom";

import AuthLogin from "./app/admin/AuthLogin";
import RequireAdmin from "./app/admin/RequireAdmin";

import StudentApp from "./app/student/StudentApp";
import InstructorApp from "./app/instructor/InstructorApp";
import RequireStudent from "./app/student/RequireStudent";
import RequireInstructor from "./app/instructor/RequireInstructor";

import Layout from "./layout/Layout";

import Dashboard from "./pages/Dashboard";
import DispatchMonitor from "./pages/DispatchMonitor";
import LiquidityMap from "./pages/LiquidityMap";
import ActivityFeed from "./pages/ActivityFeed";
import LessonInspector from "./pages/LessonInspector";
import SimulationPanel from "./pages/SimulationPanel";
import ProjectionMaintenance from "./pages/ProjectionMaintenance";
import MarketplaceHeatmap from "./pages/MarketplaceHeatmap";
import UsersManagement from "./pages/UsersManagement";
import StudentSignup from "./pages/StudentSignup";
import StudentLogin from "./pages/StudentLogin";
import InstructorOnboarding from "./pages/InstructorOnboarding";
import InstructorDetail from "./pages/InstructorDetail";
import Approvals from "./pages/Approvals";
import InstructorLogin from "./pages/InstructorLogin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<AuthLogin />} />
        <Route path="/student-signup" element={<StudentSignup />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student" element={ <RequireStudent> <StudentApp /> </RequireStudent>} />
        <Route path="/instructor" element={ <RequireInstructor>  <InstructorApp />  </RequireInstructor> } />
        <Route path="/instructor-login" element={<InstructorLogin />} />

        {/* PROTECTED ADMIN ROUTES */}
        <Route
          element={
            <RequireAdmin>
              <Layout />
            </RequireAdmin>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/dispatch" element={<DispatchMonitor />} />
          <Route path="/liquidity" element={<LiquidityMap />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/lesson" element={<LessonInspector />} />
          <Route path="/simulation" element={<SimulationPanel />} />
          <Route path="/maintenance" element={<ProjectionMaintenance />} />
          <Route path="/heatmap" element={<MarketplaceHeatmap />} />
          <Route path="/users" element={<UsersManagement />} />
          <Route
            path="/instructors/new"
            element={<InstructorOnboarding />}
          />
          <Route
           path="/instructors/:id"
           element={<InstructorDetail />}
          />
          <Route path="/approvals" element={<Approvals />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
