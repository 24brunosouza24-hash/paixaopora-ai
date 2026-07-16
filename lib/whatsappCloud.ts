type SendOtpArgs = {
  toE164: string;
  code: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Env ausente: ${name}`);
  return v.trim();
}

export async function sendWhatsAppOtp({ toE164, code }: SendOtpArgs) {
  const token = requireEnv("WHATSAPP_CLOUD_TOKEN");
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = requireEnv("WHATSAPP_OTP_TEMPLATE_NAME");
  const templateLang = (process.env.WHATSAPP_OTP_TEMPLATE_LANG || "pt_BR").trim();
  const to = toE164.replace("+", "");

  const template: any = {
    name: templateName,
    language: { code: templateLang },
  };

  if (templateName !== "hello_world") {
    template.components = [
      {
        type: "body",
        parameters: [{ type: "text", text: code }],
      },
    ];
  }

  const res = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template,
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (data && (data.error?.message || data.message)) ||
      `Falha ao enviar WhatsApp (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return data;
}
