import BookingSlot from "../models/bookingSlotModel.js";
import Section from "../models/sectionModel.js";
import Table from "../models/tableModel.js";

// Create booking
export const createBookingSlot = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const {
      slotName,
      slotType,
      date,
      startTime,
      endTime,
      sectionId,
      description,
      maxBookings,
    } = req.body;

    // Validation
    if (!slotName || !date || !startTime || !endTime || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Verify section exists and belongs
    const section = await Section.findOne({
      _id: sectionId,
      vendorId,
      isActive: true,
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found or inactive",
      });
    }

    // Validate time
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time",
      });
    }

    // Validate date
    const slotDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      return res.status(400).json({
        success: false,
        message: "Can't create a booking slot for past dates",
      });
    }

    const bookingSlot = await BookingSlot.create({
      vendorId,
      slotName,
      slotType: slotType || "",
      date: new Date(date),
      startTime,
      endTime,
      sectionId,
      description: description || "",
      maxBookings: maxBookings || null,
      isActive: true,
      totalBookings: 0,
    });

    // Populate section info
    const populatedSlot = await BookingSlot.findById(bookingSlot._id).populate(
      "sectionId",
      "sectionName sectionType",
    );

    // Generate public link
    const publicLink = populatedSlot.getPublicLink();

    res.status(201).json({
      success: true,
      message: "Booking slot created successfully",
      data: {
        bookingSlot: populatedSlot,
        publicLink: publicLink,
        publicToken: populatedSlot.publicToken,
      },
    });
  } catch (error) {
    console.error("Create booking slot error: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// GET SINGLE BOOKING SLOT BY ID
export const getBookingSlotById = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;

    const bookingSlot = await BookingSlot.findOne({
      _id: id,
      vendorId,
    }).populate("sectionId", "sectionName sectionType");

    if (!bookingSlot) {
      return res.status(404).json({
        success: false,
        message: "Booking slot not found",
      });
    }

    // Get tables count in this section
    const tablesCount = await Table.countDocuments({
      vendorId,
      sectionId: bookingSlot.sectionId,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        ...bookingSlot.toObject(),
        publicLink: bookingSlot.getPublicLink(),
        availableTables: tablesCount,
      },
    });
  } catch (error) {
    console.error("Get booking slot error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all booking slots for vendor
export const getBookingSlots = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { isActive, date, sectionId } = req.query;

    let filter = { vendorId };

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Filter by date
    if (date) {
      const searchDate = new Date(date);
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // Filter by section
    if (sectionId) {
      filter.sectionId = sectionId;
    }

    const bookingSlots = await BookingSlot.find(filter)
      .populate("sectionId", "sectionName sectionType")
      .sort({ date: -1, startTime: -1 });

    // Add public links to each slot
    const slotsWithLinks = bookingSlots.map((slot) => ({
      ...slot.toObject(),
      publicLink: slot.getPublicLink(),
    }));

    res.status(200).json({
      success: true,
      count: slotsWithLinks.length,
      data: slotsWithLinks,
    });
  } catch (error) {
    console.error("Get booking slots error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update booking slot
export const updateBookingSlot = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;
    const updates = req.body;

    const bookingSlot = await BookingSlot.findOne({ _id: id, vendorId });

    if (!bookingSlot) {
      console.error("[Booking Error] Slot not found");
      return res.status(404).json({
        success: false,
        message: "Booking slot not found",
      });
    }

    // Prevent updating if there are existing bookings
    if (bookingSlot.totalBookings > 0) {
      // You can allow some fields to be updated even with bookings
      const allowedUpdates = ["description", "isActive", "maxBookings"];
      const updateKeys = Object.keys(updates);
      const hasRestrictedUpdates = updateKeys.some(
        (key) => !allowedUpdates.includes(key),
      );

      if (hasRestrictedUpdates) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot update slot details (date, time, section) when bookings exist. You can only update description, status, or max bookings.",
        });
      }
    }

    // If updating section, verify it exists
    if (updates.sectionId) {
      const section = await Section.findOne({
        _id: updates.sectionId,
        vendorId,
        isActive: true,
      });

      if (!section) {
        console.log("[ Booking Error ] Section not found or inactive");
        return res.status(404).json({
          success: false,
          message: "Section not found or inactive",
        });
      }
    }

    // Validate time if updating
    const newStartTime = updates.startTime || bookingSlot.startTime;
    const newEndTime = updates.endTime || bookingSlot.endTime;

    if (newStartTime >= newEndTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time",
      });
    }

    // Don't allow updating these
    Object.keys(updates).forEach((key) => {
      if (key !== "publicToken" && key !== "totalBookings") {
        bookingSlot[key] = updates[key];
      }
    });

    // Update
    await bookingSlot.save();

    const updatedSlot = await BookingSlot.findById(id).populate(
      "sectionId",
      "sectionName sectionType",
    );

    console.log(`Booking updated: ${bookingSlot._id}`);
    res.status(200).json({
      success: true,
      message: "Booking slot updated successfully",
      data: {
        ...updatedSlot.toObject(),
        publicLink: updatedSlot.getPublicLink(),
      },
    });
  } catch (error) {
    console.error("Update booking slot error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Chanege booking slot status
export const toggleBookingSlotStatus = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;

    const bookingSlot = await BookingSlot.findOne({ _id: id, vendorId });

    if (!bookingSlot) {
      return res.status(404).json({
        success: false,
        message: "Booking slot not found",
      });
    }

    bookingSlot.isActive = !bookingSlot.isActive;
    await bookingSlot.save();

    console.log(`Booking slot: ${bookingSlot.slotName} status updated`);
    res.status(200).json({
      success: true,
      message: `Booking slot ${bookingSlot.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        isActive: bookingSlot.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle booking slot status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete booking slot
export const deleteBookingSlot = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { id } = req.params;

    const bookingSlot = await BookingSlot.findOne({ _id: id, vendorId });

    if (!bookingSlot) {
      console.log("Booking slot not found");
      return res.status(404).json({
        success: false,
        message: "Booking slot not found",
      });
    }

    // Check if there are existing bookings
    if (bookingSlot.totalBookings > 0) {
      console.error(
        `Cannot delete booking slot with ${bookingSlot.totalBookings} existing bookings.`,
      );
      return res.status(400).json({
        success: false,
        message: `Cannot delete booking slot with ${bookingSlot.totalBookings} existing bookings. Please cancel bookings first or deactivate the slot.`,
      });
    }

    await BookingSlot.findByIdAndDelete(id);

    console.log("Booking slot deleted successfully");
    res.status(200).json({
      success: true,
      message: "Booking slot deleted successfully",
    });
  } catch (error) {
    console.error("Delete booking slot error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
