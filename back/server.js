const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'adm', // replace with your MySQL username
    password: '123', // replace with your MySQL password
    database: 'KPP' // replace with your MySQL database name
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err); // Log the error details
        return; // Exit the function if there is an error
    }
    
    console.log('DB connected...'); // Log when the DB is connected


});
// Serve the HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname+ '../'));
});

// Handle form submission
app.post('/submit', (req, res) => {
    const { studentId, name, surname, dob, class: studentClass } = req.body;
    const sql = 'INSERT INTO students (studentId, name, surname, dob, class) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [studentId, name, surname, dob, studentClass], (err, result)  => {
        if (err) {
            return res.status(500).send('Error inserting data');
        }
        res.send('Data inserted successfully!');
    });
});

app.post('/submit-qr', (req, res) => {
    const { studentId } = req.body; // Assuming the QR code contains the student ID
    console.log('Scanned Student ID:', studentId);
    
    // Here you can handle the student ID, e.g., save it to a database or perform other actions

    res.json({ message: 'Student ID received successfully!', studentId });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});