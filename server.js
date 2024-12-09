const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to run the shell script
app.get('/run-script', (req, res) => {
    exec('whoami', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: `Error: ${error.message}` });
        }
        if (stderr) {
            return res.status(500).json({ error: `Stderr: ${stderr}` });
        }
		console.log(stdout);
        res.json({ output: stdout.trim() }); // Send script output
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});