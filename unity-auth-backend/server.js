// server.js

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || "my_super_secret_key"; // Change for production

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://admin:admin123@cluster0.dmaigil.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Register API
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.json({ success: false, message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        username,
        email,
        password: hashedPassword
    });

    await newUser.save();

    return res.json({ success: true, message: "User registered successfully" });
});

// Login API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.json({ success: false, message: "Invalid password" });
    }

    user.isLoggedIn = true;
    await user.save();

    const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });

    res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
            username: user.username,
            email: user.email
        }
    });
});

// Logout API
app.post('/api/logout', async (req, res) => {
    const { username } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }

    user.isLoggedIn = false;
    await user.save();

    return res.json({ success: true, message: "Logged out successfully" });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Unity Auth API' });
});

// Health Check API
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});