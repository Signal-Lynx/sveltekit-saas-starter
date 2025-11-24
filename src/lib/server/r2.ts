import {
  S3Client,
  ListObjectsV2Command,
  type _Object,
} from "@aws-sdk/client-s3"
import { env } from "$env/dynamic/private"

// Initialize the S3 client for R2
const s3 = new S3Client({
  region: env.PRIVATE_R2_REGION!,
  endpoint: env.PRIVATE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: env.PRIVATE_R2_ACCESS_KEY_ID!,
    secretAccessKey: env.PRIVATE_R2_SECRET_ACCESS_KEY!,
  },
})

export interface R2File {
  key: string
  name: string
  url: string
  size: number
  lastModified: Date
}

/**
 * Lists files from an R2 bucket within a specific folder (prefix).
 * @param prefix   Folder path to list, e.g. "signal-shield/"
 * @param baseUrl  Base URL to prepend for constructing links (e.g. CDN/custom domain)
 * @param bucket   (optional) Bucket name override. Defaults to PRIVATE_R2_BUCKET_NAME.
 */
export async function listFiles(
  prefix: string,
  baseUrl: string,
  bucket?: string,
): Promise<R2File[]> {
  try {
    const targetBucket = bucket ?? env.PRIVATE_R2_BUCKET_NAME!

    const command = new ListObjectsV2Command({
      Bucket: targetBucket,
      Prefix: prefix,
    })

    const { Contents } = await s3.send(command)
    if (!Contents) return []

    return Contents.filter(
      (item: _Object) => item.Key && !item.Key.endsWith("/"),
    )
      .map((item: _Object) => {
        const key = item.Key!
        const name = key.split("/").pop()!
        return {
          key,
          name,
          url: `${baseUrl.replace(/\/+$/, "")}/${key}`,
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error(
      `[R2 Service] Failed to list files for prefix "${prefix}":`,
      error,
    )
    return []
  }
}
