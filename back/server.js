const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const secretKey = 'my_secret_key'
const cors = require('cors');

const options = {
    key: fs.readFileSync(path.join(__dirname, 'server.key')), 
    cert: fs.readFileSync(path.join(__dirname, 'server.crt'))
};




const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../front')));
app.use(express.json());
app.use(cors());

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
    res.sendFile(path.join(__dirname, '../front/reg.html'));
});

// Handle form submission
app.post('/submit', (req, res) => {
    const {name, surname, dob, class: studentClass,studentId,  username, password} = req.body;

    const user = {name, surname, dob, class: studentClass, studentId, username, password };

    db.query('INSERT INTO students SET ?', user, (error, results) => {
        if (error) {
            console.error('Error registering user:', error); // Логирование ошибок регистрации
            return res.status(400).send('Error registering user');
        }
            res.redirect('https://192.168.148.96:3000/aut.html');
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM students WHERE username =?', [username], (error, results) => {
        if (error) {
            console.error('Ошибка при входе:', error);
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
        }

        const user = results[0];

        if (user.password !== password) {
            return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
        }

        const token = jwt.sign({ id: user.studentId, username: user.username }, secretKey, { expiresIn: '1h' });
        res.json({ token });
    });
});


// Start the server

 https.createServer(options, app).listen(PORT, '192.168.148.96', () => {
        console.log(`Server is running on https://192.168.148.96:${PORT}`);
});