export type ConnectionAuthType = "api_key" | "oauth";
export type ConnectionStatus = "active" | "error" | "revoked";

export interface ConnectionDomain {
  id: string;
  name: string;
  status: string;
  sending: boolean;
  receiving: boolean;
}

export interface Connection {
  id: string;
  label: string;
  authType: ConnectionAuthType;
  access: "full_access";
  status: ConnectionStatus;
  webhookConfigured: boolean;
  webhookPath: string;
  webhookUrl?: string;
  domains: ConnectionDomain[];
}

export interface ConnectionActionResult {
  ok: boolean;
  connection?: Connection;
  error?: string;
}
