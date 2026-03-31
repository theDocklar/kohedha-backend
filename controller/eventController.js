import Event from "../models/eventModel.js";

// Create a new event
export const createEvent = async (req, res) => {
  try {
    const {
      eventName,
      description,
      category,
      eventDate,
      eventEndDate,
      eventTime,
      maxCapacity,
      location,
      ticketPrice,
      images,
      isFree,
      isPublished,
      tags,
      contactPerson,
    } = req.body;

    // Validation
    if (
      !eventName ||
      !description ||
      !eventDate ||
      !eventTime ||
      !maxCapacity ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    // Create event
    const event = await Event.create({
      vendorId: req.vendor.id,
      eventName,
      description,
      category: category || "other",
      eventDate,
      eventEndDate,
      eventTime,
      maxCapacity,
      location,
      ticketPrice: ticketPrice || 0,
      images: images || [],
      isFree: ticketPrice > 0 ? false : true,
      isPublished: isPublished || false,
      tags: tags || [],
      contactPerson: contactPerson || {},
      status: "upcoming",
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error creating event",
    });
  }
};

// Get all events for a vendor
export const getVendorEvents = async (req, res) => {
  try {
    const { status, isPublished, sortBy } = req.query;

    // Build filter
    let filter = { vendorId: req.vendor.id };

    if (status) {
      filter.status = status;
    }

    if (isPublished !== undefined) {
      filter.isPublished = isPublished === "true";
    }

    // Sort options
    let sort = { eventDate: -1 }; // Default: newest first

    if (sortBy === "oldest") {
      sort = { eventDate: 1 };
    }

    const events = await Event.find(filter).sort(sort);

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching events",
    });
  }
};

// Get single event by ID
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if vendor owns this event
    if (event.vendorId.toString() !== req.vendor.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this event",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching event",
    });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check ownership
    if (event.vendorId.toString() !== req.vendor.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this event",
      });
    }

    // Check if event is completed or cancelled
    if (event.status === "completed" || event.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot update a ${event.status} event`,
      });
    }

    // Update fields
    const {
      eventName,
      description,
      category,
      eventDate,
      eventEndDate,
      eventTime,
      maxCapacity,
      location,
      ticketPrice,
      images,
      isFree,
      isPublished,
      status,
      tags,
      contactPerson,
    } = req.body;

    if (eventName) event.eventName = eventName;
    if (description) event.description = description;
    if (category) event.category = category;
    if (eventDate) event.eventDate = eventDate;
    if (eventEndDate) event.eventEndDate = eventEndDate;
    if (eventTime) event.eventTime = eventTime;
    if (maxCapacity) event.maxCapacity = maxCapacity;
    if (location) event.location = location;
    if (ticketPrice !== undefined) {
      event.ticketPrice = ticketPrice;
      event.isFree = ticketPrice > 0 ? false : true;
    }
    if (images) event.images = images;
    if (isFree !== undefined) event.isFree = isFree;
    if (isPublished !== undefined) event.isPublished = isPublished;
    if (status) event.status = status;
    if (tags) event.tags = tags;
    if (contactPerson) event.contactPerson = contactPerson;

    const updatedEvent = await event.save();

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error updating event",
    });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check ownership
    if (event.vendorId.toString() !== req.vendor.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this event",
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting event",
    });
  }
};
