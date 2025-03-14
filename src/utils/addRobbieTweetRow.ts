import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { sheets_v4, drive_v3 } from "googleapis";
import { credentials } from "./addCheckboxColumn";

type RowConfig = {
  spreadsheetName: string;
  worksheetName: string;
  newRowName: string;
  placement: "above_row";
  rowNumber: number;
};

const ROBBIE_TWEET_CONFIG: RowConfig = {
  spreadsheetName: "Tweet Review @0xferg",
  worksheetName: "Tweet ratings",
  newRowName: "",
  placement: "above_row",
  rowNumber: 2,
};

export async function addRobbieTweetRow(
  tweetUrl: string,
  likesCount: number,
  postDate: Date
): Promise<void> {
  const finalConfig = { ...ROBBIE_TWEET_CONFIG };

  try {
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    const drive = new drive_v3.Drive({ auth });
    const sheets = new sheets_v4.Sheets({ auth });

    const fileList = await drive.files.list({
      q: `name='${finalConfig.spreadsheetName}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: "files(id)",
      spaces: "drive",
    });

    if (!fileList.data.files?.length) {
      throw new Error(`Spreadsheet '${finalConfig.spreadsheetName}' not found`);
    }

    const spreadsheetId = fileList.data.files[0].id;
    if (!spreadsheetId) {
      throw new Error("Failed to get spreadsheet ID");
    }

    const doc = new GoogleSpreadsheet(spreadsheetId, auth);
    await doc.loadInfo();

    const worksheet = doc.sheetsByTitle[finalConfig.worksheetName];
    if (!worksheet) {
      throw new Error(`Worksheet '${finalConfig.worksheetName}' not found`);
    }

    // Insert a new row at the specified position
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: worksheet.sheetId,
                dimension: "ROWS",
                startIndex: finalConfig.rowNumber - 1,
                endIndex: finalConfig.rowNumber,
              },
            },
          },
        ],
      },
    });

    // Load cells after inserting the row
    await worksheet.loadCells();

    // Format the date as DD/MM/YYYY
    const formattedDate = postDate.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    // Get the time in AEST (Australian Eastern Standard Time)
    const aestTime = new Date(postDate).toLocaleTimeString("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Insert the URL in column B (index 1)
    const urlCell = worksheet.getCell(finalConfig.rowNumber - 1, 1);
    urlCell.value = tweetUrl;

    // Insert the likes count in column C (index 2)
    const likesCell = worksheet.getCell(finalConfig.rowNumber - 1, 2);
    likesCell.value = likesCount;

    // Insert the time (AEST) in column F (index 5)
    const timeCell = worksheet.getCell(finalConfig.rowNumber - 1, 5);
    timeCell.value = aestTime;

    // Insert the formatted date in column G (index 6)
    const dateCell = worksheet.getCell(finalConfig.rowNumber - 1, 6);
    dateCell.value = formattedDate;

    // Save the updated cells
    await worksheet.saveUpdatedCells();

    console.log(
      `Added row for tweet '${tweetUrl}' with ${likesCount} likes to worksheet '${finalConfig.worksheetName}'`
    );
  } catch (error) {
    console.error(
      "An error occurred:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}
