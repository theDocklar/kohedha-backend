import mongoose from "mongoose";

const eventSchema = mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    eventName: {
      type: String,
      required: [true, "Please provide an event name"],
      trim: true,
      maxlength: [100, "Event name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Please provide an event description"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    category: {
      type: String,
      enum: [
        "live-music",
        "special-dinner",
        "promotion",
        "theme-night",
        "workshop",
        "other",
      ],
      required: true,
      default: "other",
    },

    eventDate: {
      type: Date,
      required: [true, "Please provide an event date"],
    },

    eventTime: {
      type: String, // Format: "HH:mm" (24-hour format)
      required: [true, "Please provide event start time"],
    },

    duration: {
      type: Number, // in minutes
      required: [true, "Please provide event duration"],
      min: 30,
    },

    maxCapacity: {
      type: Number,
      required: [true, "Please provide maximum capacity"],
      min: 1,
    },

    currentRegistrations: {
      type: Number,
      default: 0,
      min: 0,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    ticketPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0, // Free event if 0
    },

    images: [
      {
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isPaid: {
      type: Boolean,
      default: false,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    contactPerson: {
      name: String,
      phone: String,
      email: String,
    },

    specialRequirements: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Index for better query performance
eventSchema.index({ vendorId: 1, eventDate: 1 });
eventSchema.index({ status: 1, isPublished: 1 });

const Event = mongoose.model("Event", eventSchema);

export default Event;
