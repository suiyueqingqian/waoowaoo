export interface UploadObjectParams {
  key: string
  body: Buffer
  contentType?: string
}

export interface UploadObjectResult {
  key: string
}

export interface DeleteObjectsResult {
  success: number
  failed: number
}

export interface SignedUrlParams {
  key: string
  expiresInSeconds: number
  responseCacheControl?: string
}

export interface ObjectMetadata {
  contentType: string | null
  contentLength: number | null
}

export interface ObjectByteRange {
  start: number
  end: number
}

export interface ObjectStreamResult extends ObjectMetadata {
  body: ReadableStream<Uint8Array>
  etag: string | null
  contentRange: string | null
}

export interface StorageProvider {
  readonly kind: 's3'
  readonly mediaObjectDelivery: 'authenticated-proxy' | 'signed-https'
  verifyReady(): Promise<void>
  uploadObject(params: UploadObjectParams): Promise<UploadObjectResult>
  deleteObject(key: string): Promise<void>
  deleteObjects(keys: string[]): Promise<DeleteObjectsResult>
  getSignedObjectUrl(params: SignedUrlParams): Promise<string>
  getObjectBuffer(key: string): Promise<Buffer>
  getObjectStream(key: string, range?: ObjectByteRange): Promise<ObjectStreamResult>
  getObjectMetadata(key: string): Promise<ObjectMetadata>
  extractStorageKey(input: string | null | undefined): string | null
  toFetchableUrl(inputUrl: string): string
  generateUniqueKey(params: { prefix: string; ext: string }): string
}
