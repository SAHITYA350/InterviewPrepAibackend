import express from 'express';
import authController from '../controllers/authController.js';
const { registerUser, loginUser, getUserProfile, updateProfile } = authController;

import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/update-profile', protect, updateProfile);

router.post("/upload-image", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    // Convert the file buffer to a base64 string
    const base64Image = req.file.buffer.toString('base64');
    // Create the Data URI string
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    res.status(200).json({ imageUrl });
})

export default router;