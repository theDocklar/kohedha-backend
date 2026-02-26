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
