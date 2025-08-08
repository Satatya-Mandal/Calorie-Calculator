const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log("Server running at http://localhost:3000");
  console.log("Access on network: http://<your-local-ip>:${PORT}");
});