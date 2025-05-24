const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const secretKey = 'my_secret_key'
const cors = require('cors');
const axios = require('axios');
/*все необходимые зависимости */

const options = {
    key: fs.readFileSync(path.join(__dirname, 'server.key')), 
    cert: fs.readFileSync(path.join(__dirname, 'server.crt')) };
/*шифрование*/

const app = express();
const PORT = 3000;
const agent = new https.Agent({  
    rejectUnauthorized: false });
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
app.use(express.urlencoded({ extended: true }));
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
    const {name, surname, patronymic,dob, class: studentClass,  username, password} = req.body;
    const user = {name, surname, patronymic,dob, class: studentClass , username, password };
    db.query('INSERT INTO students SET ?', user, (error, results) => {
        if (error) {
            console.error('Error registering user:', error); // Логирование ошибок регистрации
            return res.status(400).send('Error registering user');
        }
            res.redirect('https://192.168.1.61:3000/aut.html'); }); }); 
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

        const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '1h' });
        res.json({ token });
    });
});


app.post('/log', (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).send({ message: 'Токен не предоставлен' });
    }
  
    const data = req.body;
    const currentDate = new Date();
    const tableName = `log_${currentDate.getDate()}_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}`;
  
    const query = `INSERT INTO ${tableName} (name, surname, patronymic, class, status, time) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(query, [data.name, data.surname, data.patronymic, data.class, data.status, new Date()], (err, results) => {
      if (err) {
        console.error('Ошибка записи данных:', err);
        return res.status(500).send({ message: 'Ошибка записи данных' });
      }
  
      // Дублируем данные в таблицу log
      const logQuery = `INSERT INTO log (name, surname, patronymic, class, status, time) VALUES (?, ?, ?, ?, ?, ?)`;
      db.query(logQuery, [data.name, data.surname, data.patronymic, data.class, data.status, new Date()], (err, results) => {
        if (err) {
          console.error('Ошибка записи данных в таблицу log:', err);
          // Вы можете выбрать, что делать в случае ошибки записи в таблицу log
          // Например, вы можете отправить ошибку клиенту или просто проигнорировать ее
          res.send({ message: 'Данные записаны успешно, но произошла ошибка при записи в таблицу log' });
        } else {
          res.send({ message: 'Данные записаны успешно' });
        }
      });
    });
  });

  app.post('/open-shift', (req, res) => {
  const currentDate = new Date();
  const tableName = `log_${currentDate.getDate()}_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}`;

  const query = `CREATE TABLE IF NOT EXISTS ${tableName} (id INT AUTO_INCREMENT, name VARCHAR(255), surname VARCHAR(255), patronymic VARCHAR(255), class VARCHAR(255), status VARCHAR(255), time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))`;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Ошибка создания таблицы:', err);
      return res.status(500).send({ message: 'Ошибка создания таблицы' });
    }
    res.send({ message: 'Таблица создана успешно' });
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
app.get('/profile', authenticateToken, async (req, res) => {
    const username = req.user.username; // Извлекаем имя пользователя из токена

    db.query('SELECT * FROM students WHERE username = ?', [username], async (error, results) => {
        if (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            return res.status(500).json({ message: 'Ошибка сервера', error: error.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const userData = results[0]; // Получаем данные пользователя

        try {
            const response = await axios.post('https://192.168.1.61:3000/qr.html', userData, { httpsAgent: agent });
            console.log('Response:', response.data); // Логируем ответ от сервера
            if (response.status === 200) {
                return res.json({ message: 'Данные успешно доставлены', data: userData });
            } else {
                return res.status(500).json({ message: 'Ошибка при отправке данных на другой сайт' });
            }
        } catch (error) {
            console.error('Ошибка при отправке данных на другой сайт:', error.response ? error.response.data : error.message);
            return res.status(500).json({ message: 'Ошибка сервера при отправке данных', error: error.message });
        }
    });
});

app.post('/qr.html', (req, res) => {
    const userData = req.body; // Получаем данные из запроса
    const userDataWithoutPassword = { ...userData }; // Создаем копию данных
    delete userDataWithoutPassword.password; // Удаляем пароль из копии
    console.log(userDataWithoutPassword); // Логируем данные для проверки
    res.send('Данные получены'); // Отправляем ответ клиенту
});

let storedData = null;

app.post('/guard.html', (req, res) => {
    console.log('Запрос на /guard.html получен');
    const data = req.body;
    const dataWithoutPassword = { ...data }; // Создаем копию данных
    delete dataWithoutPassword.password; // Удаляем пароль из копии
  
    // Форматируем дату рождения с помощью регулярных выражений
    const dob = dataWithoutPassword.dob;
    const formattedDob = dob.replace(/T.*$/, '').split('-').reverse().join('.');
    dataWithoutPassword.dob = formattedDob;
  
    console.log('Полученные данные:', dataWithoutPassword);
    storedData = dataWithoutPassword; // сохраняем данные в глобальной переменной
    res.json({ status: 'success', received: dataWithoutPassword });
  });
  
  app.get('/guard/data', (req, res) => {
    // возвращаем данные, которые были отправлены ранее
    if (storedData !== null) {
      res.json({ status: 'success', received: storedData });
    } else {
      res.json({ status: 'error', message: 'Нет данных' });
    }
  });
// Start the server

 https.createServer(options, app).listen(PORT, '192.168.1.61', () => {
        console.log(`Server is running on https://192.168.1.61:${PORT}`);
});