import PDFDocument from 'pdfkit';
import { sendEmail } from '../emailService';
import { storage } from '../storage';
import type { GiftCard, GiftCardTheme } from '@shared/schema';

const DEFAULT_FROM_EMAIL = 'Info@ApacheNC.com';
const DEFAULT_FROM_NAME = 'Tactical Advantage';
const COMPANY_NAME = 'Tactical Advantage';
const COMPANY_WEBSITE = 'https://www.apachenc.com';

interface GiftCardEmailData {
  giftCard: GiftCard;
  theme?: GiftCardTheme;
  code: string;
  purchaserName: string;
  purchaserEmail: string;
  recipientName?: string;
  recipientEmail: string;
  personalMessage?: string;
}

export async function sendGiftCardEmail(data: GiftCardEmailData): Promise<{ success: boolean; error?: string }> {
  const {
    giftCard,
    theme,
    code,
    purchaserName,
    recipientName,
    recipientEmail,
    personalMessage,
  } = data;

  const amount = Number(giftCard.originalAmount).toFixed(2);
  const expiresAt = giftCard.expiresAt 
    ? new Date(giftCard.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Never';

  const accentColor = theme?.accentColor || '#5170FF';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${COMPANY_NAME} Gift Card</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${accentColor}; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                🎁 You've received a gift!
              </h1>
            </td>
          </tr>
          
          <!-- Message Section -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${recipientName ? `Dear ${recipientName},` : 'Hello!'}
              </p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>${purchaserName}</strong> has sent you a <strong>$${amount}</strong> gift card to ${COMPANY_NAME}!
              </p>
              ${personalMessage ? `
              <div style="background-color: #f9fafb; border-left: 4px solid ${accentColor}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #4b5563; font-size: 15px; font-style: italic; line-height: 1.6;">
                  "${personalMessage}"
                </p>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Gift Card Preview -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background: linear-gradient(135deg, ${accentColor} 0%, ${adjustColor(accentColor, -30)} 100%); border-radius: 12px; padding: 30px; text-align: center; position: relative;">
                <p style="margin: 0 0 10px; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                  ${COMPANY_NAME} Gift Card
                </p>
                <p style="margin: 0 0 20px; color: white; font-size: 42px; font-weight: bold;">
                  $${amount}
                </p>
                <div style="background-color: rgba(255,255,255,0.95); border-radius: 8px; padding: 15px; margin: 0 auto; max-width: 280px;">
                  <p style="margin: 0 0 5px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Your Gift Card Code
                  </p>
                  <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 2px;">
                    ${code}
                  </p>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- How to Use -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 15px; color: #111827; font-size: 18px;">How to use your gift card:</h2>
              <ol style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
                <li>Visit <a href="${COMPANY_WEBSITE}" style="color: ${accentColor};">${COMPANY_WEBSITE}</a></li>
                <li>Browse our training courses and one-on-one sessions</li>
                <li>During checkout, enter your gift card code</li>
                <li>Enjoy your training!</li>
              </ol>
            </td>
          </tr>
          
          <!-- Expiration Notice -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; text-align: center;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  ⏰ This gift card expires on <strong>${expiresAt}</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${COMPANY_WEBSITE}" style="display: inline-block; background-color: ${accentColor}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                Start Shopping →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                ${COMPANY_NAME} | Professional Firearms Training
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                If you have any questions, please contact us at ${DEFAULT_FROM_EMAIL}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
You've received a gift card from ${COMPANY_NAME}!

${recipientName ? `Dear ${recipientName},` : 'Hello!'}

${purchaserName} has sent you a $${amount} gift card to ${COMPANY_NAME}!

${personalMessage ? `Message from ${purchaserName}: "${personalMessage}"` : ''}

Your Gift Card Code: ${code}

How to use your gift card:
1. Visit ${COMPANY_WEBSITE}
2. Browse our training courses and one-on-one sessions
3. During checkout, enter your gift card code
4. Enjoy your training!

This gift card expires on ${expiresAt}.

If you have any questions, please contact us at ${DEFAULT_FROM_EMAIL}

${COMPANY_NAME} - Professional Firearms Training
  `;

  try {
    const result = await sendEmail({
      to: recipientEmail,
      from: `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`,
      subject: `🎁 ${purchaserName} sent you a $${amount} gift card!`,
      html: htmlContent,
      text: textContent,
    });

    if (result.success) {
      await storage.updateGiftCard(giftCard.id, {
        deliveryStatus: 'delivered',
        deliveredAt: new Date(),
      });
    }

    return result;
  } catch (error: any) {
    console.error('Error sending gift card email:', error);
    await storage.updateGiftCard(giftCard.id, {
      deliveryStatus: 'failed',
    });
    return { success: false, error: error.message };
  }
}

export async function sendPurchaserConfirmationEmail(data: GiftCardEmailData): Promise<{ success: boolean; error?: string }> {
  const {
    giftCard,
    theme,
    purchaserName,
    purchaserEmail,
    recipientName,
    recipientEmail,
  } = data;

  const amount = Number(giftCard.originalAmount).toFixed(2);
  const accentColor = theme?.accentColor || '#5170FF';

  const deliveryInfo = giftCard.deliveryMethod === 'email' 
    ? `We've sent the gift card to ${recipientEmail}${recipientName ? ` (${recipientName})` : ''}.`
    : 'Your gift card code has been generated and is ready to share.';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gift Card Purchase Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${accentColor}; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
                ✓ Gift Card Purchase Confirmed
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${purchaserName},
              </p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for your purchase! Here are the details:
              </p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: bold; text-align: right;">$${amount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Delivery Method:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${giftCard.deliveryMethod === 'email' ? 'Email' : 'Download/Print'}</td>
                  </tr>
                  ${recipientEmail && giftCard.deliveryMethod === 'email' ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Recipient:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${recipientEmail}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.6;">
                ${deliveryInfo}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                ${COMPANY_NAME} | Professional Firearms Training
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                If you have any questions, please contact us at ${DEFAULT_FROM_EMAIL}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    return await sendEmail({
      to: purchaserEmail,
      from: `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`,
      subject: `Your $${amount} gift card purchase confirmation`,
      html: htmlContent,
    });
  } catch (error: any) {
    console.error('Error sending purchaser confirmation email:', error);
    return { success: false, error: error.message };
  }
}

export async function generateGiftCardPdf(data: {
  giftCard: GiftCard;
  theme?: GiftCardTheme;
  code: string;
  recipientName?: string;
  purchaserName: string;
  personalMessage?: string;
}): Promise<Buffer> {
  const { giftCard, theme, code, recipientName, purchaserName, personalMessage } = data;
  
  const amount = Number(giftCard.originalAmount).toFixed(2);
  const expiresAt = giftCard.expiresAt 
    ? new Date(giftCard.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Never';
  const accentColorHex = theme?.accentColor || '#5170FF';

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [612, 396],
        margin: 0,
        info: {
          Title: `${COMPANY_NAME} Gift Card - $${amount}`,
          Author: COMPANY_NAME,
          Subject: 'Gift Card',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        } : { r: 81, g: 112, b: 255 };
      };

      const rgb = hexToRgb(accentColorHex);

      doc.rect(0, 0, 612, 396).fill(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);

      doc.rect(30, 30, 552, 336)
        .lineWidth(2)
        .stroke('white');

      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('white')
        .text(COMPANY_NAME, 50, 50, { align: 'left' });

      doc.fontSize(12)
        .fillColor('rgba(255,255,255,0.8)')
        .text('GIFT CARD', 50, 68);

      doc.fontSize(56)
        .font('Helvetica-Bold')
        .fillColor('white')
        .text(`$${amount}`, 0, 120, { align: 'center', width: 612 });

      doc.roundedRect(156, 200, 300, 70, 8)
        .fillAndStroke('white', 'white');

      doc.fontSize(10)
        .fillColor('#6b7280')
        .text('GIFT CARD CODE', 0, 212, { align: 'center', width: 612 });

      doc.fontSize(22)
        .font('Courier-Bold')
        .fillColor('#111827')
        .text(code, 0, 232, { align: 'center', width: 612 });

      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('rgba(255,255,255,0.9)');

      if (recipientName) {
        doc.text(`To: ${recipientName}`, 50, 295);
      }
      doc.text(`From: ${purchaserName}`, 50, recipientName ? 312 : 295);

      doc.text(`Expires: ${expiresAt}`, 400, 295, { align: 'right', width: 162 });

      if (personalMessage && personalMessage.length <= 60) {
        doc.fontSize(10)
          .fillColor('rgba(255,255,255,0.8)')
          .text(`"${personalMessage}"`, 50, 340, { 
            align: 'center', 
            width: 512,
          });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function adjustColor(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const adjust = (c: number) => Math.max(0, Math.min(255, c + amount));
  
  const r = adjust(parseInt(result[1], 16));
  const g = adjust(parseInt(result[2], 16));
  const b = adjust(parseInt(result[3], 16));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export async function processGiftCardDelivery(giftCardId: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const giftCard = await storage.getGiftCardById(giftCardId);
    if (!giftCard) {
      return { success: false, error: 'Gift card not found' };
    }

    const theme = giftCard.themeId 
      ? await storage.getGiftCardThemeById(giftCard.themeId) 
      : undefined;

    const emailData: GiftCardEmailData = {
      giftCard,
      theme: theme || undefined,
      code,
      purchaserName: giftCard.purchaserName || 'A friend',
      purchaserEmail: giftCard.purchaserEmail,
      recipientName: giftCard.recipientName || undefined,
      recipientEmail: giftCard.recipientEmail || giftCard.purchaserEmail,
      personalMessage: giftCard.personalMessage || undefined,
    };

    await sendPurchaserConfirmationEmail(emailData);

    if (giftCard.deliveryMethod === 'email' && giftCard.recipientEmail) {
      const shouldDeliverNow = !giftCard.scheduledDeliveryDate || 
        new Date(giftCard.scheduledDeliveryDate) <= new Date();

      if (shouldDeliverNow) {
        const result = await sendGiftCardEmail(emailData);
        return result;
      } else {
        await storage.updateGiftCard(giftCardId, {
          deliveryStatus: 'scheduled',
        });
        return { success: true };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error processing gift card delivery:', error);
    return { success: false, error: error.message };
  }
}
