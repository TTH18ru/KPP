const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const secretKey = 'my_secret_key'
const cors = require('cors');
/*все необходимые зависимости */

const options = {
    key: fs.readFileSync(path.join(__dirname, 'server.key')), 
    cert: fs.readFileSync(path.join(__dirname, 'server.crt')) };
/*шифрование*/

const app = express();
const PORT = 3000;
const db = mysql.createConnection({
    host: 'localhost',
    user: 'adm', 
    password: '123', 
    database: 'KPP'  });
/*база*/

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../front')));
app.use(express.json());
app.use(cors());
/*middleware */

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err); /*обработка ошибки*/
        return; }  
    console.log('DB connected...'); });     /*успешное подключение */ 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/reg.html'));    });
/*назначение корневой папки */


app.post('/submit', (req, res) => {
    const {name, surname, dob, class: studentClass,studentId,  username, password} = req.body;
    const user = {name, surname, dob, class: studentClass, studentId, username, password };
    db.query('INSERT INTO students SET ?', user, (error, results) => {
        if (error) {
            console.error('Error registering user:', error); // Логирование ошибок регистрации
            return res.status(400).send('Error registering user');
        }
            res.redirect('https://192.168.1.60:3000/aut.html'); }); }); 
            /*регистрация */

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM students WHERE username = ?', [username], (error, results) => {
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

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]; // Получаем токен из заголовка

    if (!token) return res.sendStatus(401); // Если токен отсутствует, возвращаем 401

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403); // Если токен недействителен, возвращаем 403
        req.user = user; // Сохраняем данные пользователя в запросе
        next(); // Переходим к следующему middleware
    });
};

// Получение данных пользователя
app.get('/profile', authenticateToken, (req, res) => {
    const userId = req.user.id; // Извлекаем идентификатор пользователя из токена

    db.query('SELECT * FROM students WHERE studentId = ?', [userId], (error, results) => {
        if (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json(results[0]); // Возвращаем данные пользователя
    });
});


// Start the server

 https.createServer(options, app).listen(PORT, '192.168.1.60', () => {
        console.log(`Server is running on https://192.168.1.60:${PORT}`);
});