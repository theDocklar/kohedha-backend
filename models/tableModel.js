import mongoose from "mongoose";

const tableSchema = mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },

    seatingCapacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },

    tableType: {
      type: String,
      enum: ["indoor", "outdoor"],
      default: "standard",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Compound index for vendor + table name uniqueness
tableSchema.index({ vendorId: 1, tableNumber: 1 }, { unique: true });

// Index for active tables
tableSchema.index({ vendorId: 1, isActive: 1 });

const Table = mongoose.model("Table", tableSchema);
export default Table;
