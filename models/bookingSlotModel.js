import mongoose from "mongoose";
import crypto from "crypto";

const bookingSlotSchema = mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    slotName: {
      type: String,
      trim: true,
    },

    slotType: {
      type: String,
      trim: true,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: [true, "Start time is required"],
      validate: {
        validator: function (v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: "Invalid time format. Use HH:mm (24-hour format)",
      },
    },

    endTime: {
      type: String,
      required: [true, "End time is required"],
      validate: {
        validator: function (v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: "Invalid time format. Use HH:mm (24-hour format)",
      },
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    publicToken: {
      type: String,
      unique: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    totalBookings: {
      type: Number,
      default: 0,
    },

    maxBookings: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

// Generate unique public token 
bookingSlotSchema.pre("save", function () {
  if (this.isNew && !this.publicToken) {
    this.publicToken = crypto.randomBytes(16).toString("hex");
  }
});

// Generate public booking link
bookingSlotSchema.methods.getPublicLink = function () {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${frontendUrl}/book/${this.publicToken}`;
};

// Indexes for performance
bookingSlotSchema.index({ vendorId: 1, date: 1, sectionId: 1 });
bookingSlotSchema.index({ publicToken: 1 });
bookingSlotSchema.index({ vendorId: 1, isActive: 1 });

const BookingSlot = mongoose.model("BookingSlot", bookingSlotSchema);
export default BookingSlot;
