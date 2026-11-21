// The waitlist confirmation email. Tables and inline styles only: that is what email clients render reliably.
const SITE = "https://papilio.vitalveev.in";

export const subject = "You're on the Papilio waitlist";

// Plain-text version for clients that don't show HTML.
export const text = [
  "You joined the Papilio waitlist.",
  "",
  "Papilio is a shielded intent router: your swap intent hides inside a ZK proof on Aleo and is executed MEV-protected through CoW Swap.",
  "",
  "We'll email you when V1 opens on Sepolia and Aleo testnet. Papilio never holds your funds.",
  "",
  SITE,
  "",
  "If you didn't sign up, ignore this email.",
].join("\n");

const stage = (n: string, name: string, line: string) => `
  <tr>
    <td style="padding:10px 0;border-top:1px solid #171c22;font:12px/1.5 Menlo,Consolas,monospace;color:#00AAFF;width:34px;vertical-align:top;">${n}</td>
    <td style="padding:10px 0;border-top:1px solid #171c22;font:14px/1.5 Helvetica,Arial,sans-serif;color:#8792a0;">
      <span style="color:#f1f4f7;font-weight:bold;">${name}</span> &nbsp;${line}
    </td>
  </tr>`;

export const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#050505;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0A0A0A;border:1px solid #171c22;border-radius:12px;">
    <tr><td style="padding:32px 32px 8px;">
      <img src="${SITE}/icon.png" width="40" height="40" alt="" style="display:block;border:0;border-radius:8px;">
      <p style="margin:24px 0 0;font:12px/1.5 Menlo,Consolas,monospace;letter-spacing:2px;color:#00AAFF;">YOU'RE ON THE LIST</p>
      <h1 style="margin:10px 0 16px;font:bold 30px/1.1 Helvetica,Arial,sans-serif;color:#f1f4f7;">
        Your trade, before it becomes a <span style="color:#00AAFF;">butterfly.</span>
      </h1>
      <p style="margin:0 0 20px;font:16px/1.6 Helvetica,Arial,sans-serif;color:#8792a0;">
        You joined the Papilio waitlist. Papilio is a shielded intent router: your swap intent hides
        inside a ZK proof on Aleo and is executed MEV-protected through CoW Swap.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${stage("01", "Caterpillar", "Raw intent, visible to MEV.")}
        ${stage("02", "Chrysalis", "Hidden in a ZK proof on Aleo.")}
        ${stage("03", "Butterfly", "Executed via CoW solvers.")}
      </table>
      <p style="margin:20px 0 24px;font:16px/1.6 Helvetica,Arial,sans-serif;color:#8792a0;">
        We'll email you when V1 opens on Sepolia and Aleo testnet.
      </p>
      <a href="${SITE}" style="display:inline-block;background:#00AAFF;color:#00101f;font:bold 14px Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 20px;border-radius:8px;">Visit Papilio</a>
    </td></tr>
    <tr><td style="padding:28px 0 0;">
      <a href="${SITE}"><img src="${SITE}/opengraph-image.png" width="560" alt="Papilio: a blue pixel-art swallowtail butterfly" style="display:block;width:100%;height:auto;border:0;border-radius:0 0 12px 12px;"></a>
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font:12px/1.6 Menlo,Consolas,monospace;color:#8792a0;">
    Papilio never holds your funds. If you didn't sign up, ignore this email.
  </p>
</td></tr>
</table>
</body>
</html>`;
