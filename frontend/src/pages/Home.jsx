import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>RENT AND FLATMATE FINDER</h1>

      <div className="button-group">
        <button onClick={() => navigate("/owner")}>OWNER</button>

        <button onClick={() => navigate("/tenant")}>TENANT</button>
      </div>
    </div>
  );
}

export default Home;