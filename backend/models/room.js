import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    users: { type: [String], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
