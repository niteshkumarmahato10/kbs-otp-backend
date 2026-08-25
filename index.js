const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// अस्थायी मेमोरी में OTP स्टोर करने के लिए
const otpStorage = {};

// Nodemailer ट्रांसपोर्टर (आपका Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // help.kbs.sigmaclasses@gmail.com
        pass: process.env.EMAIL_PASS  // आपका 16-अंकों का Gmail App Password
    }
});

// 1. OTP भेजने का Endpoint
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStorage[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 मिनट वैलिड

    try {
        await transporter.sendMail({
            from: `"KBS Sigma Classes" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verification OTP - KBS Sigma Classes',
            html: `<h3>Your 6-digit OTP code is: <b>${otp}</b></h3><p>Valid for 5 minutes.</p>`
        });
        console.log(`OTP ${otp} sent to ${email}`);
        res.json({ ok: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('Email send error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 2. OTP वेरीफाई करने का Endpoint
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const record = otpStorage[email];

    if (!record) {
        return res.json({ valid: false, reason: 'No OTP requested for this email' });
    }
    if (Date.now() > record.expiresAt) {
        return res.json({ valid: false, reason: 'OTP expired' });
    }
    if (record.otp === otp.trim()) {
        delete otpStorage[email]; // इस्तेमाल होने के बाद डिलीट
        return res.json({ valid: true });
    } else {
        return res.json({ valid: false, reason: 'Invalid OTP' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
