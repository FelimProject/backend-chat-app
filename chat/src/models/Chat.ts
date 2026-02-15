import { Document , Schema , model} from "mongoose";

interface IChat extends Document{
  users : string[]
  latestMessage : {
    test : string,
    sender: string
  }
}

const chatSchema = new Schema<IChat>({
  users: {
    type: [String],
    required: true,
  },
  latestMessage: {
    text: { type: String },
    sender: { type: String },
  },
}, {
  timestamps: true,
});

export const Chat = model<IChat>('Chat', chatSchema);

