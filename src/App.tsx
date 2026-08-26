import {BrowserRouter,Navigate,Route,Routes} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import HospitalApplication from "./pages/HospitalApplication";
import FamilyPortal from "./pages/FamilyPortal";
import EvidenceResearch from "./pages/EvidenceResearch";
import CarrierMlResearch from "./pages/CarrierMlResearch";
import ResearchPortal from "./pages/ResearchPortal";
import AdminVerification from "./pages/AdminVerification";
import ProtectedRoute from "./pages/ProtectedRoute";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import ForFamilies from "./pages/public/ForFamilies";
import ForHospitals from "./pages/public/ForHospitals";
import ResourcesHub from "./pages/public/ResourcesHub";
import AboutDmdPage from "./pages/public/AboutDmdPage";
import AssessmentSync from "./components/AssessmentSync";import AssessmentAssignmentGate from "./components/AssessmentAssignmentGate";import FamilyAssessments from "./pages/FamilyAssessments";import "./styles/global.css";
import "./styles/auth.css";

import HospitalGateway from "./pages/HospitalGateway";
export default function App(){return <BrowserRouter><AssessmentSync/><AssessmentAssignmentGate/><Routes>
<Route path="/" element={<Home/>}/>
<Route path="/families" element={<ForFamilies/>}/>
<Route path="/hospitals" element={<ForHospitals/>}/>
<Route path="/resources" element={<ResourcesHub/>}/>
<Route path="/about-dmd" element={<AboutDmdPage/>}/>
<Route path="/login" element={<Login/>}/><Route path="/signup" element={<Signup/>}/><Route path="/auth/callback" element={<AuthCallback/>}/><Route path="/reset-password" element={<ResetPassword/>}/>
<Route path="/hospital-application" element={<ProtectedRoute allowed={["hospital_applicant"]}><HospitalApplication/></ProtectedRoute>}/>
<Route path="/family" element={<ProtectedRoute allowed={["family"]}><FamilyPortal/></ProtectedRoute>}/><Route path="/family/evidence" element={<ProtectedRoute allowed={["family"]}><EvidenceResearch/></ProtectedRoute>}/><Route path="/family/genetics-ml" element={<ProtectedRoute allowed={["family"]}><CarrierMlResearch/></ProtectedRoute>}/><Route path="/family/assessments" element={<ProtectedRoute allowed={["family"]}><FamilyAssessments/></ProtectedRoute>}/>
<Route path="/admin" element={<ProtectedRoute allowed={["admin"]}><AdminVerification/></ProtectedRoute>}/>
<Route path="/research" element={<ResearchPortal/>}/>
<Route path="/hospital" element={<HospitalGateway />} />
<Route path="/clinical" element={<HospitalGateway />} />
<Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></BrowserRouter>}
