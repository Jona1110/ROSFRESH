// backend.gs - Google Apps Script
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doPost(e) {
  const sheetApp = SpreadsheetApp.openById(SHEET_ID);
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  try {
    if (action === "addProduct") {
      const sheet = sheetApp.getSheetByName("Productos");
      const id = "PROD-" + new Date().getTime();
      // Columnas: [ID, Nombre, Categoría, Precio, Descripción, Imagen Base64]
      sheet.appendRow([id, data.nombre, data.categoria, data.precio, data.descripcion || "", data.imagen || ""]);
      return ContentService.createTextOutput(JSON.stringify({"status": "success", "id": id})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "updateProduct") {
      const sheet = sheetApp.getSheetByName("Productos");
      const rows = sheet.getDataRange().getValues();
      let updated = false;
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 2).setValue(data.nombre);
          sheet.getRange(i + 1, 3).setValue(data.categoria);
          sheet.getRange(i + 1, 4).setValue(data.precio);
          sheet.getRange(i + 1, 5).setValue(data.descripcion);
          if (data.imagen) {
            sheet.getRange(i + 1, 6).setValue(data.imagen);
          }
          updated = true;
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({"status": updated ? "success" : "not_found"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "addFinance") {
      const sheet = sheetApp.getSheetByName("Finanzas");
      const id = "FIN-" + new Date().getTime();
      const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
      sheet.appendRow([id, fecha, data.tipo, data.monto, data.detalle || data.descripcion || ""]);
      return ContentService.createTextOutput(JSON.stringify({"status": "success", "id": id})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "deleteProduct") {
      return deleteRowById("Productos", data.id, sheetApp);
    }

    if (action === "deleteFinance") {
      return deleteRowById("Finanzas", data.id, sheetApp);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const sheetApp = SpreadsheetApp.openById(SHEET_ID);
  const action = e.parameter.action;

  try {
    if (action === "getProducts") {
      const sheet = sheetApp.getSheetByName("Productos");
      const rows = sheet.getDataRange().getValues();
      const data = [];
      for (let i = 1; i < rows.length; i++) {
        data.push({ 
          id: rows[i][0], 
          nombre: rows[i][1], 
          categoria: rows[i][2], 
          precio: rows[i][3], 
          descripcion: rows[i][4] || "",
          imagen: rows[i][5] || "" 
        });
      }
      return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getFinances") {
      const sheet = sheetApp.getSheetByName("Finanzas");
      const rows = sheet.getDataRange().getValues();
      const data = [];
      for (let i = 1; i < rows.length; i++) {
        data.push({ id: rows[i][0], fecha: rows[i][1], tipo: rows[i][2], monto: rows[i][3], detalle: rows[i][4] });
      }
      return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteRowById(sheetName, id, sheetApp) {
  const sheet = sheetApp.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1); 
      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "ID no encontrado"})).setMimeType(ContentService.MimeType.JSON);
}