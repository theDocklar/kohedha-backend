import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

async function testUpload() {
  try {
    // Create a simple test - just check if endpoint responds
    const response = await fetch('http://localhost:5002/api/vendor/menu/upload-pdf-with-images?preview=true', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpload();
