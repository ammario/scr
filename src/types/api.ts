export interface ApiNote {
  contents: string;
  expires_at: string;
  destroy_after_read: boolean;
  version?: number;
  file_name?: string;
  /** base64-encoded encrypted bytes */
  file_contents?: string;
}
