const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware Setup
app.use(express.json());
app.use(cors());

// Ensure 'uploads' directory exists for storing APK files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Configure Multer for APK file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// In-Memory Database
let apps = [];
let users = [];

// ================= APPS ROUTES =================

// Get all apps
app.get('/api/apps', (req, res) => {
    res.json(apps);
});

// Upload a new app / game (with APK file)
app.post('/api/apps', upload.single('apkFile'), (req, res) => {
    try {
        const { name, packageName, category, description } = req.body;
        const fileUrl = req.file ? `http://localhost:${PORT}/uploads/${req.file.filename}` : '';

        const newApp = {
            id: Date.now().toString(),
            name,
            packageName,
            category,
            description,
            fileUrl,
            status: 'PENDING_REVIEW',
            aiAudit: null
        };

        apps.push(newApp);
        res.json({ success: true, message: 'App submitted to review queue', app: newApp });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve a pending app
app.post('/api/apps/:id/approve', (req, res) => {
    const app = apps.find(a => a.id === req.params.id);
    if (app) {
        app.status = 'APPROVED';
        res.json({ success: true, message: 'App approved successfully', app });
    } else {
        res.status(404).json({ success: false, message: 'App not found' });
    }
});

// Delete or Reject an app
app.delete('/api/apps/:id', (req, res) => {
    const initialLength = apps.length;
    apps = apps.filter(a => a.id !== req.params.id);
    if (apps.length < initialLength) {
        res.json({ success: true, message: 'App removed successfully' });
    } else {
        res.status(404).json({ success: false, message: 'App not found' });
    }
});


// ================= AUTHENTICATION ROUTES =================

// Sign Up
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const newUser = { name, email, password };
    users.push(newUser);
    res.json({ success: true, message: 'User registered successfully', user: { name, email } });
});

// Sign In
app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({ success: true, message: 'Signed in successfully', user: { name: user.name, email: user.email } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Origin Backend Server running on http://localhost:${PORT}`);
});
