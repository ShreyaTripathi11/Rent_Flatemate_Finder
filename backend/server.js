const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend Running");
});

// Owner Register
app.post("/owner/register", (req, res) => {

    console.log("Owner Register");
    console.log(req.body);

    res.json({
        message: "Owner Registered"
    });

});

// Owner Login
app.post("/owner/login", (req, res) => {

    console.log("Owner Login");
    console.log(req.body);

    res.json({
        message: "Owner Logged In"
    });

});

// Tenant Register
app.post("/tenant/register", (req, res) => {

    console.log("Tenant Register");
    console.log(req.body);

    res.json({
        message: "Tenant Registered"
    });

});

// Tenant Login
app.post("/tenant/login", (req, res) => {

    console.log("Tenant Login");
    console.log(req.body);

    res.json({
        message: "Tenant Logged In"
    });

});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
