import mongoose from "mongoose";

const reservationSchema = mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendor",
      required: true,
      index: true,
    },

    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
      index: true,
    },

    // Customer info can get after creating customer collection
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmail: {
      type: String,
      // required: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },

    numberOfGuests: {
      type: Number,
      required: true,
      min: [1, "At least 1 guest required"],
    },

    reservationDate: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      // required: true,
      validate: {
        validator: function (v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: "Invalid time format. Use HH:mm (24-hour format)",
      },
    },

    endTime: {
      type: String,
      // required: true,
      validate: {
        validator: function (v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: "Invalid time format. Use HH:mm (24-hour format)",
      },
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no-show"],
      default: "pending",
      index: true,
    },

    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, "Special requests cannot exceed 500 characters"],
    },

    cancellationReason: {
      type: String,
      trim: true,
    },

    cancelledAt: {
      type: Date,
    },

    cancelledBy: {
      type: String,
      enum: ["customer", "vendor", "system"],
    },

    confirmedAt: {
      type: Date,
    },

    createdBy: {
      type: String,
      enum: ["customer", "vendor"],
      default: "customer",
    },
  },
  { timestamps: true },
);