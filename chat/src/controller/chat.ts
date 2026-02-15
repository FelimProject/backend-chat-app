import { Response } from 'express';
import TryCatch from '../config/TryCatch';
import { Messages } from '../models/Message';
import { Chat } from '../models/Chat';
import axios from 'axios';
import { AuthenticatedRequest } from '../middleware/isAuth';
import { getRecieverSocketId, io } from '../config/socket';


export const createNewChat = TryCatch(async (req : AuthenticatedRequest, res : Response) => {
  const userId = req.user?._id;
  const { otherUserId } = req.body;

  if (!otherUserId) {
    return res.status(400).json({
      message: "Other user is required"
    });
  }

  const existingChat = await Chat.findOne({
    users: { $all: [userId, otherUserId], $size: 2 }
  });

  if (existingChat) {
    return res.status(400).json({
      message: "Chat already exists",
      chatId: existingChat._id
    });
  }

  const newChat = await Chat.create({
    users: [userId, otherUserId]
  });

  res.status(201).json({
    message: "New Chat created",
    chat: newChat
  });
});

export const getAllChats = TryCatch(async (req : AuthenticatedRequest, res : Response) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(400).json({
      message: "user id is missing"
    });
  }

  const chats = await Chat.find({ users: userId }).sort({ updatedAt: -1 });

  const chatWithUserData = await Promise.all(
    chats.map(async (chat) => {
      const otherUserId = chat.users.find(id => id !== userId);

      const unseenCount = await Messages.countDocuments({
        chatId: chat._id,
        sender: { $ne: userId },
        seen: false
      });

      try {
        const { data, status } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`);
        if (status === 200) {
          return {
            user: data,
            chat: {
              ...chat.toObject(),
              latestMessage: chat.latestMessage,
              unseenCount
            }
          };
        }
      } catch (error) {
        if(error instanceof Error){
          console.error(error.message)
        }
        return {
          user: { _id: otherUserId, name: "Unknown" },
          chat: {
            ...chat.toObject(),
            latestMessage: chat.latestMessage,
            unseenCount
          }
        };
      }
    })
  );

  res.status(200).json({ chats: chatWithUserData });
});

export const sendMessage = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const senderId = req.user?._id;
  const { chatId, text, cloudinaryResult } = req.body;
  const imageFile = req.file;

  if (!senderId) {
    return res.status(401).json({
      message: "Sender ID is missing"
    });
  }

  if(!chatId){
     return res.status(400).json({
      message: "Chat ID is required"
    });
  }

  if (!text && !imageFile) {
    return res.status(400).json({
      message: "Either text or image is required"
    });
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({
      message: "Chat not found"
    });
  }

  const isUserInChat = chat.users.some(
    (userId) => userId.toString() === senderId.toString()
  );

  if (!isUserInChat) {
    return res.status(403).json({
      message: "You are not a participant in this chat"
    });
  }

  const otherUserId = chat.users.find(
    (userId) => userId.toString() !== senderId.toString()
  );

  if (!otherUserId) {
    return res.status(401).json({
      message: "Unauthorized: No other participant found"
    });
  }

  const recieverSocketId = getRecieverSocketId(otherUserId.toString());
  let isRecieverInChatRoom = false;

  if(recieverSocketId){
    const recieverSocket = io.sockets.sockets.get(recieverSocketId);
    if(recieverSocket && recieverSocket.rooms.has(chatId)){
      isRecieverInChatRoom = true;
    }
  }

  let messageData : any = {
    chatId: chatId,
    sender: senderId,
    seen: isRecieverInChatRoom,
    seenAt: isRecieverInChatRoom ? new Date() : undefined

  };

  if (imageFile && cloudinaryResult) {
    messageData.image = {
      url: cloudinaryResult.url,         
      publicId: cloudinaryResult.publicId 
    };

    messageData.messageType = "image";
    messageData.text = text || "";
  } else {
    messageData.text = text;
    messageData.messageType = "text";
  }

  const message = new Messages(messageData);
  const savedMessage = await message.save();

  const latestMessageText = imageFile ? "Image" : text;

  await Chat.findByIdAndUpdate(
    chatId,
    {
      latestMessage: {
        text: latestMessageText,
        sender: senderId
      },
      updatedAt: new Date()
    },
    { new: true }
  );

  io.to(chatId).emit("newMessage", savedMessage);

  if(recieverSocketId){
    io.to(recieverSocketId).emit("newMessage", savedMessage);
  }

  const senderSocketId = getRecieverSocketId(senderId.toString());

  if(senderSocketId){
    io.to(senderSocketId).emit("newMessage", savedMessage);
  }

  if(isRecieverInChatRoom && senderSocketId){
    io.to(senderSocketId).emit("messageSeen", {
      chatId: chatId,
      seenBy: otherUserId,
      messageIds: [savedMessage._id]
    })
  }


  return res.status(201).json({
    message: savedMessage,
    sender: senderId
  });
});

export const getMessagesByChat = TryCatch(async(req : AuthenticatedRequest , res : Response) => {
  const userId  = req.user?._id;
  const {chatId} = req.params;''

   if(!userId){
     return res.status(400).json({
      message: "Unauthorized"
    });
  }

  if(!chatId){
     return res.status(400).json({
      message: "Chat ID is required"
    });
  }

  const chat = await Chat.findById(chatId);

  if(!chat){
    return res.status(404).json({
      message:"Chat not found"
    });
  }

  const isUserInChat = chat.users.some(
    (currentUserId) => currentUserId.toString() === userId.toString()
  );

  if (!isUserInChat) {
    return res.status(403).json({
      message: "You are not a participant in this chat"
    });
  }

  const messagesToMarkSeen = await Messages.find({
    chatId : chatId,
    sender : { $ne : userId},
    seen: false
  });


  await Messages.updateMany({
    chatId : chatId,
    sender : { $ne : userId},
    seen : false
  } , {
    seen: true,
    seenAt: new Date()
  });

  const messages = await Messages.find({chatId}).sort({ createdAt : 1});

  const otherUserId = chat.users.find((id) => id !== userId);

  try {
    const { data, status } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`);

    if(!otherUserId){
      return res.status(400).json({
        message : "No other user"
      });
    }

    if(messagesToMarkSeen.length > 0){
      const otherUserSocketId = getRecieverSocketId(otherUserId.toString());

      if(otherUserSocketId){
        io.to(otherUserSocketId).emit("messagesSeen", {
          chatId: chatId,
          seenBy: userId,
          messagesIds: messagesToMarkSeen.map((msg) => msg._id)
        })
      }
    }

    

    if (status == 200){
      return res.status(200).json({
        messages,
        user : data
      });
    }

  } catch (error) {
    if(error instanceof Error){
      console.error(error.message);
      res.status(500).json({
        messages,
        user: {
          _id : otherUserId , name: "Unknown User"
        }
      })
    }
  }

})