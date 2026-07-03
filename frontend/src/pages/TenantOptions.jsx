import { useNavigate } from "react-router-dom";

function TenantOptions() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>TENANT</h1>

      <div className="button-group">
        <button onClick={() => navigate("/tenant/login")}>LOGIN</button>

        <button onClick={() => navigate("/tenant/register")}>
          REGISTER
        </button>
      </div>
    </div>
  );
}

export default TenantOptions;