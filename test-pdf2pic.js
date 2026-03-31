import { fromBuffer } from "pdf2pic";
import fs from "fs";

// Create a simple test - we'll use a dummy PDF buffer
const testPDF2Pic = async () => {
  console.log("Testing pdf2pic...");
  
  // For now, let's test with the existing PDF if it exists
  // Or we can create a minimal PDF for testing
  
  // Test 1: Check if pdf2pic works at all
  const options = {
    density: 100,
    saveFilename: "test",
    savePath: "./temp",
    format: "png",
    width: 600,
    height: 800,
    preserveAspectRatio: true,
  };
  
  console.log("Options:", options);
  
  // Create a minimal PDF buffer (this is a valid minimal PDF)
  const minimalPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Page) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
410
%%EOF`;
  
  const pdfBuffer = Buffer.from(minimalPdfContent);
  console.log("Created test PDF buffer, size:", pdfBuffer.length, "bytes");
  
  try {
    const convert = fromBuffer(pdfBuffer, options);
    console.log("Created converter");
    
    // Try bulk conversion instead of single page
    console.log("\nTrying bulk conversion (all pages)...");
    const bulkResult = await convert.bulk(-1, { responseType: "buffer" });
    console.log("Bulk result:", {
      type: typeof bulkResult,
      isArray: Array.isArray(bulkResult),
      length: bulkResult?.length
    });
    
    if (Array.isArray(bulkResult) && bulkResult.length > 0) {
      console.log("First page:", {
        type: typeof bulkResult[0],
        isBuffer: Buffer.isBuffer(bulkResult[0]),
        keys: Object.keys(bulkResult[0] || {}),
        bufferLength: bulkResult[0]?.buffer?.length || 0,
      });
    }
    
    console.log("\nTrying single page conversion...");
    const result = await convert(1, { responseType: "buffer" });
    console.log("Result:", {
      type: typeof result,
      isBuffer: Buffer.isBuffer(result),
      keys: Object.keys(result || {}),
      bufferLength: result?.buffer?.length || 0,
      size: result?.size,
      page: result?.page,
    });
    
    if (result?.buffer && result.buffer.length > 0) {
      console.log("✅ PDF conversion works! Buffer size:", result.buffer.length);
    } else {
      console.log("❌ Buffer is empty or missing");
    }
  } catch (error) {
    console.error("Error:", error.message);
    console.error(error);
  }
};

testPDF2Pic();
