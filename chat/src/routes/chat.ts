import { Router } from 'express';
import { isAuth } from '../middleware/isAuth'
import { createNewChat, getAllChats, sendMessage , getMessagesByChat } from '../controller/chat';
import { upload , uploadImageMiddleware } from '../middleware/multer';

const router = Router();

router.post('/chat/new', isAuth, createNewChat);
router.get('/chat/all', isAuth, getAllChats);
router.post('/message', isAuth , upload.single('image'), uploadImageMiddleware , sendMessage);
router.get("/message/:chatId", isAuth, getMessagesByChat)

export default router;
