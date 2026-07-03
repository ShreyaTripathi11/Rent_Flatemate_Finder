import { useNavigate } from "react-router-dom";

function OwnerOptions() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>OWNER</h1>

      <div className="button-group">
        <button onClick={() => navigate("/owner/login")}>LOGIN</button>

        <button onClick={() => navigate("/owner/register")}>
          REGISTER
        </button>
      </div>
    </div>
  );
}

export default OwnerOptions;