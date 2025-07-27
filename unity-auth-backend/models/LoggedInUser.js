const mongoose = require('mongoose');

const LoggedInUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  loginTime: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoggedInUser', LoggedInUserSchema);