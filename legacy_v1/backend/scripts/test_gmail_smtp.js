const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testGmail() {
  console.log('Probando conexión SMTP con Gmail...');
  console.log('Usuario:', process.env.SMTP_USER);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '')
    }
  });

  try {
    const verified = await transporter.verify();
    console.log('✅ Conexión SMTP verificada con éxito:', verified);

    // Enviar correo de prueba
    const info = await transporter.sendMail({
      from: `"Call Center Analytics" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'Prueba de Conexión SMTP Exitosa - Plataforma Call Center TMO',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1E3A8A;">Plataforma de Análisis de Llamadas y TMO</h2>
          <p>Este es un correo de prueba confirmando que la integración SMTP con Gmail se ha configurado exitosamente.</p>
          <p>A partir de este momento, los reportes Excel con gráficos generados por el sistema y los workflows de n8n se enviarán a través de esta cuenta.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">Fecha de prueba: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    console.log('✅ Correo de prueba enviado con éxito!');
    console.log('Message ID:', info.messageId);
    console.log('Respuesta del servidor:', info.response);
  } catch (err) {
    console.error('❌ Error de conexión SMTP:', err);
    process.exit(1);
  }
}

testGmail();
