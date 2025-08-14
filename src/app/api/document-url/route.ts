import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'document_url', action: 'create' });
if (deny) return deny;

  try {
    const { key } = await req.json();
    
    if (!key) {
      return NextResponse.json({ error: "Falta parámetro key" }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 min
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Error generando URL temporal:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
} 