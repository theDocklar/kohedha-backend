import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure upload directory
const UPLOADS_DIR = path.join(__dirname, "../uploads");
const MENU_IMAGES_DIR = path.join(UPLOADS_DIR, "menu-images");

/**
 * Ensure upload directories exist
 */
export const ensureUploadDirectories = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(MENU_IMAGES_DIR)) {
    fs.mkdirSync(MENU_IMAGES_DIR, { recursive: true });
  }
};

/**
 * Convert PDF buffer to images (one per page) using pdftoppm directly
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Array>} Array of image buffers with page info
 */
export const convertPdfToImages = async (pdfBuffer) => {
  try {
    console.log('[PDF Conversion] Starting PDF to image conversion using pdftoppm...');
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate unique temp filename
    const tempPdfPath = path.join(tempDir, `temp_${uuidv4()}.pdf`);
    const outputPrefix = path.join(tempDir, `page_${uuidv4()}`);
    
    try {
      // Write PDF buffer to temp file
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      console.log('[PDF Conversion] Wrote PDF to temp file');
      
      // Use pdftoppm to convert PDF to PNG images
      // -png = PNG format
      // -r 150 = 150 DPI resolution (balanced quality, prevents huge images)
      // Output will be: {outputPrefix}-1.png, {outputPrefix}-2.png, etc.
      const command = `pdftoppm -png -r 150 "${tempPdfPath}" "${outputPrefix}"`;
      console.log('[PDF Conversion] Running pdftoppm...');
      
      const { stdout, stderr } = await execAsync(command);
      if (stderr) {
        console.log('[PDF Conversion] pdftoppm stderr:', stderr);
      }
      
      // Read generated PNG files
      const files = fs.readdirSync(tempDir)
        .filter(f => path.basename(f).startsWith(path.basename(outputPrefix)))
        .sort(); // Sort to get pages in order
      
      console.log(`[PDF Conversion] Generated ${files.length} page images`);
      
      const images = [];
      for (let i = 0; i < files.length; i++) {
        const filePath = path.join(tempDir, files[i]);
        const buffer = fs.readFileSync(filePath);
        
        // Get image dimensions using sharp with increased pixel limit
        const metadata = await sharp(buffer, { limitInputPixels: 268402689 }).metadata();
        
        images.push({
          buffer: buffer,
          page: i + 1,
          width: metadata.width,
          height: metadata.height,
        });
        
        console.log(`[PDF Conversion] Page ${i + 1} loaded: ${buffer.length} bytes (${metadata.width}x${metadata.height})`);
        
        // Clean up temp image file
        fs.unlinkSync(filePath);
      }
      
      // Clean up temp PDF file
      fs.unlinkSync(tempPdfPath);
      
      console.log(`[PDF Conversion] Total pages converted: ${images.length}`);
      return images;
    } catch (error) {
      // Clean up temp files on error
      try {
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        const files = fs.readdirSync(tempDir)
          .filter(f => path.basename(f).startsWith(path.basename(outputPrefix)));
        files.forEach(f => fs.unlinkSync(path.join(tempDir, f)));
      } catch (cleanupError) {
        console.error('[PDF Conversion] Cleanup error:', cleanupError.message);
      }
      throw error;
    }
  } catch (error) {
    console.error('[PDF Conversion] Error:', error);
    throw new Error(`PDF to image conversion failed: ${error.message}`);
  }
};

/**
 * Crop individual food item from page image using bounding box
 * @param {Buffer} imageBuffer - Full page image buffer
 * @param {Object} boundingBox - {x, y, width, height} in pixels
 * @returns {Promise<Buffer>} Cropped image buffer
 */
export const cropFoodItem = async (imageBuffer, boundingBox) => {
  try {
    const { x, y, width, height } = boundingBox;

    // Ensure positive dimensions
    const cropWidth = Math.max(width, 100);
    const cropHeight = Math.max(height, 100);

    const croppedImage = await sharp(imageBuffer)
      .extract({
        left: Math.max(0, Math.round(x)),
        top: Math.max(0, Math.round(y)),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    return croppedImage;
  } catch (error) {
    throw new Error(`Image cropping failed: ${error.message}`);
  }
};

/**
 * Save food item image and create thumbnail
 * @param {Buffer} imageBuffer - Cropped food item image
 * @param {String} vendorId - Vendor ID
 * @param {String} itemName - Food item name
 * @returns {Promise<Object>} {imageUrl, thumbnailUrl, metadata}
 */
export const saveFoodImage = async (imageBuffer, vendorId, itemName) => {
  try {
    ensureUploadDirectories();

    // Create vendor-specific directory
    const vendorDir = path.join(MENU_IMAGES_DIR, vendorId);
    if (!fs.existsSync(vendorDir)) {
      fs.mkdirSync(vendorDir, { recursive: true });
    }

    // Sanitize filename
    const sanitizedName = itemName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const timestamp = Date.now();
    const uniqueId = uuidv4().split("-")[0]; // First segment of UUID
    const filename = `${timestamp}_${sanitizedName}_${uniqueId}`;

    // Save original image
    const imagePath = path.join(vendorDir, `${filename}.jpg`);
    await sharp(imageBuffer).jpeg({ quality: 85 }).toFile(imagePath);

    // Create thumbnail
    const thumbnailPath = path.join(vendorDir, `${filename}_thumb.jpg`);
    await sharp(imageBuffer)
      .resize(300, 300, { fit: "cover", position: "center" })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();

    // Generate relative URLs
    const imageUrl = `/uploads/menu-images/${vendorId}/${filename}.jpg`;
    const thumbnailUrl = `/uploads/menu-images/${vendorId}/${filename}_thumb.jpg`;

    return {
      imageUrl,
      thumbnailUrl,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        size: imageBuffer.length,
        format: metadata.format,
      },
    };
  } catch (error) {
    throw new Error(`Failed to save food image: ${error.message}`);
  }
};

/**
 * Delete food item images
 * @param {String} imageUrl - URL path to main image
 * @param {String} thumbnailUrl - URL path to thumbnail
 */
export const deleteFoodImage = async (imageUrl, thumbnailUrl) => {
  try {
    const basePath = path.join(__dirname, "..");

    if (imageUrl) {
      const imagePath = path.join(basePath, imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    if (thumbnailUrl) {
      const thumbPath = path.join(basePath, thumbnailUrl);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }
  } catch (error) {
    console.error("Error deleting food image:", error.message);
  }
};

/**
 * Process full page image: save for reference
 * @param {Buffer} imageBuffer - Full page image buffer
 * @param {String} vendorId - Vendor ID
 * @param {Number} pageNum - Page number
 * @returns {Promise<String>} Image URL
 */
export const savePageImage = async (imageBuffer, vendorId, pageNum) => {
  try {
    ensureUploadDirectories();

    const vendorDir = path.join(MENU_IMAGES_DIR, vendorId);
    if (!fs.existsSync(vendorDir)) {
      fs.mkdirSync(vendorDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `page_${pageNum}_${timestamp}.jpg`;
    const imagePath = path.join(vendorDir, filename);

    await sharp(imageBuffer)
      .jpeg({ quality: 90 })
      .toFile(imagePath);

    return `/uploads/menu-images/${vendorId}/${filename}`;
  } catch (error) {
    throw new Error(`Failed to save page image: ${error.message}`);
  }
};
