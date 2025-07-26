const pngToIco = require('png-to-ico');
const fs = require('fs');

async function convertIcon() {
  try {
    console.log('Converting applogo.png to icon.ico...');
    const buf = await pngToIco('public/applogo.png');
    fs.writeFileSync('assets/icon.ico', buf);
    console.log('Successfully created assets/icon.ico');
  } catch (error) {
    console.error('Error converting icon:', error);
  }
}

convertIcon();
