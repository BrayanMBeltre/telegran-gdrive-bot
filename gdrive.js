require("dotenv").config();
const { google } = require("googleapis");
const axios = require("axios").default;
const fs = require("fs");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const MAIN_FOLDER_ID = process.env.MAIN_FOLDER_ID;

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

async function getFileFromTelegram(url) {
  try {
    const response = await axios({
      url,
      method: "get",
      responseType: "stream",
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function uploadFile(file_name, mime_type, file) {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: file_name,
        mimeType: mime_type,
        // parents: [MAIN_FOLDER_ID],
      },
      media: {
        body: file,
        mimeType: mime_type,
      },
    });

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

async function createFolder(folder_name) {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: folder_name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [MAIN_FOLDER_ID],
      },
    });

    return response.data;
  } catch (error) {
    console.log(`Error message: ${error.message}`);
  }
}

async function listFolders(folderId, page_token) {
  try {
    const response = await drive.files.list({
      corpora: "user",
      q: `"${folderId || MAIN_FOLDER_ID}" in parents and trashed = false and mimeType="application/vnd.google-apps.folder"`,
      pageSize: 15,
      pageToken: page_token ? page_token : "",
      fields: "nextPageToken, files(id, name, mimeType)",
      orderBy: "name",
    });

    console.log(response.data)
    return response.data;
  } catch (error) {
    console.log(`Error message: ${error.message}`);
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
    return result.data;
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = {
  getFileFromTelegram,
  uploadFile,
  deleteFile,
  generatePublicUrl,
  createFolder,
  listFolders,
};
