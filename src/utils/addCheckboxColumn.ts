import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { sheets_v4, drive_v3 } from "googleapis";

type CheckboxColumnConfig = {
  spreadsheetName: string;
  worksheetName: string;
  newColumnName: string;
  placement: "end" | "start" | "after_column";
  columnLetter?: string;
};

function throwError(message: string): never {
  console.log(
    `Checking environment: ${message} =`,
    process.env[message.toUpperCase()]
  );
  throw new Error(`Environment variable ${message} is missing`);
}

const DEFAULT_CONFIG: CheckboxColumnConfig = {
  spreadsheetName: "[Growth] Inner Circle Engagement Tracker",
  worksheetName: "ScriptAuto",
  newColumnName: "",
  placement: "after_column",
  columnLetter: "C",
};

const ROBBIE_CONFIG: CheckboxColumnConfig = {
  spreadsheetName: "[Growth] Inner Circle Engagement Tracker",
  worksheetName: "RobbieScriptAuto",
  newColumnName: "",
  placement: "after_column",
  columnLetter: "C",
};

export const normalizedPrivateKey = (
  process.env.PRIVATE_KEY ?? throwError("PRIVATE_KEY")
).replace(/\\n/g, "\n");

export const credentials = {
  type: process.env.TYPE ?? throwError("TYPE"),
  project_id: process.env.PROJECT_ID ?? throwError("PROJECT_ID"),
  private_key_id: process.env.PRIVATE_KEY_ID ?? throwError("PRIVATE_KEY_ID"),
  private_key: normalizedPrivateKey,
  client_email:
    process.env.GOOGLE_CLIENT_EMAIL ?? throwError("GOOGLE_CLIENT_EMAIL"),
  client_id: process.env.GOOGLE_CLIENT_ID ?? throwError("GOOGLE_CLIENT_ID"),
  auth_uri: process.env.AUTH_URI ?? throwError("AUTH_URI"),
  token_uri: process.env.TOKEN_URI ?? throwError("TOKEN_URI"),
  auth_provider_x509_cert_url:
    process.env.AUTH_PROVIDER_X509_CERT_URL ??
    throwError("AUTH_PROVIDER_X509_CERT_URL"),
  client_x509_cert_url:
    process.env.CLIENT_X509_CERT_URL ?? throwError("CLIENT_X509_CERT_URL"),
  universe_domain: process.env.UNIVERSE_DOMAIN ?? throwError("UNIVERSE_DOMAIN"),
};

export async function addCheckboxColumn(
  checkedRows: number[],
  tweetUrl: string,
  isRobbie: boolean,
  postDate: Date
): Promise<void> {
  let finalConfig: CheckboxColumnConfig;

  if (isRobbie) {
    finalConfig = { ...ROBBIE_CONFIG };
  } else {
    finalConfig = { ...DEFAULT_CONFIG };
  }

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

    await worksheet.loadCells();

    let columnIndex: number;
    if (finalConfig.placement === "end") {
      columnIndex = worksheet.columnCount + 1;
    } else if (finalConfig.placement === "start") {
      columnIndex = 1;
    } else if (
      finalConfig.placement === "after_column" &&
      finalConfig.columnLetter
    ) {
      columnIndex =
        finalConfig.columnLetter.toUpperCase().charCodeAt(0) -
        "A".charCodeAt(0) +
        2;
    } else {
      throwError("Invalid placement option or missing column letter");
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: worksheet.sheetId,
                dimension: "COLUMNS",
                startIndex: columnIndex - 1,
                endIndex: columnIndex,
              },
            },
          },
        ],
      },
    });

    const headerCell = worksheet.getCell(0, columnIndex - 1);
    headerCell.value = finalConfig.newColumnName;

    // Format the date as MMM DD YYYY
    const formattedDate = postDate.toLocaleDateString("en-US", {
      month: "short", // "MMM"
      day: "2-digit", // "DD"
      year: "numeric", // "YYYY"
    });

    // Add the formatted date to row 1 (index 1)
    const dateCell = worksheet.getCell(1, columnIndex - 1);
    dateCell.value = formattedDate;

    const urlCell = worksheet.getCell(2, columnIndex - 1);
    urlCell.value = tweetUrl;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            setDataValidation: {
              range: {
                sheetId: worksheet.sheetId,
                startRowIndex: 3,
                endRowIndex: worksheet.rowCount,
                startColumnIndex: columnIndex - 1,
                endColumnIndex: columnIndex,
              },
              rule: {
                condition: {
                  type: "BOOLEAN",
                },
                strict: true,
              },
            },
          },
        ],
      },
    });

    if (checkedRows.length > 0) {
      const updates = checkedRows
        .filter((row) => row >= 4 && row <= worksheet.rowCount)
        .map((row) => ({
          row: row - 1,
          col: columnIndex - 1,
          value: true,
        }));

      for (const update of updates) {
        const cell = worksheet.getCell(update.row, update.col);
        cell.value = update.value;
      }
    }

    await worksheet.saveUpdatedCells();

    if (checkedRows.length > 0) {
      console.log(
        `Added checkbox column '${finalConfig.newColumnName}' to worksheet '${finalConfig.worksheetName}' with ${checkedRows.length} rows checked`
      );
    }
  } catch (error) {
    console.error(
      "An error occurred:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}
