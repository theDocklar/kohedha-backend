import Table from "../models/tableModel.js";
import Vendor from "../models/vendorModel.js";

// Table creation by vendor
export const createTable = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const { tableNumber, seatingCapacity, tableType } = req.body;

    // Basic validation
    if (!tableNumber || !seatingCapacity) {
      return res.status(400).json({
        success: false,
        message: "Table number & capacity required.",
      });
    }

    const existingTable = await Table.findOne({ vendorId, tableNumber });
    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: `A table with number - ${tableNumber} already exists`,
      });
    }

    const table = await Table.create({
      vendorId,
      tableNumber,
      seatingCapacity: seatingCapacity || 1,
      tableType: tableType || "standard",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Table created successfully",
      data: table,
    });
  } catch (error) {
    console.error("Create table error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A table with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create table",
      error: error.message,
    });
  }
};

// Get all tables
export const getTables = async (req, res) => {
  try {
    const vendorId = req.vendor.id;

    const tables = await Table.find({ vendorId }).sort({ createdAt: -1 });

    // Get counts
    const totalTables = tables.length;
    const activeTables = tables.filter((table) => table.isActive).length;
    const totalCapacity = tables
      .filter((table) => table.isActive)
      .reduce((sum, table) => sum + table.seatingCapacity, 0);

    res.status(200).json({
      success: true,
      count: totalTables,
      data: {
        tables,
        stats: {
          totalTables,
          activeTables,
          inactiveTables: totalTables - activeTables,
          totalCapacity,
        },
      },
    });
  } catch (error) {
    console.error("Get tables error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tables",
      error: error.message,
    });
  }
};

// Get table by ID
export const getTableById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor.id;

    const table = await Table.findOne({ _id: id, vendorId });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    res.status(200).json({
      success: true,
      data: table,
    });
  } catch (error) {
    console.error("Get table error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch table",
      error: error.message,
    });
  }
};

// Update table information
export const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor.id;
    const { tableNumber, seatingCapacity, tableType, isActive } = req.body;

    const table = await Table.findOne({ _id: id, vendorId });
    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    // Check if new table name conflicts with another table
    if (tableNumber && tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({
        vendorId,
        tableNumber,
        _id: { $ne: id },
      });

      if (existingTable) {
        return res.status(400).json({
          success: false,
          message: "A table with this name already exists",
        });
      }
    }

    // Update fields
    if (tableNumber !== undefined) table.tableNumber = tableNumber;
    if (seatingCapacity !== undefined) table.seatingCapacity = seatingCapacity;
    if (tableType !== undefined) table.tableType = tableType;
    if (isActive !== undefined) table.isActive = isActive;

    await table.save();

    res.status(200).json({
      success: true,
      message: "Table updated successfully",
      data: table,
    });
  } catch (error) {
    console.error("Update table error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update table",
      error: error.message,
    });
  }
};

// Delete a table
export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor.id;

    const table = await Table.findOne({ _id: id, vendorId });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    // // Check if table has upcoming reservations before deleting
    // const hasReservations = await Reservation.findOne({
    //   tableId: id,
    //   reservationDate: { $gte: new Date() },
    //   status: { $in: ["pending", "confirmed"] }
    // });

    // if (hasReservations) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot delete table with upcoming reservations"
    //   });
    // }

    await table.deleteOne();

    res.status(200).json({
      success: true,
      message: "Table deleted successfully",
    });
  } catch (error) {
    console.error("Delete table error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete table",
      error: error.message,
    });
  }
};

// Get tables by type
export const getTablesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const vendorId = req.vendor.id;

    const tables = await Table.find({
      vendorId,
      tableType: type,
      isActive: true,
    }).sort({ seatingCapacity: 1 });

    res.status(200).json({
      success: true,
      count: tables.length,
      data: tables,
    });
  } catch (error) {
    console.error("Get tables by type error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tables",
      error: error.message,
    });
  }
};
