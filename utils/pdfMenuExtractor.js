import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRequire } from "module";
import sharp from "sharp";
import {
  convertPdfToImages,
  cropFoodItem,
  saveFoodImage,
  savePageImage,
} from "./imageProcessor.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Convert pdf buffer to images
export const pdfToImages = async (pdfBuffer) => {
  try {
    // Parse pdf to get info
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();

    const pageCount = result.numpages || 1;
    const textContent = result.text;

    // Image conversion should implement here

    return {
      pageCount,
      textContent,
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
};

// Extract menu items from pdf
export const extractMenuFromPDF = async (pdfBuffer, menuSchema = null) => {
  try {
    const { textContent, pageCount } = await pdfToImages(pdfBuffer);

    if (!textContent || textContent.trim().length === 0) {
      throw new Error(
        "PDF appears to be empty or contains only images. OCR processing required.",
      );
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Structured prompt for menu extraction
    const prompt = `You are a menu data extraction expert. Extract ALL menu items from the following restaurant menu text.

        MENU TEXT:
        ${textContent}

        INSTRUCTIONS:
        1. Extract every menu item you can find
        2. Identify the category for each item (e.g., Appetizers, Main Courses, Desserts, Beverages, etc.)
        3. Extract item name, description, price, and currency
        4. If no description is provided, leave it empty
        5. If multiple prices exist (e.g., different sizes), create separate entries
        6. Normalize currency codes (e.g., Rs, රු -> LKR, $ -> USD)
        7. Convert prices to numbers (remove currency symbols and commas)

        REQUIRED OUTPUT FORMAT (JSON array):
        [
        {
            "category": "string (e.g., Appetizers, Main Course)",
            "name": "string (item name)",
            "description": "string (optional, can be empty)",
            "price": number (numeric value only),
            "currency": "string (ISO code: LKR, USD, EUR, etc.)"
        }
        ]

        IMPORTANT:
        - Return ONLY valid JSON array, no additional text
        - Ensure all prices are positive numbers
        - Use "LKR" as default currency if not specified
        - Group items by category logically
        - If you cannot extract data, return an empty array []

        Extract the menu items now:`;

    // Call API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let extractedItems;
    try {
      // Clean response
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      extractedItems = JSON.parse(cleanedText);
    } catch (parseError) {
      throw new Error(
        `Failed to parse Gemini response as JSON: ${parseError.message}`,
      );
    }

    // Validate extracted data
    if (!Array.isArray(extractedItems)) {
      throw new Error("Gemini did not return an array of items");
    }

    // Sanitize and validate each item
    const validatedItems = extractedItems.map((item, index) => {
      // Basic validation
      if (!item.name || !item.category) {
        throw new Error(
          `Item at index ${index} missing required fields (name or category)`,
        );
      }

      return {
        category: String(item.category || "Uncategorized").trim(),
        name: String(item.name).trim(),
        description: String(item.description || "").trim(),
        price: parseFloat(item.price) || 0,
        currency: String(item.currency || "LKR")
          .toUpperCase()
          .trim(),
      };
    });

    return {
      success: true,
      totalItems: validatedItems.length,
      pages: pageCount,
      items: validatedItems,
    };
  } catch (error) {
    throw new Error(`Menu extraction failde: ${error.message}`);
  }
};

/**
 * Extract menu items with images using Gemini Vision
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {String} vendorId - Vendor ID for saving images
 * @returns {Promise<Object>} Extracted menu items with image data
 */
export const extractMenuWithImages = async (pdfBuffer, vendorId) => {
  try {
    // Step 1: Convert PDF pages to images
    console.log("Converting PDF to images...");
    const pageImages = await convertPdfToImages(pdfBuffer);
    console.log(`Converted ${pageImages.length} pages to images`);

    if (pageImages.length === 0) {
      throw new Error("Failed to convert PDF pages to images");
    }

    // Initialize Gemini Vision model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const allMenuItems = [];
    let totalItemsProcessed = 0;

    // Step 2: Process each page
    for (const pageImage of pageImages) {
      console.log(`Processing page ${pageImage.page}...`);

      try {
        // Save full page image for reference
        const pageImageUrl = await savePageImage(
          pageImage.buffer,
          vendorId,
          pageImage.page,
        );

        // Resize image for Gemini API (max 2000px on longest side to avoid timeout)
        console.log(`Resizing image from ${pageImage.width}x${pageImage.height}...`);
        const resizedBuffer = await sharp(pageImage.buffer, { limitInputPixels: 268402689 })
          .resize(2000, 2000, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        
        const resizedMetadata = await sharp(resizedBuffer).metadata();
        console.log(`Resized to ${resizedMetadata.width}x${resizedMetadata.height}, size: ${(resizedBuffer.length / 1024 / 1024).toFixed(2)} MB`);

        // Convert resized buffer to base64 for Gemini Vision
        const base64Image = resizedBuffer.toString("base64");

        // Prompt for Gemini Vision with bounding box detection
        const prompt = `You are a food photograph detector for a restaurant menu. Your ONLY job is to find individual food photographs/images and their associated menu details.

STEP 1: LOCATE FOOD PHOTOGRAPHS
Look at the menu and find each individual FOOD PHOTOGRAPH (not text, not borders, not the entire menu item - ONLY the actual photo of food).
Common patterns in menus:
- Photo on LEFT side, text on RIGHT side → Box ONLY the left photo
- Photo ABOVE, text BELOW → Box ONLY the top photo
- Small square/circular food images → Box each image individually
- Row layout with photo + name + price → Box ONLY the photo portion

STEP 2: EXTRACT TEXT NEAR EACH PHOTO
For each food photo you found, read the nearby text to get:
- Item name (e.g., "Classic Burger", "Chicken Tacos")  
- Price (extract the number only, e.g., 12.99)
- Description (if visible)
- Category (e.g., "Burgers", "Appetizers", "Drinks")

STEP 3: CREATE BOUNDING BOX FOR FOOD PHOTO ONLY
For the bounding box:
- x, y = top-left corner of the FOOD PHOTO as percentage of page width/height (0-100)
- width, height = dimensions of the FOOD PHOTO ONLY as percentage (0-100)
- DO NOT include text labels, prices, or descriptions in the bounding box
- The box should fit tightly around the food photograph itself

VISUAL CUES for food photos:
✓ Look for: plates, bowls, actual food, garnishes, food textures, colors
✗ Ignore: text blocks, prices, ingredient lists, menu borders, column separators

CRITICAL RULES:
1. If you see 10 food photos on the page, return 10 items with 10 different bounding boxes
2. Each bounding box should be SMALL (typically 5-30% width, 5-20% height for individual photos)
3. If you're detecting boxes that are 40%+ wide, you're probably boxing text too - STOP and box only the photo
4. If an item has NO photo (text-only), set imageBoundingBox to null
5. Bounding boxes should NOT overlap significantly
6. Read the name/price from nearby text but box ONLY the photo

EXAMPLE OUTPUT for a menu with photo-on-left layout:
If you see: [BURGER PHOTO] "Classic Burger - Rs 500"
Your bounding box should ONLY cover [BURGER PHOTO], not the text.

Return ONLY valid JSON array:
[
  {
    "name": "Classic Burger",
    "category": "Burgers",
    "description": "Juicy beef patty with cheese",
    "price": 500,
    "currency": "LKR",
    "imageBoundingBox": {
      "x": 5.0,
      "y": 35.0,
      "width": 15.0,
      "height": 12.0
    }
  }
]

If NO food photos exist (text-only menu), return [].
Your response MUST be valid JSON only, no markdown, no explanations.`;

        // Call Gemini Vision API
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image,
            },
          },
        ]);

        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        let pageItems;
        try {
          const cleanedText = text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          pageItems = JSON.parse(cleanedText);
        } catch (parseError) {
          console.error(
            `Failed to parse Gemini Vision response for page ${pageImage.page}:`,
            parseError.message,
          );
          pageItems = [];
        }

        if (!Array.isArray(pageItems)) {
          console.warn(`Page ${pageImage.page}: Response is not an array`);
          pageItems = [];
        }

        console.log(`Found ${pageItems.length} items on page ${pageImage.page}`);

        // Step 3: Process each detected item - crop and save image
        for (const item of pageItems) {
          try {
            console.log(`Processing item: ${item.name}...`);
            
            // Check if item has a food image
            let imageBbox = item.imageBoundingBox;
            
            if (!imageBbox || typeof imageBbox.x === 'undefined') {
              console.log(`  No food image detected for "${item.name}", skipping image crop`);
              // Add item without image
              allMenuItems.push({
                category: String(item.category || "Uncategorized").trim(),
                name: String(item.name || "Unnamed Item").trim(),
                description: String(item.description || "").trim(),
                price: parseFloat(item.price) || 0,
                currency: String(item.currency || "LKR").toUpperCase().trim(),
                imageUrl: null,
                thumbnailUrl: null,
                imageMetadata: null,
                pageNumber: pageImage.page,
                pageImageUrl: pageImageUrl,
              });
              continue;
            }
            
            console.log(`  Original bounding box (percentage):`, imageBbox);
            
            // SMART ADJUSTMENT: Fix bounding boxes that likely include text
            // Common menu pattern: Photo on LEFT, text on RIGHT
            // If the box is wider than it is tall, likely it includes both photo and text
            const aspectRatio = imageBbox.width / imageBbox.height;
            
            if (aspectRatio > 2.0) {
              // Very wide box - likely includes both photo and text
              console.log(`  Box is very wide (ratio: ${aspectRatio.toFixed(2)}) - adjusting to left portion only`);
              // Assume photo is roughly square or portrait, take the left portion
              // Use the height as a guide for width
              const adjustedWidth = Math.min(imageBbox.width * 0.35, imageBbox.height * 1.2);
              imageBbox = {
                x: imageBbox.x,
                y: imageBbox.y,
                width: adjustedWidth,
                height: imageBbox.height,
              };
              console.log(`  Adjusted to:`, imageBbox);
            } else if (aspectRatio > 1.5) {
              // Moderately wide - might include some text
              console.log(`  Box is moderately wide (ratio: ${aspectRatio.toFixed(2)}) - adjusting to left 50%`);
              imageBbox = {
                x: imageBbox.x,
                y: imageBbox.y,
                width: imageBbox.width * 0.5,
                height: imageBbox.height,
              };
              console.log(`  Adjusted to:`, imageBbox);
            }
            
            // If box is still very large (more than 35% of page), shrink it
            if (imageBbox.width > 35 || imageBbox.height > 35) {
              console.log(`  Box is too large (${imageBbox.width}% x ${imageBbox.height}%) - shrinking to 80%`);
              const centerX = imageBbox.x + imageBbox.width / 2;
              const centerY = imageBbox.y + imageBbox.height / 2;
              imageBbox = {
                x: centerX - (imageBbox.width * 0.4),
                y: centerY - (imageBbox.height * 0.4),
                width: imageBbox.width * 0.8,
                height: imageBbox.height * 0.8,
              };
              console.log(`  Shrunken to:`, imageBbox);
            }
            
            // Convert percentage-based bounding box to pixel coordinates
            const pixelBbox = {
              x: (imageBbox.x / 100) * pageImage.width,
              y: (imageBbox.y / 100) * pageImage.height,
              width: (imageBbox.width / 100) * pageImage.width,
              height: (imageBbox.height / 100) * pageImage.height,
            };
            console.log(`  Final bounding box (pixels):`, pixelBbox);

            // Crop food item from page image
            console.log(`  Cropping food image...`);
            const croppedBuffer = await cropFoodItem(
              pageImage.buffer,
              pixelBbox,
            );
            console.log(`  Cropped successfully, buffer size: ${croppedBuffer.length} bytes`);

            // Save cropped image and thumbnail
            console.log(`  Saving image...`);
            const imageData = await saveFoodImage(
              croppedBuffer,
              vendorId,
              item.name || "unnamed-item",
            );
            console.log(`  Saved successfully: ${imageData.imageUrl}`);

            // Add item with image data
            allMenuItems.push({
              category: String(item.category || "Uncategorized").trim(),
              name: String(item.name || "Unnamed Item").trim(),
              description: String(item.description || "").trim(),
              price: parseFloat(item.price) || 0,
              currency: String(item.currency || "LKR").toUpperCase().trim(),
              imageUrl: imageData.imageUrl,
              thumbnailUrl: imageData.thumbnailUrl,
              imageMetadata: imageData.metadata,
              pageNumber: pageImage.page,
              pageImageUrl: pageImageUrl,
            });

            totalItemsProcessed++;
          } catch (itemError) {
            console.error(
              `  Failed to process item "${item.name}" on page ${pageImage.page}:`,
              itemError.message,
            );
            console.error(itemError.stack);
            // Add item without image
            allMenuItems.push({
              category: String(item.category || "Uncategorized").trim(),
              name: String(item.name || "Unnamed Item").trim(),
              description: String(item.description || "").trim(),
              price: parseFloat(item.price) || 0,
              currency: String(item.currency || "LKR").toUpperCase().trim(),
              imageUrl: null,
              thumbnailUrl: null,
              imageMetadata: null,
              pageNumber: pageImage.page,
              pageImageUrl: pageImageUrl,
            });
          }
        }
      } catch (pageError) {
        console.error(
          `Failed to process page ${pageImage.page}:`,
          pageError.message,
        );
      }
    }

    return {
      success: true,
      totalItems: allMenuItems.length,
      totalPages: pageImages.length,
      items: allMenuItems,
    };
  } catch (error) {
    throw new Error(`Menu extraction with images failed: ${error.message}`);
  }
};

