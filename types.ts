export enum SignalStatus {
  Good = 'Good',
  Warning = 'Warning',
  Error = 'Error',
}

export interface AlertMessage {
  id: number;
  timestamp: string;
  type: SignalStatus;
  message: string;
}
