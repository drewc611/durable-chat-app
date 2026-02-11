const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// API to handle submissions
app.post('/api/submissions', (req, res) => {
    const submission = req.body;
    // Handle submission logic here
    console.log('Submission received:', submission);
    res.status(201).send({ message: 'Submission received successfully!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});