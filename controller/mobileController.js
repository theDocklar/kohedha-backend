import Event from "../models/eventModel.js";
import Deal from "../models/dealModel.js";
import Vendor from "../models/vendorModel.js";

// GET /api/mobile/events
// Returns all published, upcoming events across all vendors
export const getMobileEvents = async (req, res) => {
  try {
    const { category, sortBy, page = 1, limit = 20 } = req.query;

    const filter = { isPublished: true, status: "upcoming" };

    if (category) {
      filter.category = category;
    }

    let sort = { eventDate: 1 }; // Soonest first by default

    if (sortBy === "newest") {
      sort = { createdAt: -1 };
    } else if (sortBy === "oldest") {
      sort = { eventDate: 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[Mobile] Error fetching events:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching events",
    });
  }
};

// GET /api/mobile/events/:id
// Returns a single published event by ID
export const getMobileEventById = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      isPublished: true,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or not available",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("[Mobile] Error fetching event by ID:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching event",
    });
  }
};

// GET /api/mobile/deals
// Returns all published, active deals across all vendors
export const getMobileDeals = async (req, res) => {
  try {
    const { category, sortBy, page = 1, limit = 20 } = req.query;

    const filter = { isPublished: true, status: "active" };

    if (category) {
      filter.category = category;
    }

    let sort = { priority: 1, createdAt: -1 };

    if (sortBy === "newest") {
      sort = { publishedAt: -1 };
    } else if (sortBy === "rating") {
      sort = { rating: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Deal.countDocuments(filter);
    const deals = await Deal.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: deals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[Mobile] Error fetching deals:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching deals",
    });
  }
};

// GET /api/mobile/venues
// Returns all vendors with a completed profile
export const getMobileVenues = async (req, res) => {
  try {
    const venues = await Vendor.find({ isProfileComplete: true }).select(
      "_id companyName location businessCategory description profilePicture vendorMobile"
    );

    res.status(200).json({
      success: true,
      data: venues,
    });
  } catch (error) {
    console.error("[Mobile] Error fetching venues:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching venues",
    });
  }
};

// GET /api/mobile/deals/:id
// Returns a single published deal by ID
export const getMobileDealById = async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      isPublished: true,
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found or not available",
      });
    }

    res.status(200).json({
      success: true,
      data: deal,
    });
  } catch (error) {
    console.error("[Mobile] Error fetching deal by ID:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching deal",
    });
  }
};
