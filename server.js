const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { attachUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'aajkaam-dev-secret-change-in-production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));
app.use(express.static(path.join(__dirname, 'public')));
app.use(attachUser);

const ROLE_HOME = { worker: '/worker', supervisor: '/entry', management: '/management' };
app.get('/', (req, res) => res.redirect(req.user ? ROLE_HOME[req.user.role] : '/login'));

app.use('/', require('./routes/auth'));
app.use('/setup', require('./routes/setup'));
app.use('/entry', require('./routes/entry'));
app.use('/worker', require('./routes/worker'));
app.use('/management', require('./routes/management'));

app.listen(PORT, () => console.log(`AajKaam running on port ${PORT}`));
