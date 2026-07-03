import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import OwnerOptions from "./pages/OwnerOptions";
import TenantOptions from "./pages/TenantOptions";
import OwnerLogin from "./pages/OwnerLogin";
import OwnerRegister from "./pages/OwnerRegister";
import TenantLogin from "./pages/TenantLogin";
import TenantRegister from "./pages/TenantRegister";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/owner" element={<OwnerOptions />} />
      <Route path="/tenant" element={<TenantOptions />} />
      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route path="/owner/register" element={<OwnerRegister />} />
      <Route path="/tenant/login" element={<TenantLogin />} />
      <Route path="/tenant/register" element={<TenantRegister />} />
    </Routes>
  );
}

export default App;