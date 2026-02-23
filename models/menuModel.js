import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "LKR",
      uppercase: true,
    },
    is_available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
menuItemSchema.index({ vendorId: 1, category: 1 });
menuItemSchema.index({ vendorId: 1, is_available: 1 });

const Menu = mongoose.model("Menu", menuItemSchema);
export default Menu;
