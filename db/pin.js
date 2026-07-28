const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function hashPin(pin) {
  return bcrypt.hashSync(pin, SALT_ROUNDS);
}

function verifyPin(pin, hash) {
  return bcrypt.compareSync(pin, hash);
}

module.exports = { hashPin, verifyPin };
