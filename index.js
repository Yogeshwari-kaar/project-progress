const express = require("express");
const app = express();

const {projectProgressCalculation} = require('./get-tasks.controller');

const PORT = 5000;

app.use(express.json())

app.post('/progresscalculation', (req, res) => {
  projectProgressCalculation(req, res);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
