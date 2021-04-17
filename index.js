const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");
const axios = require("axios").default;

require("dotenv").config();

//TODO add git.ignore
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({
  version: "v3",
  auth: oAuth2Client,
});

// const fileName = "templarAssasin.jpg";
// const filePath = path.join(__dirname, fileName);

async function getFileFromTelegram(url) {
  const response = await axios({
    url,
    method: "get",
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    resolve(response.data);
    reject("error" + reject);
  });
}

async function upploadFile(fileName, fileType, file) {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: fileType,
      },
      media: {
        body: file,
        mimeType: fileType,
      },
    });

    console.log(response.data);
    return response.data;
  } catch (error) {
    console.log(`Error message: ${error.message}`);
  }
}

async function deleteFile(fileId) {
  try {
    const response = await drive.files.delete({
      fileId: fileId,
    });

    console.log(response.data, response.status);
  } catch (error) {
    console.log(error.message);
  }
}

async function generatePublicUrl(fileId) {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const result = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink, webContentLink",
    });
    console.log(result.data);
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = {
  getFileFromTelegram,
  upploadFile,
  generatePublicUrl,
  deleteFile,
  generatePublicUrl,
};

// downloadFile();
//generatePublicUrl("1oEmeCXc7Jd4JKJFk5zaDocu1GSSEAt6o");
//upploadFile();
//deleteFile(1oEmeCXc7Jd4JKJFk5zaDocu1GSSEAt6o);
