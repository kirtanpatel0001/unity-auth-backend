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

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(403).json({ success: false, message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};

// Get User Profile API (Protected)
app.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.user.username });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            profile: {
                username: user.username,
                email: user.email,
                isLoggedIn: user.isLoggedIn,
                createdAt: user._id.getTimestamp()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching profile", error: error.message });
    }
});

// Get User Profile by Username (Public)
app.get('/api/profile/:username', async (req, res) => {
    try {
        console.log('Searching for user:', req.params.username);
        const user = await User.findOne({ username: req.params.username });
        console.log('Found user:', user);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found",
                searchedUsername: req.params.username
            });
        }

        // Convert user object to avoid any MongoDB specific issues
        const userProfile = {
            username: user.username,
            email: user.email,
            isLoggedIn: user.isLoggedIn
        };

        console.log('Sending profile:', userProfile);
        
        res.json({
            success: true,
            profile: userProfile
        });
    } catch (error) {
        console.error('Error in profile endpoint:', error);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching profile", 
            error: error.message,
            searchedUsername: req.params.username
        });
    }
});

// Health Check API
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Debug endpoint to check users (temporary)
app.get('/api/debug/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username email isLoggedIn');
        res.json({
            success: true,
            count: users.length,
            users: users.map(u => ({ username: u.username, email: u.email, isLoggedIn: u.isLoggedIn }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching users", error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});