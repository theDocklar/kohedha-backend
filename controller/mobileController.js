import Event from "../models/eventModel.js";
import Deal from "../models/dealModel.js";
import Vendor from "../models/vendorModel.js";
import MobileUser from "../models/mobileUserModel.js";

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
    const { page = 1, limit = 20 } = req.query;

    const filter = { isProfileComplete: true };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Vendor.countDocuments(filter);
    const venues = await Vendor.find(filter)
      .select(
        "_id companyName location businessCategory description profilePicture vendorMobile"
      )
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: venues,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
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

// POST /api/mobile/user/profile
// Creates a user profile for a Firebase-authenticated user.
// If a profile already exists for this UID it is returned as-is (idempotent).
export const saveUserProfile = async (req, res) => {
  try {
    const { uid, email: tokenEmail } = req.user; // from firebaseAuth middleware
    const { fullName, email, vibes } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "fullName is required",
      });
    }

    const resolvedEmail = email || tokenEmail;
    if (!resolvedEmail) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    // Return existing profile if one already exists for this UID
    const existing = await MobileUser.findOne({ firebaseUid: uid });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Profile already exists",
        data: existing,
      });
    }

    const user = await MobileUser.create({
      firebaseUid: uid,
      fullName: fullName.trim(),
      email: resolvedEmail,
      vibes: Array.isArray(vibes) ? vibes : [],
    });

    res.status(201).json({
      success: true,
      message: "Profile created successfully",
      data: user,
    });
  } catch (error) {
    console.error("[Mobile] Error saving user profile:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error saving user profile",
    });
  }
};

// GET /api/mobile/user/by-email?email=user@example.com
// Returns a mobile user profile by email address.
export const getMobileUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "email query parameter is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email",
      });
    }

    const user = await MobileUser.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("[Mobile] Error fetching user by email:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching user",
    });
  }
};

// PUT /api/mobile/user/profile
// Updates fullName, email, and/or vibes for the authenticated user.
export const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const { fullName, email, vibes } = req.body;

    if (!fullName && !email && !Array.isArray(vibes)) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update: fullName, email, vibes",
      });
    }

    const user = await MobileUser.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found. Please create a profile first.",
      });
    }

    if (fullName) user.fullName = fullName.trim();
    if (email) user.email = email;
    if (Array.isArray(vibes)) user.vibes = vibes;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("[Mobile] Error updating user profile:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating user profile",
    });
  }
};
