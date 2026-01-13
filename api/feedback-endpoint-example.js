// ============================================
// EXEMPLE D'ENDPOINT BACKEND POUR RESEND
// ============================================
// 
// Ce fichier contient des exemples pour différents frameworks
// Choisissez celui qui correspond à votre stack
//

// ============================================
// OPTION 1: Vercel Serverless Function
// ============================================
// Créez un fichier: api/feedback.ts dans votre projet Vercel
//
// import { VercelRequest, VercelResponse } from '@vercel/node';
// import { Resend } from 'resend';
//
// const resend = new Resend(process.env.RESEND_API_KEY);
//
// export default async function handler(
//   req: VercelRequest,
//   res: VercelResponse
// ) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }
//
//   try {
//     const { name, email, message, images } = req.body;
//
//     // Préparer les pièces jointes
//     const attachments = (images || []).map((img: any) => ({
//       filename: img.filename,
//       content: Buffer.from(img.content, 'base64'),
//       type: img.type,
//     }));
//
//     // Envoyer l'email via Resend
//     const { data, error } = await resend.emails.send({
//       from: 'ZeroGaspy <onboarding@resend.dev>', // Remplacez par votre domaine vérifié
//       to: 'votre-email@example.com', // Votre email de réception
//       replyTo: email,
//       subject: `Feedback - ZeroGaspy de ${name}`,
//       html: `
//         <h2>Nouveau feedback reçu</h2>
//         <p><strong>Nom:</strong> ${name}</p>
//         <p><strong>Email:</strong> ${email}</p>
//         <hr>
//         <h3>Message:</h3>
//         <p>${message.replace(/\n/g, '<br>')}</p>
//         ${images && images.length > 0 ? `<p><strong>${images.length} image(s) jointe(s)</strong></p>` : ''}
//       `,
//       attachments: attachments.length > 0 ? attachments : undefined,
//     });
//
//     if (error) {
//       console.error('Erreur Resend:', error);
//       return res.status(500).json({ error: error.message });
//     }
//
//     res.status(200).json({ 
//       success: true, 
//       message: 'Feedback envoyé avec succès',
//       data 
//     });
//   } catch (error: any) {
//     console.error('Erreur:', error);
//     res.status(500).json({ error: 'Erreur lors de l\'envoi du feedback' });
//   }
// }

// ============================================
// OPTION 2: Express.js Server
// ============================================
// 
// const express = require('express');
// const { Resend } = require('resend');
// const cors = require('cors');
//
// const app = express();
// const resend = new Resend(process.env.RESEND_API_KEY);
//
// app.use(cors());
// app.use(express.json({ limit: '10mb' })); // Important pour les images
//
// app.post('/api/feedback', async (req, res) => {
//   try {
//     const { name, email, message, images } = req.body;
//
//     // Préparer les pièces jointes
//     const attachments = (images || []).map((img) => ({
//       filename: img.filename,
//       content: Buffer.from(img.content, 'base64'),
//       type: img.type,
//     }));
//
//     // Envoyer l'email via Resend
//     const { data, error } = await resend.emails.send({
//       from: 'ZeroGaspy <onboarding@resend.dev>',
//       to: 'votre-email@example.com',
//       replyTo: email,
//       subject: `Feedback - ZeroGaspy de ${name}`,
//       html: `
//         <h2>Nouveau feedback reçu</h2>
//         <p><strong>Nom:</strong> ${name}</p>
//         <p><strong>Email:</strong> ${email}</p>
//         <hr>
//         <h3>Message:</h3>
//         <p>${message.replace(/\n/g, '<br>')}</p>
//         ${images && images.length > 0 ? `<p><strong>${images.length} image(s) jointe(s)</strong></p>` : ''}
//       `,
//       attachments: attachments.length > 0 ? attachments : undefined,
//     });
//
//     if (error) {
//       console.error('Erreur Resend:', error);
//       return res.status(500).json({ error: error.message });
//     }
//
//     res.status(200).json({ 
//       success: true, 
//       message: 'Feedback envoyé avec succès',
//       data 
//     });
//   } catch (error) {
//     console.error('Erreur:', error);
//     res.status(500).json({ error: 'Erreur lors de l\'envoi du feedback' });
//   }
// });
//
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Serveur en écoute sur le port ${PORT}`);
// });

// ============================================
// OPTION 3: Next.js API Route
// ============================================
// Créez un fichier: pages/api/feedback.ts ou app/api/feedback/route.ts
//
// import { NextApiRequest, NextApiResponse } from 'next';
// import { Resend } from 'resend';
//
// const resend = new Resend(process.env.RESEND_API_KEY);
//
// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }
//
//   try {
//     const { name, email, message, images } = req.body;
//
//     const attachments = (images || []).map((img: any) => ({
//       filename: img.filename,
//       content: Buffer.from(img.content, 'base64'),
//       type: img.type,
//     }));
//
//     const { data, error } = await resend.emails.send({
//       from: 'ZeroGaspy <onboarding@resend.dev>',
//       to: 'votre-email@example.com',
//       replyTo: email,
//       subject: `Feedback - ZeroGaspy de ${name}`,
//       html: `
//         <h2>Nouveau feedback reçu</h2>
//         <p><strong>Nom:</strong> ${name}</p>
//         <p><strong>Email:</strong> ${email}</p>
//         <hr>
//         <h3>Message:</h3>
//         <p>${message.replace(/\n/g, '<br>')}</p>
//         ${images && images.length > 0 ? `<p><strong>${images.length} image(s) jointe(s)</strong></p>` : ''}
//       `,
//       attachments: attachments.length > 0 ? attachments : undefined,
//     });
//
//     if (error) {
//       return res.status(500).json({ error: error.message });
//     }
//
//     res.status(200).json({ success: true, message: 'Feedback envoyé avec succès' });
//   } catch (error: any) {
//     res.status(500).json({ error: 'Erreur lors de l\'envoi du feedback' });
//   }
// }

