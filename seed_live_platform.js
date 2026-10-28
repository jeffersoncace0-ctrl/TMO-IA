const fs = require('fs');
const path = require('path');

async function seed() {
  const filePath = path.resolve(__dirname, 'sample_data/call_center_dataset_demo.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const formData = new FormData();
  formData.append('file', blob, 'call_center_dataset_demo.xlsx');

  console.log('Subiendo archivo demo a la API...');
  const uploadRes = await fetch('http://localhost:4000/api/files/upload', {
    method: 'POST',
    body: formData
  });

  const uploadData = await uploadRes.json();
  console.log('Respuesta upload:', uploadData.success ? 'EXITO' : uploadData);

  if (!uploadData.success) return;

  const fileId = uploadData.fileId;
  const mapping = uploadData.preview.suggestedMapping;

  console.log('Procesando archivo y calculando TMO...');
  const procRes = await fetch('http://localhost:4000/api/files/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      sheetName: uploadData.preview.selectedSheet,
      columnMapping: mapping,
      threshold: 20.0
    })
  });

  const procData = await procRes.json();
  console.log('Resultado procesamiento:', procData.success ? 'EXITO' : procData);
  console.log('Reporte Excel generado:', procData.reportFileName);
}

seed().catch(console.error);
